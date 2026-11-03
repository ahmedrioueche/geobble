// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import CustomSelect from "./CustomSelect";

const SelectHarness = () => {
  const [value, setValue] = useState<"identify" | "reverse">("identify");
  return (
    <CustomSelect
      title="Mode"
      options={[
        { value: "identify", label: "Identify" },
        { value: "reverse", label: "Reverse" },
      ]}
      selectedOption={value}
      onChange={setValue}
    />
  );
};

describe("CustomSelect", () => {
  afterEach(() => cleanup());

  it("opens, selects an option, and reflects the selection", () => {
    render(<SelectHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Mode" }));
    fireEvent.click(screen.getByRole("option", { name: "Reverse" }));

    expect(screen.getByRole("button", { name: "Mode" }).textContent).toContain(
      "Reverse",
    );
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("supports arrow-key selection and escape dismissal", () => {
    render(<SelectHarness />);
    const trigger = screen.getByRole("button", { name: "Mode" });

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("option", { name: "Identify" }), {
      key: "ArrowDown",
    });
    expect(document.activeElement).toBe(
      screen.getByRole("option", { name: "Reverse" }),
    );
    fireEvent.keyDown(screen.getByRole("option", { name: "Reverse" }), {
      key: "Escape",
    });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
