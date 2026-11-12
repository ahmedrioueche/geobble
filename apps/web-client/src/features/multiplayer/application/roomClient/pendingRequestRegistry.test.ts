import { describe, expect, it, vi } from "vitest";
import { PendingRequestRegistry } from "./pendingRequestRegistry";

describe("PendingRequestRegistry", () => {
  it("resolves a tracked request by requestId", async () => {
    const registry = new PendingRequestRegistry<string>();
    const promise = registry.create("req-1", 5000, () => new Error("timeout"));

    expect(registry.size).toBe(1);
    expect(registry.resolve("req-1", "success")).toBe(true);
    expect(registry.size).toBe(0);

    await expect(promise).resolves.toBe("success");
  });

  it("rejects a tracked request by requestId", async () => {
    const registry = new PendingRequestRegistry<string>();
    const promise = registry.create("req-1", 5000, () => new Error("timeout"));

    expect(registry.reject("req-1", new Error("custom error"))).toBe(true);
    expect(registry.size).toBe(0);

    await expect(promise).rejects.toThrow("custom error");
  });

  it("times out if not resolved within timeoutMs", async () => {
    vi.useFakeTimers();
    const registry = new PendingRequestRegistry<string>();
    const promise = registry.create("req-1", 1000, () => new Error("Timed out waiting"));

    vi.advanceTimersByTime(1001);
    await expect(promise).rejects.toThrow("Timed out waiting");
    expect(registry.size).toBe(0);
    vi.useRealTimers();
  });

  it("rejects all tracked requests on rejectAll", async () => {
    const registry = new PendingRequestRegistry<string>();
    const p1 = registry.create("req-1", 5000, () => new Error("timeout"));
    const p2 = registry.create("req-2", 5000, () => new Error("timeout"));

    registry.rejectAll(new Error("Connection reset"));
    expect(registry.size).toBe(0);

    await expect(p1).rejects.toThrow("Connection reset");
    await expect(p2).rejects.toThrow("Connection reset");
  });
});

