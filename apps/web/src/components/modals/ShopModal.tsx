import { useTranslation } from "react-i18next";
import { Check, Coins, Lock } from "lucide-react";
import { useModal, useToast, TOAST_TYPES } from "../../contexts";
import {
  TANK_PAINTS,
  paintDescKey,
  paintNameKey,
} from "../../constants/tankPaints";
import { colorFromIndex } from "../../constants/tankColors";
import { storage } from "../../lib/storage";
import { useWallet } from "../../hooks/useWallet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  TankAvatar,
  CoinChip,
} from "../ui/primitives";
import { cn } from "../../lib/cn";

/**
 * The tank shop: buy hull paints with OuiCoins. The wallet is local-first (see
 * lib/wallet), a purchase auto-equips the paint, and the previews use the exact
 * same drawTank routine as the arena, so what you buy is what opponents see.
 */
export const ShopModal = () => {
  const { t } = useTranslation();
  const { closeModal } = useModal();
  const { coins, owned, equipped, buy, equip } = useWallet();
  const { addToast, TOAST_TYPES: TYPES } = useToast();
  // Current body/turret so each preview is the player's own tank in that paint.
  const body = colorFromIndex(storage.getBodyIndex());
  const turret = colorFromIndex(storage.getTurretIndex());

  const handleBuy = (id: string, price: number) => {
    const result = buy(id);
    if (result === "bought") {
      addToast(
        TYPES.COIN,
        t("shop.coins"),
        t("shop.purchased", { name: t(paintNameKey(id)) }),
        2600
      );
    } else if (result === "poor") {
      addToast(
        TYPES.ERROR,
        t("shop.insufficient"),
        t("shop.needMore", { count: price - coins }),
        2600
      );
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) closeModal();
      }}
    >
      <DialogContent widthClassName="w-[min(96vw,880px)]">
        <div className="flex items-start gap-3 pr-12">
          <div>
            <DialogTitle className="text-2xl font-bold">
              {t("shop.title")}
            </DialogTitle>
            <p className="text-sm text-ink-soft">{t("shop.subtitle")}</p>
          </div>
          <div className="flex-1" />
          <CoinChip
            coins={coins}
            label={t("shop.balance", { count: coins })}
            className="px-3 py-1 text-base"
          />
        </div>
        <p className="mt-1 mb-4 text-xs text-ink-soft">{t("shop.earnHint")}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TANK_PAINTS.map((paint) => {
            const isOwned = owned.includes(paint.id);
            const isEquipped = equipped === paint.id;
            const affordable = coins >= paint.price;
            return (
              <div
                key={paint.id}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-2xl border-[3px] border-ink bg-field p-2",
                  isEquipped && "bg-green/15"
                )}
              >
                {isEquipped && (
                  <span className="absolute -top-2 right-2 inline-flex items-center gap-1 rounded-full border-2 border-ink bg-green px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    <Check size={11} strokeWidth={3.5} />
                    {t("shop.equipped")}
                  </span>
                )}
                <div className="graph-paper flex w-full justify-center rounded-xl border-2 border-ink/20">
                  <TankAvatar
                    bodyColor={body}
                    turretColor={turret}
                    paint={paint.id}
                    size={86}
                  />
                </div>
                <span className="font-display text-sm font-bold leading-tight">
                  {t(paintNameKey(paint.id))}
                </span>
                <span className="min-h-[26px] text-center text-[11px] leading-tight text-ink-soft">
                  {t(paintDescKey(paint.id))}
                </span>
                <div className="mt-auto w-full pt-1">
                  {isEquipped ? (
                    <Button
                      variant="green"
                      size="sm"
                      className="w-full"
                      disabled
                    >
                      <Check size={15} /> {t("shop.equipped")}
                    </Button>
                  ) : isOwned ? (
                    <Button
                      variant="blue"
                      size="sm"
                      className="w-full"
                      onClick={() => equip(paint.id)}
                    >
                      {t("shop.equip")}
                    </Button>
                  ) : paint.price === 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      disabled
                    >
                      {t("shop.owned")}
                    </Button>
                  ) : (
                    <Button
                      variant={affordable ? "yellow" : "ghost"}
                      size="sm"
                      className="w-full"
                      disabled={!affordable}
                      onClick={() => handleBuy(paint.id, paint.price)}
                      {...(affordable
                        ? {}
                        : {
                            title: t("shop.needMore", {
                              count: paint.price - coins,
                            }),
                          })}
                    >
                      {affordable ? <Coins size={15} /> : <Lock size={14} />}
                      <span className="tabular-nums">{paint.price}</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-soft">
            {t("shop.ownedCount", {
              owned: owned.length,
              total: TANK_PAINTS.length,
            })}
          </p>
          <Button variant="ghost" onClick={closeModal}>
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
