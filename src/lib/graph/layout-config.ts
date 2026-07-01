import {
  COLLISION_FACTOR,
  COLLISION_MIN,
  FORCE_CHARGE_MAX,
  FORCE_CHARGE_MIN,
  GRAVITY_MAX,
  GRAVITY_MIN,
  LINK_DISTANCE_MAX,
  LINK_DISTANCE_MIN,
} from "./constants";

export interface ForceSettings {
  forceStrength: number;
  linkDistance: number;
  gravityStrength: number;
}

export interface ForceConfig {
  charge: number;
  linkDistance: number;
  gravity: number;
  collision: number;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Map user force settings to a bounded d3-force-3d configuration. Pure and
 * shared by the layout worker and any main-thread fallback so both agree.
 */
export function buildForceConfig(settings: ForceSettings): ForceConfig {
  const linkDistance = clamp(settings.linkDistance, LINK_DISTANCE_MIN, LINK_DISTANCE_MAX);
  return {
    charge: clamp(settings.forceStrength, FORCE_CHARGE_MIN, FORCE_CHARGE_MAX),
    linkDistance,
    gravity: clamp(settings.gravityStrength, GRAVITY_MIN, GRAVITY_MAX),
    collision: Math.max(COLLISION_MIN, linkDistance * COLLISION_FACTOR),
  };
}
