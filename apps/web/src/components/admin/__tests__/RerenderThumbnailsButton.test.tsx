import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";

// Hoisted so the mock factory and the assertions share the same fn instance.
const mutate = vi.fn();

vi.mock("../../../hooks/api", () => ({
  useRerenderAdminLevelThumbnails: () => ({ mutate, isPending: false }),
}));

import { RerenderThumbnailsButton } from "../RerenderThumbnailsButton";
import type {
  ThumbnailRerenderProgress,
  ThumbnailRerenderResult,
} from "../../../hooks/api";

// The `mutate` options + per-call callbacks captured from the last run.
type MutateVars = {
  onProgress?: (progress: ThumbnailRerenderProgress) => void;
  shouldStop?: () => boolean;
};
type MutateCallbacks = {
  onSuccess?: (result: ThumbnailRerenderResult) => void;
  onError?: (error: Error) => void;
};

const lastRun = () => {
  const call = mutate.mock.calls.at(-1);
  return {
    vars: call?.[0] as MutateVars | undefined,
    callbacks: call?.[1] as MutateCallbacks | undefined,
  };
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("RerenderThumbnailsButton", () => {
  it("opens a confirm dialog and starts the run", () => {
    render(<RerenderThumbnailsButton />);

    fireEvent.click(
      screen.getByRole("button", { name: "Re-render level thumbnails" })
    );
    expect(screen.getByText("Re-render every level thumbnail?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Re-render all" }));
    expect(mutate).toHaveBeenCalledTimes(1);
    const { vars } = lastRun();
    expect(typeof vars?.onProgress).toBe("function");
    expect(typeof vars?.shouldStop).toBe("function");
    // The run starts in the running phase.
    expect(screen.getByText("Re-rendering thumbnails…")).toBeTruthy();
  });

  it("shows live progress and the summary when the run finishes", () => {
    render(<RerenderThumbnailsButton />);
    fireEvent.click(
      screen.getByRole("button", { name: "Re-render level thumbnails" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Re-render all" }));

    const { vars, callbacks } = lastRun();
    act(() => vars?.onProgress?.({ done: 2, total: 4, failed: 0 }));
    expect(screen.getByText("2 of 4 saved")).toBeTruthy();

    act(() =>
      callbacks?.onSuccess?.({
        done: 4,
        total: 4,
        failed: 0,
        stopped: false,
      })
    );
    expect(screen.getByText("Thumbnails re-rendered")).toBeTruthy();
    expect(screen.getByText("4 thumbnails updated.")).toBeTruthy();
  });

  it("reports skipped levels in the summary", () => {
    render(<RerenderThumbnailsButton />);
    fireEvent.click(
      screen.getByRole("button", { name: "Re-render level thumbnails" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Re-render all" }));

    const { callbacks } = lastRun();
    act(() =>
      callbacks?.onSuccess?.({
        done: 5,
        total: 8,
        failed: 3,
        stopped: false,
      })
    );
    expect(screen.getByText("5 thumbnails updated, 3 skipped.")).toBeTruthy();
  });

  it("stop flips the job's shouldStop and the summary says it stopped early", () => {
    render(<RerenderThumbnailsButton />);
    fireEvent.click(
      screen.getByRole("button", { name: "Re-render level thumbnails" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Re-render all" }));

    const { vars, callbacks } = lastRun();
    expect(vars?.shouldStop?.()).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(vars?.shouldStop?.()).toBe(true);
    expect(screen.getByRole("button", { name: "Stopping…" })).toBeTruthy();

    act(() =>
      callbacks?.onSuccess?.({
        done: 5,
        total: 10,
        failed: 1,
        stopped: true,
      })
    );
    expect(screen.getByText("Re-render stopped")).toBeTruthy();
    expect(
      screen.getByText("Stopped early — 5 thumbnails updated, 1 skipped.")
    ).toBeTruthy();
  });

  it("surfaces a failed run with a retry", () => {
    render(<RerenderThumbnailsButton />);
    fireEvent.click(
      screen.getByRole("button", { name: "Re-render level thumbnails" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Re-render all" }));

    const { callbacks } = lastRun();
    act(() => callbacks?.onError?.(new Error("Network down")));
    expect(screen.getByText("Re-render failed")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
