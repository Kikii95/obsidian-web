declare module "d3-force-3d" {
  export interface SimulationNode {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }

  export interface SimulationLink<N> {
    source: number | string | N;
    target: number | string | N;
  }

  export interface Force {
    (alpha: number): void;
    initialize?(nodes: SimulationNode[]): void;
  }

  export interface Simulation<N extends SimulationNode> {
    nodes(): N[];
    nodes(nodes: N[]): this;
    numDimensions(dimensions: number): this;
    force(name: string): Force | undefined;
    force(name: string, force: Force | null): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(min: number): this;
    alphaDecay(decay: number): this;
    alphaTarget(target: number): this;
    velocityDecay(decay: number): this;
    tick(iterations?: number): this;
    stop(): this;
    restart(): this;
    on(type: string, listener: (() => void) | null): this;
  }

  export function forceSimulation<N extends SimulationNode>(
    nodes?: N[],
    numDimensions?: number
  ): Simulation<N>;

  export interface LinkForce<N extends SimulationNode> extends Force {
    links(links: SimulationLink<N>[]): this;
    id(accessor: (node: N, index: number) => number | string): this;
    distance(distance: number | ((link: SimulationLink<N>) => number)): this;
    strength(strength: number | ((link: SimulationLink<N>) => number)): this;
  }

  export function forceLink<N extends SimulationNode>(
    links?: SimulationLink<N>[]
  ): LinkForce<N>;

  export interface ManyBodyForce extends Force {
    strength(strength: number | ((node: SimulationNode) => number)): this;
  }
  export function forceManyBody(): ManyBodyForce;

  export interface CenterForce extends Force {
    strength(strength: number): this;
  }
  export function forceCenter(x?: number, y?: number, z?: number): CenterForce;

  export interface CollideForce extends Force {
    radius(radius: number | ((node: SimulationNode) => number)): this;
  }
  export function forceCollide(radius?: number): CollideForce;
}
