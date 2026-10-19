import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ScaledStage } from "../ScaledStage";

vi.mock("../../../hooks/useWindowScale", () => ({
  useWindowScale: () => 0.75,
}));
vi.mock("../../ui", () => ({
  ToastContainer: () => <div data-testid="toast-host" />,
}));

afterEach(() => vi.unstubAllGlobals());

describe("editor stage within the menu shell", () => {
  it("fits and refits the available container, independently of the window", () => {
    let onResize = () => {};
    let host: Element | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          onResize = callback;
        }
        observe(element: Element) {
          host = element;
        }
        disconnect = disconnect;
      }
    );
    const { getByTestId, unmount } = render(
      <ScaledStage embedded>
        <div data-testid="editor" />
      </ScaledStage>
    );
    const stage = getByTestId("editor").parentElement!;
    Object.defineProperties(host, {
      clientWidth: { configurable: true, value: 920 },
      clientHeight: { configurable: true, value: 640 },
    });
    act(() => onResize());
    expect(stage.style.transform).toBe("scale(0.8)");
    Object.defineProperty(host, "clientWidth", {
      configurable: true,
      value: 460,
    });
    act(() => onResize());
    expect(stage.style.transform).toBe("scale(0.4)");
    // MenuLayout owns the shared toast host for embedded editors.
    expect(screen.queryByTestId("toast-host")).toBeNull();
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("keeps gameplay at its existing window scale with its own toast host", () => {
    const { getByTestId } = render(
      <ScaledStage>
        <div data-testid="game" />
      </ScaledStage>
    );
    expect(getByTestId("game").parentElement!.style.transform).toBe(
      "scale(0.75)"
    );
    expect(screen.queryByTestId("toast-host")).not.toBeNull();
  });
});
