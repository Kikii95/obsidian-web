"use client";

import { useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";

interface Node {
  id: string;
  name: string;
  path: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
}

interface MiniGraphProps {
  nodes: Node[];
  links: Link[];
  forceStrength?: number;
  linkDistance?: number;
  gravityStrength?: number;
}

function MiniGraphComponent({
  nodes,
  links,
  forceStrength = -80,
  linkDistance = 40,
  gravityStrength = 0.1,
}: MiniGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous
    svg.selectAll("*").remove();

    // Create container
    const g = svg.append("g");

    // Clone nodes to avoid mutation
    const nodesCopy: Node[] = nodes.map((n) => ({ ...n }));
    const linksCopy: Link[] = links.map((l) => ({ ...l }));

    // Create simulation with settings
    const collisionRadius = Math.max(4, linkDistance * 0.2);

    const simulation = d3
      .forceSimulation(nodesCopy)
      .force(
        "link",
        d3
          .forceLink<Node, Link>(linksCopy)
          .id((d) => d.id)
          .distance(linkDistance)
          .strength(1)
      )
      .force("charge", d3.forceManyBody().strength(forceStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(gravityStrength))
      .force("y", d3.forceY(height / 2).strength(gravityStrength))
      .force("collision", d3.forceCollide().radius(collisionRadius));

    // Draw links - more visible
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(linksCopy)
      .enter()
      .append("line")
      .attr("stroke", "hsl(var(--primary) / 0.5)")
      .attr("stroke-width", 1.5);

    // Draw nodes - larger and more visible
    // Use --foreground for stroke (white on dark, black on light)
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodesCopy)
      .enter()
      .append("circle")
      .attr("r", 6)
      .attr("fill", "hsl(var(--primary))")
      .attr("stroke", "hsl(var(--foreground))")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        const path = d.path.replace(/\.md$/, "");
        const encoded = path.split("/").map(encodeURIComponent).join("/");
        router.push(`/note/${encoded}`);
      });

    // Add titles
    node.append("title").text((d) => d.name);

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x || 0)
        .attr("y1", (d) => (d.source as Node).y || 0)
        .attr("x2", (d) => (d.target as Node).x || 0)
        .attr("y2", (d) => (d.target as Node).y || 0);

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);
    });

    // Zoom with extended range for more dezoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Initial fit
    setTimeout(() => {
      const bounds = g.node()?.getBBox();
      if (bounds) {
        const scale = Math.min(
          width / (bounds.width + 40),
          height / (bounds.height + 40),
          1.5
        );
        const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
        const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;
        svg.call(
          zoom.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
      }
    }, 500);

    return () => {
      simulation.stop();
    };
  }, [nodes, links, router, forceStrength, linkDistance, gravityStrength]);

  if (nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Aucune note avec des liens
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: "transparent" }}
    />
  );
}

export default memo(MiniGraphComponent);
