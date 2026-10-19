// The play-session tracker is a pure in-memory clock around the repo insert:
// time is faked and the insert is mocked, so these tests pin the
// reconnect-merge and multi-tab accounting without Postgres or real sockets.
jest.mock("../../repositories/playSessions.repo", () => ({
  insertSession: jest.fn().mockResolvedValue(undefined),
}));

import {
  sessionOpened,
  sessionClosed,
  activeSessionMs,
  totalActiveSessionMs,
  RECONNECT_GRACE_MS,
  __resetForTests,
} from "../../socket/playSessions";
import * as repo from "../../repositories/playSessions.repo";

const insertSession = repo.insertSession as jest.Mock;

const T0 = 1_000_000; // arbitrary epoch base

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(T0);
  insertSession.mockClear();
  __resetForTests();
});

afterEach(() => {
  __resetForTests(); // clear any pending end timers
  jest.useRealTimers();
});

test("records the session once the grace window expires after the last socket leaves", () => {
  sessionOpened("s1", 42);
  jest.setSystemTime(T0 + 60_000);
  sessionClosed("s1", 42);

  jest.advanceTimersByTime(RECONNECT_GRACE_MS - 1);
  expect(insertSession).not.toHaveBeenCalled();

  jest.advanceTimersByTime(1);
  expect(insertSession).toHaveBeenCalledTimes(1);
  const row = insertSession.mock.calls[0][0];
  expect(row.playerId).toBe(42);
  expect(row.startedAt).toEqual(new Date(T0));
  // The session is still running during the grace window, so the recorded
  // duration includes it.
  expect(row.durationMs).toBe(60_000 + RECONNECT_GRACE_MS);
  expect(row.endedAt.getTime() - row.startedAt.getTime()).toBe(row.durationMs);
});

test("merges a refresh (disconnect → reconnect inside the grace) into one session", () => {
  sessionOpened("s1", 42);
  jest.setSystemTime(T0 + 10_000);
  sessionClosed("s1", 42);

  // Reconnect on a new socket before the timer fires.
  jest.advanceTimersByTime(RECONNECT_GRACE_MS - 1_000);
  sessionOpened("s2", 42);
  jest.advanceTimersByTime(RECONNECT_GRACE_MS + 60_000); // still connected
  expect(insertSession).not.toHaveBeenCalled();

  // Final disconnect, then out comes ONE session spanning the whole visit.
  jest.setSystemTime(T0 + 120_000);
  sessionClosed("s2", 42);
  jest.advanceTimersByTime(RECONNECT_GRACE_MS);

  expect(insertSession).toHaveBeenCalledTimes(1);
  const row = insertSession.mock.calls[0][0];
  expect(row.startedAt).toEqual(new Date(T0));
  expect(row.durationMs).toBe(120_000 + RECONNECT_GRACE_MS);
});

test("keeps the session open while any other tab is still connected", () => {
  sessionOpened("s1", 42);
  sessionOpened("s2", 42); // second tab

  sessionClosed("s1", 42);
  jest.advanceTimersByTime(RECONNECT_GRACE_MS * 3);
  expect(insertSession).not.toHaveBeenCalled();

  jest.setSystemTime(T0 + 90_000);
  sessionClosed("s2", 42);
  jest.advanceTimersByTime(RECONNECT_GRACE_MS);

  expect(insertSession).toHaveBeenCalledTimes(1);
  const row = insertSession.mock.calls[0][0];
  expect(row.startedAt).toEqual(new Date(T0));
  expect(row.durationMs).toBe(90_000 + RECONNECT_GRACE_MS);
});

test("tracks players independently", () => {
  sessionOpened("s1", 1);
  sessionOpened("s2", 2);
  jest.advanceTimersByTime(30_000); // both connected for 30s
  sessionClosed("s1", 1); // p1 leaves
  jest.advanceTimersByTime(15_000); // p2 stays 15s longer
  sessionClosed("s2", 2);
  jest.advanceTimersByTime(RECONNECT_GRACE_MS);

  expect(insertSession).toHaveBeenCalledTimes(2);
  const byPlayer = Object.fromEntries(
    insertSession.mock.calls.map(([row]) => [row.playerId, row])
  );
  expect(byPlayer[1].startedAt).toEqual(new Date(T0));
  expect(byPlayer[1].durationMs).toBe(45_000); // 30s + grace
  expect(byPlayer[2].startedAt).toEqual(new Date(T0));
  expect(byPlayer[2].durationMs).toBe(60_000); // 45s + grace
});

test("reports the elapsed time of sessions still in progress", () => {
  sessionOpened("s1", 1);
  jest.setSystemTime(T0 + 30_000);
  expect(activeSessionMs(1)).toBe(30_000);
  expect(activeSessionMs(2)).toBe(0);

  sessionOpened("s2", 2); // p2 joins 30s in
  jest.setSystemTime(T0 + 45_000);
  expect(totalActiveSessionMs()).toBe(45_000 + 15_000);

  // A persisted session leaves the live count (and is no longer double-counted).
  sessionClosed("s1", 1);
  jest.advanceTimersByTime(RECONNECT_GRACE_MS);
  expect(insertSession).toHaveBeenCalledTimes(1);
  expect(activeSessionMs(1)).toBe(0);
  expect(totalActiveSessionMs()).toBe(30_000);
});

test("a closed socket that was never opened is a no-op", () => {
  sessionClosed("ghost", 42);
  jest.advanceTimersByTime(RECONNECT_GRACE_MS * 2);
  expect(insertSession).not.toHaveBeenCalled();
});

test("swallows a failed insert instead of crashing the socket layer", async () => {
  const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  insertSession.mockRejectedValueOnce(new Error("db down"));

  sessionOpened("s1", 42);
  sessionClosed("s1", 42);
  jest.advanceTimersByTime(RECONNECT_GRACE_MS);
  await Promise.resolve(); // flush the .catch microtask

  expect(errSpy).toHaveBeenCalled();
  errSpy.mockRestore();
});
