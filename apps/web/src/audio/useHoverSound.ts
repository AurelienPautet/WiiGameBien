import { useEffect, useRef } from "react";
import { ui } from "./ui";

/**
 * One delegated hover-sound layer for the whole app.
 *
 * The shared primitives used to wire `ui.hover()` one element at a time, which
 * meant every hand-rolled <button>, <a> or Radix trigger outside them was
 * silent. Listening once at the document level inverts that: any element that
 * actually behaves as a control gets the tick for free, including ones added
 * later and ones nested inside other components.
 *
 * A control is matched by semantics (native buttons/links/inputs plus the ARIA
 * roles Radix puts on its triggers), never by a styling class. Disabled
 * controls stay silent, and `data-no-hover-sound` is the escape hatch for
 * elements that only look interactive.
 */
const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "select",
  "summary",
  "input",
  "textarea",
  "[contenteditable='true']",
  "[role='button']",
  "[role='tab']",
  "[role='radio']",
  "[role='switch']",
  "[role='slider']",
  "[role='checkbox']",
  "[role='menuitem']",
  "[role='menuitemradio']",
  "[role='option']",
  "[data-hover-sound]",
].join(",");

function interactiveFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const hit = target.closest(INTERACTIVE_SELECTOR);
  if (!(hit instanceof HTMLElement)) return null;
  if (hit.matches(":disabled") || hit.getAttribute("aria-disabled") === "true")
    return null;
  if (hit.hasAttribute("data-no-hover-sound")) return null;
  return hit;
}

/** Install the page-wide control hover tick. Mount once, high in the tree. */
export function useHoverSound(): void {
  // Track the last root so moving across a control's own children (icon →
  // label) does not machine-gun the tick.
  const lastHit = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onPointerOver = (event: PointerEvent) => {
      // Touch has no hover phase; the tap already gets the click sound.
      if (event.pointerType === "touch") return;
      const hit = interactiveFrom(event.target);
      if (!hit || hit === lastHit.current) return;
      lastHit.current = hit;
      ui.hover();
    };

    const onPointerOut = (event: PointerEvent) => {
      const hit = interactiveFrom(event.target);
      if (!hit || hit !== lastHit.current) return;
      if (interactiveFrom(event.relatedTarget) !== hit) lastHit.current = null;
    };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      lastHit.current = null;
    };
  }, []);
}
