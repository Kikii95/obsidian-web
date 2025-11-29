"use client";

import { useMemo, useCallback, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, Save, Plus, Trash2, Download } from "lucide-react";
import {
  ObsidianCanvasData,
  ObsidianCanvasNode,
  ObsidianCanvasEdge,
  getCanvasColor,
} from "@/types/canvas";

interface CanvasViewerProps {
  data: ObsidianCanvasData;
  fileName: string;
  onSave?: (data: ObsidianCanvasData) => Promise<void>;
  readOnly?: boolean;
}

// Custom node component for text nodes
function TextNode({ data }: { data: { label: string; color?: string } }) {
  return (
    <div
      className="p-3 rounded-lg border shadow-sm bg-background min-w-[100px]"
      style={{
        borderColor: data.color || "hsl(var(--border))",
        borderLeftWidth: data.color ? "4px" : "1px",
      }}
    >
      <div className="text-sm whitespace-pre-wrap">{data.label}</div>
    </div>
  );
}

const nodeTypes = {
  textNode: TextNode,
};

// Convert Obsidian canvas format to React Flow format
function convertToReactFlow(
  canvasData: ObsidianCanvasData
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = canvasData.nodes.map((node: ObsidianCanvasNode) => ({
    id: node.id,
    type: "textNode",
    position: { x: node.x, y: node.y },
    data: {
      label: node.text || node.file || node.url || "",
      color: getCanvasColor(node.color),
    },
    style: {
      width: node.width,
      minHeight: node.height,
    },
  }));

  const edges: Edge[] = canvasData.edges.map((edge: ObsidianCanvasEdge) => ({
    id: edge.id,
    source: edge.fromNode,
    target: edge.toNode,
    sourceHandle: edge.fromSide,
    targetHandle: edge.toSide,
    type: "smoothstep",
    style: {
      stroke: edge.color ? getCanvasColor(edge.color) : "hsl(var(--muted-foreground))",
    },
  }));

  return { nodes, edges };
}

// Convert React Flow format back to Obsidian canvas format
function convertToObsidian(
  nodes: Node[],
  edges: Edge[],
  originalData: ObsidianCanvasData
): ObsidianCanvasData {
  const obsidianNodes: ObsidianCanvasNode[] = nodes.map((node) => {
    const original = originalData.nodes.find((n) => n.id === node.id);
    return {
      id: node.id,
      type: original?.type || "text",
      text: node.data.label as string,
      x: node.position.x,
      y: node.position.y,
      width: (node.style?.width as number) || 260,
      height: (node.style?.minHeight as number) || 100,
      color: original?.color,
      styleAttributes: original?.styleAttributes || {},
    };
  });

  const obsidianEdges: ObsidianCanvasEdge[] = edges.map((edge) => {
    const original = originalData.edges.find((e) => e.id === edge.id);
    return {
      id: edge.id,
      fromNode: edge.source,
      toNode: edge.target,
      fromSide: (edge.sourceHandle as "top" | "right" | "bottom" | "left") || "bottom",
      toSide: (edge.targetHandle as "top" | "right" | "bottom" | "left") || "top",
      styleAttributes: original?.styleAttributes || {},
    };
  });

  return {
    nodes: obsidianNodes,
    edges: obsidianEdges,
    metadata: originalData.metadata,
  };
}

export function CanvasViewer({
  data,
  fileName,
  onSave,
  readOnly = false,
}: CanvasViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => convertToReactFlow(data),
    [data]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      const canvasData = convertToObsidian(nodes, edges, data);
      await onSave(canvasData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save canvas:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNode = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: "textNode",
      position: { x: 100, y: 100 },
      data: { label: "Nouveau nœud" },
      style: { width: 200, minHeight: 60 },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleExport = () => {
    const canvasData = convertToObsidian(nodes, edges, data);
    const blob = new Blob([JSON.stringify(canvasData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canEdit = !readOnly && onSave;

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isEditing ? onNodesChange : undefined}
        onEdgesChange={isEditing ? onEdgesChange : undefined}
        onConnect={isEditing ? onConnect : undefined}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={isEditing}
        nodesConnectable={isEditing}
        elementsSelectable={isEditing}
        panOnDrag={!isEditing || true}
        zoomOnScroll={true}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => (node.data?.color as string) || "#888888"}
          maskColor="rgba(0, 0, 0, 0.5)"
        />

        {/* Toolbar */}
        <Panel position="top-right" className="flex gap-2">
          {canEdit && (
            <>
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddNode}
                    title="Ajouter nœud"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? "..." : "Sauver"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Éditer
                </Button>
              )}
            </>
          )}
          <Button size="sm" variant="ghost" onClick={handleExport} title="Exporter">
            <Download className="h-4 w-4" />
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
