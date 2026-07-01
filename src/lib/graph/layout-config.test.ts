import { describe, expect, it } from "vitest";
import { buildForceConfig } from "./layout-config";
import {
  COLLISION_MIN,
  FORCE_CHARGE_MAX,
  FORCE_CHARGE_MIN,
  GRAVITY_MAX,
  LINK_DISTANCE_MAX,
  LINK_DISTANCE_MIN,
} from "./constants";

describe("buildForceConfig", () => {
  it("clamps every field to its bounds", () => {
    const low = buildForceConfig({ forceStrength: 0, linkDistance: 1, gravityStrength: -1 });
    expect(low.charge).toBe(FORCE_CHARGE_MAX);
    expect(low.linkDistance).toBe(LINK_DISTANCE_MIN);
    expect(low.gravity).toBe(0);

    const high = buildForceConfig({ forceStrength: -9000, linkDistance: 9000, gravityStrength: 9 });
    expect(high.charge).toBe(FORCE_CHARGE_MIN);
    expect(high.linkDistance).toBe(LINK_DISTANCE_MAX);
    expect(high.gravity).toBe(GRAVITY_MAX);
  });

  it("keeps collision at or above the floor and monotonic in link distance", () => {
    const near = buildForceConfig({ forceStrength: -300, linkDistance: 10, gravityStrength: 0.05 });
    const far = buildForceConfig({ forceStrength: -300, linkDistance: 200, gravityStrength: 0.05 });
    expect(near.collision).toBeGreaterThanOrEqual(COLLISION_MIN);
    expect(far.collision).toBeGreaterThan(near.collision);
  });

  it("falls back to the minimum on NaN input", () => {
    const config = buildForceConfig({ forceStrength: NaN, linkDistance: NaN, gravityStrength: NaN });
    expect(config.charge).toBe(FORCE_CHARGE_MIN);
    expect(config.linkDistance).toBe(LINK_DISTANCE_MIN);
  });
});
