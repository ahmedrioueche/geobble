import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadWorldMapData,
  parseWorldMapTopology,
  resetWorldMapDataCache,
} from "./worldMapData";

const topology = {
  type: "Topology",
  objects: {
    countries: {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Polygon",
          id: 124,
          properties: { name: "Canada" },
          arcs: [[0]],
        },
      ],
    },
  },
  arcs: [[[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]],
};

afterEach(() => {
  resetWorldMapDataCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("parseWorldMapTopology", () => {
  it("converts countries and exposes IDs from the same topology", () => {
    const data = parseWorldMapTopology(topology);

    expect(data.availableMapIds).toEqual(new Set(["124"]));
    expect(data.geoData.features).toHaveLength(1);
    expect(data.geoData.features[0]).toMatchObject({
      id: "124",
      properties: { name: "Canada" },
      geometry: { type: "Polygon" },
    });
  });

  it.each([
    null,
    {},
    { ...topology, type: "FeatureCollection" },
    { ...topology, objects: {} },
    {
      ...topology,
      objects: {
        countries: {
          type: "GeometryCollection",
          geometries: [{ type: "Polygon", id: 124, properties: {} }],
        },
      },
    },
  ])("rejects invalid topology input", (input) => {
    expect(() => parseWorldMapTopology(input)).toThrow(
      "Invalid world map topology",
    );
  });
});

describe("loadWorldMapData", () => {
  it("shares one in-flight request and parsed result between consumers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(topology),
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstConsumer = loadWorldMapData();
    const secondConsumer = loadWorldMapData();
    const [firstResult, secondResult] = await Promise.all([
      firstConsumer,
      secondConsumer,
    ]);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(firstResult).toBe(secondResult);
    expect(firstResult.availableMapIds).toEqual(new Set(["124"]));
  });

  it("clears a failed request from cache so a later consumer can retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: vi.fn() })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(topology),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadWorldMapData()).rejects.toThrow("Failed to load map data");
    const retry = await loadWorldMapData();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retry.availableMapIds).toEqual(new Set(["124"]));
  });
});
