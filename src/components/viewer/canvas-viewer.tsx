"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
  NodeProps,
  useReactFlow,
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

interface TextNodeData {
  label: string;
  color?: string;
  isEditing?: boolean;
  onLabelChange?: (id: string, label: string) => void;
  onStartEdit?: (id: string) => void;
  onEndEdit?: (id: string) => void;
  [key: string]: unknown;
}

// Custom editable node component
function TextNode({ id, data, selected }: NodeProps) {
  const nodeData = data as TextNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(nodeData.label || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, []);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      autoResize();
    }
  }, [isEditing, autoResize]);

  // Keep text in sync with external label changes
  useEffect(() => {
    setText(nodeData.label || "");
  }, [nodeData.label]);

  const handleDoubleClick = () => {
    if (nodeData.onStartEdit) {
      setIsEditing(true);
      nodeData.onStartEdit(id);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    if (nodeData.onLabelChange && text !== nodeData.label) {
      nodeData.onLabelChange(id, text);
    }
    if (nodeData.onEndEdit) {
      nodeData.onEndEdit(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape = cancel
    if (e.key === "Escape") {
      setText(nodeData.label || "");
      setIsEditing(false);
      if (nodeData.onEndEdit) nodeData.onEndEdit(id);
    }
    // Ctrl+Enter or Cmd+Enter = save (Enter alone = newline on mobile)
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    autoResize();
  };

  return (
    <div
      className={`p-3 rounded-lg border shadow-sm bg-background min-w-[100px] ${
        selected ? "ring-2 ring-primary" : ""
      }`}
      style={{
        borderColor: (nodeData.color as string) || "hsl(var(--border))",
        borderLeftWidth: nodeData.color ? "4px" : "1px",
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[60px] text-sm bg-muted/50 border border-border/50 rounded p-2 outline-none resize-none"
            placeholder="Entrez du texte..."
          />
          <p className="text-[10px] text-muted-foreground">
            Ctrl+Entrée pour sauver • Échap pour annuler
          </p>
        </div>
      ) : (
        <div className="text-sm whitespace-pre-wrap min-h-[20px]">
          {nodeData.label || "Double-cliquez pour éditer"}
        </div>
      )}
    </div>
  );
}

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
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
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

function CanvasFlow({
  data,
  fileName,
  onSave,
  readOnly = false,
}: CanvasViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const reactFlowInstance = useReactFlow();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => convertToReactFlow(data),
    [data]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle label changes from node editing
  const handleLabelChange = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: newLabel } }
          : node
      )
    );
  }, [setNodes]);

  // Add callbacks to nodes when editing
  const nodesWithCallbacks = useMemo(() => {
    if (!isEditing) return nodes;
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onLabelChange: handleLabelChange,
        onStartEdit: () => {},
        onEndEdit: () => {},
      },
    }));
  }, [nodes, isEditing, handleLabelChange]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
    setSelectedNodes(selectedNodes.map((n) => n.id));
  }, []);

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
    const viewport = reactFlowInstance.getViewport();
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: "textNode",
      position: {
        x: (-viewport.x + 200) / viewport.zoom,
        y: (-viewport.y + 200) / viewport.zoom
      },
      data: { label: "Nouveau nœud" },
      style: { width: 200, minHeight: 60 },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleDeleteSelected = () => {
    if (selectedNodes.length === 0) return;
    setNodes((nds) => nds.filter((n) => !selectedNodes.includes(n.id)));
    setEdges((eds) => eds.filter((e) =>
      !selectedNodes.includes(e.source) && !selectedNodes.includes(e.target)
    ));
    setSelectedNodes([]);
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

  // Keyboard shortcut for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && isEditing && selectedNodes.length > 0) {
        // Don't delete if we're editing text
        const activeElement = document.activeElement;
        if (activeElement?.tagName === "TEXTAREA" || activeElement?.tagName === "INPUT") {
          return;
        }
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, selectedNodes, handleDeleteSelected]);

  const canEdit = !readOnly && onSave;

  const nodeTypes = useMemo(() => ({ textNode: TextNode }), []);

  return (
    <ReactFlow
      nodes={nodesWithCallbacks}
      edges={edges}
      onNodesChange={isEditing ? onNodesChange : undefined}
      onEdgesChange={isEditing ? onEdgesChange : undefined}
      onConnect={isEditing ? onConnect : undefined}
      onSelectionChange={isEditing ? onSelectionChange : undefined}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable={isEditing}
      nodesConnectable={isEditing}
      elementsSelectable={isEditing}
      selectNodesOnDrag={false}
      panOnDrag={true}
      zoomOnScroll={true}
      zoomOnPinch={true}
      minZoom={0.2}
      maxZoom={3}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

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
                {selectedNodes.length > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteSelected}
                    title="Supprimer sélection"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
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
  );
}

// Wrapper to provide ReactFlow context
export function CanvasViewer(props: CanvasViewerProps) {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <CanvasFlow {...props} />
      </ReactFlowProvider>
    </div>
  );
}
