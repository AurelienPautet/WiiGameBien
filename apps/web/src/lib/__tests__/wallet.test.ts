import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// lib/wallet keeps a module-level snapshot (useSyncExternalStore needs a stable
// identity), so each test imports a FRESH copy after installing its own
// localStorage fake — mirroring lib/__tests__/storage.test.ts.
const originalLocalStorage = Object.getOwnPropertyDescriptor(
  window,
  "localStorage"
);
let store: Record<string, string>;
type WalletModule = typeof import("../wallet");
let wallet: WalletModule;

beforeEach(async () => {
  store = {};
  const fake = {
    getItem: (k: string) =>
      Object.prototype.hasOwnProperty.call(store, k) ? store[k]! : null,
    setItem: (k: string, v: unknown) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
  vi.stubGlobal("localStorage", fake);
  Object.defineProperty(window, "localStorage", {
    value: fake,
    configurable: true,
  });
  vi.resetModules();
  wallet = await import("../wallet");
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalLocalStorage) {
    Object.defineProperty(window, "localStorage", originalLocalStorage);
  }
});

describe("economy rules", () => {
  it("pays per kill and a win bonus for online rounds", () => {
    expect(wallet.coinsForOnlineRound({ kills: 0, wins: 0 })).toBe(0);
    expect(wallet.coinsForOnlineRound({ kills: 3, wins: 0 })).toBe(
      3 * wallet.COINS_PER_KILL
    );
    expect(wallet.coinsForOnlineRound({ kills: 3, wins: 1 })).toBe(
      3 * wallet.COINS_PER_KILL + wallet.ONLINE_WIN_BONUS
    );
  });

  it("pays kills on a solo loss and adds the clear bonus on a win", () => {
    expect(wallet.coinsForSoloRound({ success: false, kills: 2 })).toBe(
      2 * wallet.COINS_PER_KILL
    );
    expect(wallet.coinsForSoloRound({ success: true, kills: 2 })).toBe(
      2 * wallet.COINS_PER_KILL + wallet.SOLO_WIN_BONUS
    );
  });

  it("pays campaign runs per level cleared, plus completion", () => {
    expect(
      wallet.coinsForCampaignRun({ completed: false, levelsCleared: 4 })
    ).toBe(4 * wallet.CAMPAIGN_CLEAR_BONUS);
    expect(
      wallet.coinsForCampaignRun({ completed: true, levelsCleared: 4 })
    ).toBe(4 * wallet.CAMPAIGN_CLEAR_BONUS + wallet.CAMPAIGN_COMPLETE_BONUS);
  });

  it("pays the achievement bonus per unlocked key", () => {
    expect(wallet.coinsForAchievements(0)).toBe(0);
    expect(wallet.coinsForAchievements(2)).toBe(
      2 * wallet.ACHIEVEMENT_COIN_BONUS
    );
  });

  it("clamps malformed inputs instead of minting coins", () => {
    expect(wallet.coinsForOnlineRound({ kills: -3, wins: 0 })).toBe(0);
    expect(wallet.coinsForSoloRound({ success: true, kills: Number.NaN })).toBe(
      wallet.SOLO_WIN_BONUS
    );
    expect(
      wallet.coinsForCampaignRun({ completed: false, levelsCleared: 2.9 })
    ).toBe(2 * wallet.CAMPAIGN_CLEAR_BONUS);
    expect(wallet.coinsForAchievements(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("parseGarage", () => {
  it("returns the starting garage for absent/corrupt data", () => {
    expect(wallet.parseGarage(null)).toEqual(wallet.emptyGarage());
    expect(wallet.parseGarage("nope")).toEqual(wallet.emptyGarage());
    expect(wallet.emptyGarage()).toEqual({
      coins: wallet.STARTING_COINS,
      owned: ["plain"],
      equipped: "plain",
    });
  });

  it("drops unknown paints and always owns plain, in catalog order", () => {
    const garage = wallet.parseGarage({
      coins: 42,
      owned: ["flames", "nope", "plain", "checker", "flames"],
      equipped: "checker",
    });
    expect(garage.coins).toBe(42);
    expect(garage.owned).toEqual(["plain", "checker", "flames"]);
    expect(garage.equipped).toBe("checker");
  });

  it("resets an equipped paint the player does not own", () => {
    expect(
      wallet.parseGarage({ coins: 10, owned: ["plain"], equipped: "flames" })
        .equipped
    ).toBe("plain");
  });

  it("clamps negative/fractional balances and keeps zero", () => {
    expect(wallet.parseGarage({ coins: -50 }).coins).toBe(0);
    expect(wallet.parseGarage({ coins: 12.9 }).coins).toBe(12);
    expect(wallet.parseGarage({ coins: 0 }).coins).toBe(0);
    expect(wallet.parseGarage({ coins: Number.NaN }).coins).toBe(
      wallet.STARTING_COINS
    );
  });
});

describe("wallet store", () => {
  it("starts with welcome coins and notifies subscribers on earn", () => {
    const listener = vi.fn();
    const unsubscribe = wallet.subscribeGarage(listener);

    expect(wallet.getGarage().coins).toBe(wallet.STARTING_COINS);
    expect(wallet.earnCoins(25)).toBe(wallet.STARTING_COINS + 25);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(store.garage!)).toMatchObject({
      coins: wallet.STARTING_COINS + 25,
    });

    // Zero/negative earns are no-ops (and must not re-render the app).
    wallet.earnCoins(0);
    wallet.earnCoins(-10);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    wallet.earnCoins(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("hydrates a persisted garage lazily", async () => {
    store.garage = JSON.stringify({
      coins: 500,
      owned: ["plain", "stars"],
      equipped: "stars",
    });
    vi.resetModules();
    const fresh = await import("../wallet");
    expect(fresh.getGarage()).toEqual({
      coins: 500,
      owned: ["plain", "stars"],
      equipped: "stars",
    });
  });

  it("rejects purchases you cannot afford without mutating state", () => {
    expect(wallet.getGarage().coins).toBeLessThan(200);
    expect(wallet.buyPaint("stripes")).toBe("poor");
    expect(wallet.getGarage().coins).toBe(wallet.STARTING_COINS);
    expect(wallet.ownsPaint("stripes")).toBe(false);
  });

  it("buys, equips and persists in one step; repeated buys are free", () => {
    wallet.earnCoins(200);
    const before = wallet.getGarage().coins;

    expect(wallet.buyPaint("stripes")).toBe("bought");
    expect(wallet.getGarage().coins).toBe(before - 200);
    expect(wallet.ownsPaint("stripes")).toBe(true);
    expect(wallet.getGarage().equipped).toBe("stripes");

    expect(wallet.buyPaint("stripes")).toBe("owned");
    expect(wallet.getGarage().coins).toBe(before - 200);
  });

  it("rejects unknown paint ids on buy and equip", () => {
    const before = wallet.getGarage();
    expect(wallet.buyPaint("rainbow")).toBe("unknown");
    expect(wallet.equipPaint("rainbow")).toBe(false);
    expect(wallet.getGarage()).toBe(before);
  });

  it("only equips owned paints", () => {
    expect(wallet.equipPaint("plain")).toBe(true);
    expect(wallet.equipPaint("flames")).toBe(false);
    expect(wallet.getGarage().equipped).toBe("plain");
  });
});
