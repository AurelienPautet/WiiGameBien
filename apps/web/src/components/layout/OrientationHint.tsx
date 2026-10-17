import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { useGame } from "../../contexts";
import { useIsPortrait, useTouchControlsEnabled } from "../../lib/touch";
import { Button } from "../ui/primitives";

// Routes whose entire content is the fixed 1150×800 landscape stage: there is
// nothing usable to show in portrait, so the prompt there is a hard blocker.
// "/" joins this set while a game is running (see `isPlaying` below).
const STAGE_ROUTES = new Set(["/editor", "/campaign-editor"]);

/**
 * Full-window "rotate your device" prompt, shown app-wide on touch devices held
 * in portrait (the arena, the editors and every menu are landscape-first).
 *
 * Rendered once in App, outside the scaled stage: inside it, the stage transform
 * would scale the prompt too, so it would not cover the window.
 *
 * Two modes:
 *  - Stage routes (level/campaign editor, and the game itself) — hard blocker,
 *    as before: there is no usable portrait layout underneath.
 *  - Responsive pages (Home, Play Solo, Rankings, Admin) — same prompt plus a
 *    "continue anyway" button, so a phone in portrait can still browse. Each
 *    page is dismissed for the session: a page you dismissed never nags again,
 *    other pages still prompt, and reloading re-arms everything.
 *
 * Gated by useTouchControlsEnabled, so the Settings override ("on"/"off") is
 * honoured and it never appears on a mouse/keyboard desktop.
 */
export const OrientationHint = () => {
  const { t } = useTranslation();
  const { isPlaying } = useGame();
  const { pathname } = useLocation();
  const touchEnabled = useTouchControlsEnabled();
  const portrait = useIsPortrait();
  const [dismissedPaths, setDismissedPaths] = useState<ReadonlySet<string>>(
    new Set()
  );

  if (!touchEnabled || !portrait) return null;

  const stageRoute = isPlaying || STAGE_ROUTES.has(pathname);
  if (!stageRoute && dismissedPaths.has(pathname)) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-ink/95 px-8 text-center text-white">
      <RotateCcw className="h-16 w-16 animate-pulse" strokeWidth={2.5} />
      <p className="text-xl font-bold">{t("orientation.rotate")}</p>
      {!stageRoute && (
        <Button
          variant="ghost"
          size="md"
          className="mt-2"
          onClick={() =>
            setDismissedPaths((prev) => new Set(prev).add(pathname))
          }
        >
          {t("orientation.continueAnyway")}
        </Button>
      )}
    </div>
  );
};
