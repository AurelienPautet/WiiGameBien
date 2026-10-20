import { useSyncExternalStore } from "react";
import {
  buyPaint,
  equipPaint,
  getGarage,
  subscribeGarage,
  type BuyResult,
  type GarageState,
} from "../lib/wallet";

/**
 * React binding for the OuiCoins wallet + paint garage (lib/wallet). The store
 * is a module-level singleton so non-React code (round-end hooks, socket
 * listeners) can earn coins and every mounted consumer re-renders.
 *
 * `buy`/`equip` are the store actions; both return an outcome so callers can
 * toast exactly what happened.
 */
export const useWallet = (): GarageState & {
  buy: (paintId: string) => BuyResult;
  equip: (paintId: string) => boolean;
} => {
  const garage = useSyncExternalStore(subscribeGarage, getGarage, getGarage);
  return { ...garage, buy: buyPaint, equip: equipPaint };
};
