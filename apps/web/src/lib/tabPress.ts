import type { DOMAttributes, SyntheticEvent } from "react";

type PressHandlers<T extends HTMLElement> = Pick<
  DOMAttributes<T>,
  | "onPointerDown"
  | "onPointerUp"
  | "onPointerCancel"
  | "onPointerLeave"
  | "onBlur"
>;

/** Keep transient touch feedback on the pressed element, not on the group.
 * Native :active can be delayed on scrollable touch surfaces. No pointer
 * capture or preventDefault: scrolling, links and Radix keyboard handling stay native.
 */
export function tabPressHandlers<T extends HTMLElement>(
  handlers: PressHandlers<T> = {}
): PressHandlers<T> {
  const release = (event: SyntheticEvent<T>) => {
    delete event.currentTarget.dataset.pressed;
  };
  return {
    onPointerDown: (event) => {
      handlers.onPointerDown?.(event);
      if (
        !event.defaultPrevented &&
        event.isPrimary &&
        event.button === 0 &&
        !event.currentTarget.matches(":disabled, [aria-disabled=true]")
      ) {
        event.currentTarget.dataset.pressed = "";
      }
    },
    onPointerUp: (event) => {
      release(event);
      handlers.onPointerUp?.(event);
    },
    onPointerCancel: (event) => {
      release(event);
      handlers.onPointerCancel?.(event);
    },
    onPointerLeave: (event) => {
      release(event);
      handlers.onPointerLeave?.(event);
    },
    onBlur: (event) => {
      release(event);
      handlers.onBlur?.(event);
    },
  };
}
