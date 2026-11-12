// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChoicePanel } from "./ChoicePanel";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";
import { useGameUiStore } from "../../../store/useGameUiStore";

const MOCK_COUNTRIES: CountryData[] = [
  {
    name: "Canada",
    officialName: "Canada",
    cca2: "CA",
    cca3: "CAN",
    ccn3: "124",
    capital: ["Ottawa"],
    region: "Americas",
    subregion: "North America",
    flag: "🇨🇦",
    population: 38000000,
  },
  {
    name: "France",
    officialName: "French Republic",
    cca2: "FR",
    cca3: "FRA",
    ccn3: "250",
    capital: ["Paris"],
    region: "Europe",
    subregion: "Western Europe",
    flag: "🇫🇷",
    population: 67000000,
  },
  {
    name: "Germany",
    officialName: "Federal Republic of Germany",
    cca2: "DE",
    cca3: "DEU",
    ccn3: "276",
    capital: ["Berlin"],
    region: "Europe",
    subregion: "Western Europe",
    flag: "🇩🇪",
    population: 83000000,
  },
  {
    name: "Japan",
    officialName: "Japan",
    cca2: "JP",
    cca3: "JPN",
    ccn3: "392",
    capital: ["Tokyo"],
    region: "Asia",
    subregion: "Eastern Asia",
    flag: "🇯🇵",
    population: 125000000,
  },
];

describe("ChoicePanel", () => {
  const defaultChoices = ["CA", "FR", "DE", "JP"];
  const defaultCodes = ["CAN", "FRA", "DEU", "JPN"];

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useGameStore.setState({
      session: {
        ...useGameStore.getState().session,
        subMode: "flag",
        currentCountryCode: "CAN",
        revealed: false,
      },
    });
    useGameUiStore.setState({
      feedback: null,
      clickedName: null,
    });
  });

  it("renders flags in a 2-per-row grid (grid-cols-2) in flag subMode", () => {
    const handleChoice = vi.fn();
    const { container } = render(
      <ChoicePanel
        choiceCodes={defaultCodes}
        choices={defaultChoices}
        countries={MOCK_COUNTRIES}
        onChoice={handleChoice}
      />,
    );

    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("grid-cols-2");

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
  });

  it("fires onChoice when a flag button is clicked", () => {
    const handleChoice = vi.fn();
    render(
      <ChoicePanel
        choiceCodes={defaultCodes}
        choices={defaultChoices}
        countries={MOCK_COUNTRIES}
        onChoice={handleChoice}
      />,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]!);
    expect(handleChoice).toHaveBeenCalledWith("CAN", "CA");
  });

  it("animates reveal: 3 wrong answers disappear, and correct answer remains and opens up with country name", () => {
    const handleChoice = vi.fn();
    useGameUiStore.setState({
      feedback: "correct",
      clickedName: "CA",
    });

    render(
      <ChoicePanel
        choiceCodes={defaultCodes}
        choices={defaultChoices}
        countries={MOCK_COUNTRIES}
        onChoice={handleChoice}
      />,
    );

    // Only the single correct answer button remains visible
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);

    // It spans both columns (col-span-2)
    const cardWrapper = buttons[0]!.closest(".col-span-2");
    expect(cardWrapper).not.toBeNull();

    // It opens up with the country name and 'Correct Answer'
    expect(screen.getByText("Canada")).toBeTruthy();
    expect(screen.getByText("Correct Answer")).toBeTruthy();
  });

  it("renders a single column (grid-cols-1) when subMode is not flag", () => {
    useGameStore.setState({
      session: {
        ...useGameStore.getState().session,
        subMode: "capital",
        currentCountryCode: "CAN",
        revealed: false,
      },
    });

    const handleChoice = vi.fn();
    const { container } = render(
      <ChoicePanel
        choiceCodes={["CAN", "FRA", "DEU", "JPN"]}
        choices={["Ottawa", "Paris", "Berlin", "Tokyo"]}
        countries={MOCK_COUNTRIES}
        onChoice={handleChoice}
      />,
    );

    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("grid-cols-1");
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });
});
