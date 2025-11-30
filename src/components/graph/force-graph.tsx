"use client";

import { useEffect, useRef, useState, memo, useMemo } from "react";
import * as d3 from "d3";
import { useRouter } from "next/navigation";
import { encodePathSegments } from "@/lib/path-utils";

interface GraphNode {
  id: string;
  name: string;
  path: string;
  linkCount: number;
  isOrphan?: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface ForceGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  forceStrength?: number;
  linkDistance?: number;
}

export const ForceGraph = memo(function ForceGraph({
  nodes,
  links,
  forceStrength = -200,
  linkDistance = 80,
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        setDimensions({
          width: svgRef.current.parentElement.clientWidth,
          height: svgRef.current.parentElement.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const { width, height } = dimensions;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);

    // Create container for zoom
    const container = svg.append("g");

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create force simulation with configurable forces
    // Collision radius scales with linkDistance (min 8px for readability)
    const collisionRadius = Math.max(8, linkDistance * 0.3);

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(linkDistance)
        .strength(1) // Strong link force to respect distance
      )
      .force("charge", d3.forceManyBody().strength(forceStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(collisionRadius));

    // Create links
    const link = container.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "var(--border)")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1);

    // Create nodes
    const node = container.append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer");

    // Add drag behavior
    const dragBehavior = d3.drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(dragBehavior);

    // Node circles - orphans styled differently
    node.append("circle")
      .attr("r", d => d.isOrphan ? 5 : Math.min(8 + d.linkCount * 2, 20))
      .attr("fill", d => d.isOrphan ? "var(--muted-foreground)" : "var(--primary)")
      .attr("stroke", "var(--background)")
      .attr("stroke-width", 2)
      .attr("opacity", d => d.isOrphan ? 0.5 : 1)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("fill", "var(--accent)")
          .attr("r", d.isOrphan ? 7 : Math.min(10 + d.linkCount * 2, 24))
          .attr("opacity", 1);
        setHoveredNode(d);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("fill", d.isOrphan ? "var(--muted-foreground)" : "var(--primary)")
          .attr("r", d.isOrphan ? 5 : Math.min(8 + d.linkCount * 2, 20))
          .attr("opacity", d.isOrphan ? 0.5 : 1);
        setHoveredNode(null);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        const pathWithoutMd = d.path.replace(".md", "");
        const encodedPath = encodePathSegments(pathWithoutMd);
        router.push(`/note/${encodedPath}`);
      });

    // Node labels
    node.append("text")
      .text(d => d.name.length > 15 ? d.name.slice(0, 15) + "..." : d.name)
      .attr("x", 0)
      .attr("y", d => Math.min(8 + d.linkCount * 2, 20) + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "var(--muted-foreground)")
      .attr("pointer-events", "none");

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Initial zoom to fit
    const initialScale = 0.8;
    svg.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width * (1 - initialScale) / 2, height * (1 - initialScale) / 2)
        .scale(initialScale)
    );

    return () => {
      simulation.stop();
    };
  }, [nodes, links, dimensions, router, forceStrength, linkDistance]);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-background"
      />
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-card border border-border rounded-lg p-3 shadow-lg max-w-xs overflow-hidden">
          <p className="font-medium text-sm truncate">{hoveredNode.name}</p>
          <p className="text-xs text-muted-foreground mt-1 break-all">
            {hoveredNode.path}
          </p>
          <p className="text-xs text-primary mt-1">
            {hoveredNode.linkCount} connexion{hoveredNode.linkCount > 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
});
