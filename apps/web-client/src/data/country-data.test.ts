import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCountries } from "./country-data";

const responsePage = (names: string[], more: boolean) => ({
  data: {
    objects: names.map((name, index) => ({
      names: { common: name, official: `Republic of ${name}` },
      codes: {
        alpha_2: `T${index}`,
        alpha_3: `${name.slice(0, 3).toUpperCase()}`,
        ccn3: String(index),
      },
      capitals: [{ name: `Capital of ${name}` }],
      region: "Test Region",
      subregion: "Test Subregion",
      flag: { emoji: "🏳️" },
      population: 1000 + index,
    })),
    meta: { more },
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchCountries", () => {
  it("fetches each page and maps API country records", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(responsePage(["First"], true)), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(responsePage(["Second"], false)), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const countries = await fetchCountries();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstUrl = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    const secondUrl = new URL(fetchMock.mock.calls[1][0] as string, "http://localhost");
    expect(firstUrl.searchParams.get("limit")).toBe("100");
    expect(firstUrl.searchParams.get("offset")).toBe("0");
    expect(secondUrl.searchParams.get("offset")).toBe("100");
    expect(countries).toEqual([
      {
        name: "First",
        officialName: "Republic of First",
        cca2: "T0",
        cca3: "FIR",
        ccn3: "0",
        capital: ["Capital of First"],
        region: "Test Region",
        subregion: "Test Subregion",
        flag: "🏳️",
        population: 1000,
      },
      {
        name: "Second",
        officialName: "Republic of Second",
        cca2: "T0",
        cca3: "SEC",
        ccn3: "0",
        capital: ["Capital of Second"],
        region: "Test Region",
        subregion: "Test Subregion",
        flag: "🏳️",
        population: 1000,
      },
    ]);
  });

  it("logs a failed response and returns the established empty fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(fetchCountries()).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      "Error fetching country data:",
      expect.any(Error),
    );
  });
});
