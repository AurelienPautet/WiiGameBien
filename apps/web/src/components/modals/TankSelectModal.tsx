import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Coins, Store } from "lucide-react";
import { useModal, useSettings, MODALS } from "../../contexts";
import { TANK_COLORS as COLORS } from "../../constants/tankColors";
import { TANK_PAINTS, paintNameKey } from "../../constants/tankPaints";
import { useWallet } from "../../hooks/useWallet";
import { tankColors } from "../../theme/palette";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  RadioGroup,
  TankAvatar,
} from "../ui/primitives";
import { cn } from "../../lib/cn";

const clampIndex = (saved: number | null) =>
  Math.max(0, Math.min(saved ?? 1, COLORS.length - 1));

// A single-select colour picker, built on the shared RadioGroup primitive so it
// gets the arcade click sound + radiogroup keyboard/ARIA for free (the swatches
// used to be bare <button>s that bypassed the audio system entirely). State is
// the persisted colour index; we map to/from the colour name at the boundary.
const SwatchRow = ({
  label,
  selected,
  onPick,
}: {
  label: string;
  selected: number;
  onPick: (i: number) => void;
}) => (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-sm font-semibold text-ink w-16">{label}</span>
    <RadioGroup
      aria-label={label}
      value={COLORS[selected] ?? COLORS[0]!}
      options={COLORS}
      onValueChange={(name) => onPick(COLORS.indexOf(name))}
      className="flex items-center gap-2 flex-wrap"
      optionStyle={(name) => ({ background: tankColors(name).fill })}
      optionClassName={(_name, checked) =>
        cn(
          "size-8 rounded-lg border-[3px] border-ink transition-transform shadow-[0_3px_0_rgba(0,0,0,0.18)] hover:-translate-y-0.5",
          checked &&
            "outline-3 outline-white -outline-offset-[7px] -translate-y-0.5 scale-110"
        )
      }
    />
  </div>
);

export const TankSelectModal = () => {
  const { t } = useTranslation();
  const { closeModal, openModal } = useModal();
  const { settings, setTank } = useSettings();
  const [bodyIndex, setBodyIndex] = useState(() =>
    clampIndex(settings.tank.bodyIndex)
  );
  const [turretIndex, setTurretIndex] = useState(() =>
    clampIndex(settings.tank.turretIndex)
  );
  // Only OWNED paints appear here — the shop is where new ones are unlocked
  // (and buying auto-equips), so this picker stays a pure "mix & match" step.
  const { coins, owned, equipped, equip } = useWallet();
  const [paint, setPaint] = useState(equipped);
  const ownedPaints = owned.filter((id) =>
    TANK_PAINTS.some((p) => p.id === id)
  );

  const handleSave = () => {
    // Indices are always clamped to [0, COLORS.length - 1]; SettingsProvider
    // persists them alongside the account-synced tank settings.
    setTank({ bodyIndex, turretIndex });
    equip(paint);
    closeModal();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) closeModal();
      }}
    >
      <DialogContent widthClassName="w-[min(94vw,560px)]">
        <DialogTitle className="text-2xl font-bold mb-4">
          {t("tankSelect.title")}
        </DialogTitle>

        <div className="graph-paper border-[3px] border-ink rounded-arcade flex items-center justify-center py-6 mb-5">
          <TankAvatar
            bodyColor={COLORS[bodyIndex] ?? "orange"}
            turretColor={COLORS[turretIndex] ?? "orange"}
            paint={paint}
            size={170}
          />
        </div>

        <div className="space-y-3 mb-5">
          <SwatchRow
            label={t("tankSelect.body")}
            selected={bodyIndex}
            onPick={setBodyIndex}
          />
          <SwatchRow
            label={t("tankSelect.turret")}
            selected={turretIndex}
            onPick={setTurretIndex}
          />
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink w-16 pt-1">
              {t("tankSelect.paint")}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <RadioGroup
                  aria-label={t("tankSelect.paint")}
                  value={paint}
                  options={ownedPaints}
                  onValueChange={setPaint}
                  optionLabel={(id) => t(paintNameKey(id))}
                  className="flex items-center gap-2 flex-wrap"
                  optionClassName={(_id, checked) =>
                    cn(
                      "size-11 overflow-hidden rounded-lg border-[3px] border-ink bg-white transition-transform shadow-[0_3px_0_rgba(0,0,0,0.18)] hover:-translate-y-0.5 cursor-pointer",
                      checked &&
                        "outline-3 outline-white -outline-offset-[7px] -translate-y-0.5 scale-110"
                    )
                  }
                >
                  {(id) => (
                    <TankAvatar
                      bodyColor={COLORS[bodyIndex] ?? "orange"}
                      turretColor={COLORS[turretIndex] ?? "orange"}
                      paint={id}
                      size={38}
                    />
                  )}
                </RadioGroup>
                <Button
                  variant="yellow"
                  size="sm"
                  onClick={() => openModal(MODALS.SHOP)}
                  aria-label={t("shop.openWithBalance", { count: coins })}
                >
                  <Store size={15} />
                  {t("tankSelect.openShop")}
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-white/70 px-1.5 text-xs tabular-nums">
                    <Coins size={12} />
                    {coins}
                  </span>
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-ink-soft">
                {t("tankSelect.paintHint")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={closeModal}>
            {t("common.cancel")}
          </Button>
          <Button variant="green" onClick={handleSave}>
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
