import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SegmentedControl } from "../SegmentedControl";

const ONLINE = [
  { value: "KILLS", label: "Kills" },
  { value: "WINS", label: "Wins" },
];
const SOLO = [
  { value: "COMPLETED", label: "Completed" },
  { value: "KILLS", label: "Kills" },
];

describe("SegmentedControl", () => {
  it("keeps button nodes when only the active value changes", () => {
    const { rerender } = render(
      <SegmentedControl
        value="KILLS"
        tone="yellow"
        onValueChange={() => {}}
        options={ONLINE}
      />
    );
    const before = screen.getByRole("button", { name: "Kills" });

    rerender(
      <SegmentedControl
        value="WINS"
        tone="yellow"
        onValueChange={() => {}}
        options={ONLINE}
      />
    );

    // Stable identity keeps the active cross-fade within one option set.
    expect(screen.getByRole("button", { name: "Kills" })).toBe(before);
  });

  it("remounts buttons when the option set changes", () => {
    const { rerender } = render(
      <SegmentedControl
        value="KILLS"
        tone="yellow"
        onValueChange={() => {}}
        options={ONLINE}
      />
    );
    const before = screen.getByRole("button", { name: "Kills" });

    rerender(
      <SegmentedControl
        value="COMPLETED"
        tone="yellow"
        onValueChange={() => {}}
        options={SOLO}
      />
    );

    // KILLS exists in both sets; it must not reuse the old node, otherwise the
    // stale yellow background transitions instead of swapping instantly.
    expect(screen.getByRole("button", { name: "Kills" })).not.toBe(before);
    expect(
      screen.getByRole("button", { name: "Completed" }).className
    ).toContain("bg-yellow");
    expect(
      screen.getByRole("button", { name: "Kills" }).className
    ).not.toContain("bg-yellow");
  });
});
