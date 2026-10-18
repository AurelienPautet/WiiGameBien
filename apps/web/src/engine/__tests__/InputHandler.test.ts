import { describe, it, expect, afterEach } from "vitest";
import { InputHandler } from "../InputHandler";

// `autoAimFire` is the touch fire button's tap request. It must behave like the
// other one-shot actions (`click` / `plant`): delivered exactly once to the
// engine, and dropped when the countdown clears buffered input.

let handler: InputHandler | null = null;

afterEach(() => {
  handler?.destroy();
  handler = null;
});

describe("InputHandler.autoAimFire", () => {
  it("is a one-shot: reported once, then reset", () => {
    handler = new InputHandler(document.createElement("canvas"));
    window.gameInput!.autoAimFire = true;

    expect(handler.getInputState().autoAimFire).toBe(true);
    expect(handler.getInputState().autoAimFire).toBe(false);
  });

  it("is cleared with the rest of the buffered input (countdown end)", () => {
    handler = new InputHandler(document.createElement("canvas"));
    window.gameInput!.autoAimFire = true;
    window.gameInput!.click = true;

    handler.clearInput();

    expect(window.gameInput!.autoAimFire).toBe(false);
    expect(window.gameInput!.click).toBe(false);
  });
});
