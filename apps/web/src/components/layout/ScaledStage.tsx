import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ToastContainer } from "../ui";
import { useWindowScale } from "../../hooks/useWindowScale";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../constants/canvas";

interface ScaledStageProps {
  children: ReactNode;
  // GameView sets "none" so the browser doesn't claim touch gestures
  // (scroll/zoom) over the on-screen controls. The editors leave it default.
  touchAction?: CSSProperties["touchAction"];
  /** Editor stage: fit the shell's available space instead of the window. */
  embedded?: boolean;
}

/**
 * The fixed-size 1150×800 stage used by gameplay and the level/campaign editors.
 * It renders its children at that virtual resolution and uniformly scales the
 * whole stage to fit the window (see useWindowScale). Interactive UI that must
 * stay a usable physical size lives OUTSIDE this transform (see FixedUiLayer).
 *
 * The editors raise validation toasts; the ToastContainer here is what renders
 * them while a stage is mounted.
 */
export const ScaledStage = ({
  children,
  touchAction,
  embedded = false,
}: ScaledStageProps) => {
  const windowScale = useWindowScale();
  const hostRef = useRef<HTMLDivElement>(null);
  const [containerScale, setContainerScale] = useState(1);
  useEffect(() => {
    if (!embedded || !hostRef.current) return;
    const host = hostRef.current;
    const update = () => {
      const raw = Math.min(
        host.clientWidth / CANVAS_WIDTH,
        host.clientHeight / CANVAS_HEIGHT
      );
      const dpr = window.devicePixelRatio || 1;
      setContainerScale(raw >= 1 ? Math.floor(raw * dpr) / dpr : raw);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [embedded]);
  const scale = embedded ? containerScale : windowScale;
  // Embedded editors pin the stage to the top of the menu content column so
  // their header card sits next to the navigation card, and stay transparent:
  // the menu shell already paints the graph paper, and a second grid starting
  // at this box's origin (plus a third inside the scaled stage) drifts out of
  // phase with it. Gameplay keeps its own field and stays vertically centred.
  return (
    // Size the stage box to the *dynamic* viewport (dvw/dvh), NOT 100vw/100vh.
    // useWindowScale fits the 1150×800 arena into window.innerWidth/innerHeight
    // (the visible area). On mobile, 100vh is the *large* viewport (the height
    // with the browser's address bar retracted), which is taller than the
    // visible area — so the old `h-screen` box centred the height-fitted arena
    // in a box taller than the screen and pushed its bottom rows off-screen (the
    // whole arena wasn't visible). dvw/dvh track the currently visible viewport,
    // so the box matches what we scaled into and the entire arena shows. The
    // w-screen/h-screen classes stay as a 100vw/100vh fallback: a browser that
    // doesn't understand the inline dvw/dvh value drops it and uses the class.
    //
    // The leftover letterbox (a landscape phone is wider than the 23:16 arena)
    // is painted with the same graph-paper field the arena and menus use, so it
    // reads as field rather than dark "black borders".
    //
    // `flex-none` is load-bearing: this is a flex item with `overflow: hidden`,
    // so its `min-width: auto` resolves to 0 and it would otherwise be squeezed
    // down to the viewport width (e.g. 390px on a phone) while `useWindowScale`
    // still computes the transform for the full CANVAS_WIDTH×CANVAS_HEIGHT box.
    // The arena was then scaled twice (shrink × transform) and clipped: on a
    // 852×393 landscape phone only the middle ~74% of the arena was visible and
    // a player spawning near a side wall was rendered off-screen; in portrait
    // the whole arena collapsed to a ~132px-wide strip. With the box pinned to
    // the virtual stage size, the transform is the only thing that ever scales
    // it, so the whole arena stays visible at every window size.
    <div
      ref={hostRef}
      className={`overflow-hidden flex justify-center ${
        embedded ? "items-start" : "items-center graph-paper"
      }`}
      style={
        embedded
          ? { width: "100%", height: "100%" }
          : { width: "100dvw", height: "100dvh" }
      }
    >
      <div
        className="relative flex-none overflow-hidden"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          ...(touchAction ? { touchAction } : {}),
        }}
      >
        {children}
        {!embedded && <ToastContainer />}
      </div>
    </div>
  );
};
