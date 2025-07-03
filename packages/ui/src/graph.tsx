import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { DependencyGraph } from '@voyager/core';
import { getNodeLabel } from './utils';
import '@xyflow/react/dist/style.css';

// デフォルトのスタイル
const defaultNodeStyle = {
  padding: '4px',
  borderRadius: '3px',
  fontSize: '10px',
  transition: 'all 0.3s ease',
} as const;

// ノードタイプごとのスタイル
const nodeStyles = {
  vueComponent: {
    ...defaultNodeStyle,
    background: '#42b883', // Vue.jsの色
    color: '#ffffff',
    border: '1px solid #35495e',
  },
  script: {
    ...defaultNodeStyle,
    background: '#2196f3', // JavaScriptの色を青色に変更
    color: '#ffffff',
    border: '1px solid #1976d2',
  },
  definition: {
    ...defaultNodeStyle,
    background: '#3178c6', // TypeScriptの色
    color: '#ffffff',
    border: '1px solid #235a97',
  },
} as const;

// 選択されたノードのスタイル
const selectedNodeStyle = {
  boxShadow: '0 0 8px 2px rgba(0, 0, 0, 0.2)',
  border: '2px solid #ff7e67 !important',
  zIndex: 1,
} as const;

// ノードタイプのマッピング
const nodeTypeMap = {
  vue: 'vueComponent',
  script: 'script',
  definition: 'definition',
} as const;

// ノードスタイルの定義
const getNodeStyle = (type: string, isSelected: boolean) => {
  const baseStyle = {
    padding: '4px',
    borderRadius: '3px',
    fontSize: '10px',
    transition: 'all 0.3s ease',
  };

  const typeStyle =
    {
      vue: {
        background: '#42b883',
        color: '#ffffff',
        border: '1px solid #35495e',
      },
      script: {
        background: '#2196f3',
        color: '#ffffff',
        border: '1px solid #1976d2',
      },
      definition: {
        background: '#3178c6',
        color: '#ffffff',
        border: '1px solid #235a97',
      },
    }[type] || {};

  const selectedStyle = isSelected
    ? {
        boxShadow: '0 0 8px 2px rgba(0, 0, 0, 0.2)',
        border: '2px solid #ff7e67',
        zIndex: 1,
      }
    : {};

  return {
    ...baseStyle,
    ...typeStyle,
    ...selectedStyle,
  };
};

// 相対パスを正規化する関数
const normalizeNodeId = (id: string) => {
  // 末尾の拡張子を削除
  const withoutExt = id.replace(/\.[^/.]+$/, '');
  // index.vueなどの場合はディレクトリ名のみにする
  return withoutExt.replace(/\/index$/, '');
};

export interface DependencyGraphViewerProps {
  graph: DependencyGraph;
  focusNodeId: string;
}

// 依存関係の重みを計算するインターフェースとヘルパー関数
interface NodeWeight {
  level: number;
  weight: number;
  directDependencies: Set<string>;
  allDependencies: Set<string>;
  dependencyDepth: number; // 依存の深さ
  dependentDepth: number; // 被依存の深さ
  group?: string; // サブグループ識別子
}

const calculateNodeWeights = (
  nodes: any[],
  edges: any[],
  focusNodeId: string
): Map<string, NodeWeight> => {
  const weights = new Map<string, NodeWeight>();

  // 初期化
  nodes.forEach((node) => {
    weights.set(node.id, {
      level: 0,
      weight: 0,
      directDependencies: new Set<string>(),
      allDependencies: new Set<string>(),
      dependencyDepth: 0,
      dependentDepth: 0,
    });
  });

  // 直接の依存関係を記録
  edges.forEach((edge) => {
    const sourceWeight = weights.get(edge.source);
    const targetWeight = weights.get(edge.target);
    if (sourceWeight && targetWeight) {
      sourceWeight.directDependencies.add(edge.target);
    }
  });

  // 依存の深さを計算
  const calculateDependencyDepth = (nodeId: string, visited: Set<string>, depth: number) => {
    const weight = weights.get(nodeId);
    if (!weight || visited.has(nodeId)) return depth;

    visited.add(nodeId);
    weight.dependencyDepth = Math.max(weight.dependencyDepth, depth);

    let maxChildDepth = depth;
    weight.directDependencies.forEach((depId) => {
      const childDepth = calculateDependencyDepth(depId, new Set(visited), depth + 1);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    });

    return maxChildDepth;
  };

  // 被依存の深さを計算
  const calculateDependentDepth = (nodeId: string, visited: Set<string>, depth: number) => {
    const weight = weights.get(nodeId);
    if (!weight || visited.has(nodeId)) return depth;

    visited.add(nodeId);
    weight.dependentDepth = Math.max(weight.dependentDepth, depth);

    let maxParentDepth = depth;
    edges.forEach((edge) => {
      if (edge.target === nodeId && !visited.has(edge.source)) {
        const parentDepth = calculateDependentDepth(edge.source, new Set(visited), depth + 1);
        maxParentDepth = Math.max(maxParentDepth, parentDepth);
      }
    });

    return maxParentDepth;
  };

  // 深さの計算を実行
  calculateDependencyDepth(focusNodeId, new Set(), 0);
  calculateDependentDepth(focusNodeId, new Set(), 0);

  // グループの割り当て
  const assignGroups = () => {
    const groups = new Map<string, Set<string>>();

    nodes.forEach((node) => {
      const weight = weights.get(node.id);
      if (!weight) return;

      // 依存関係の方向性に基づいてグループを決定
      const groupKey = `${weight.dependencyDepth}-${weight.dependentDepth}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, new Set());
      }
      groups.get(groupKey)?.add(node.id);
      weight.group = groupKey;
    });

    return groups;
  };

  const groups = assignGroups();

  return weights;
};

// Calculate node levels based on dependency relationships
const calculateNodeLevels = (nodes: any[], edges: any[]): Map<string, number> => {
  const levels = new Map<string, number>();
  const incomingEdges = new Map<string, Set<string>>();
  const outgoingEdges = new Map<string, Set<string>>();
  
  // Initialize edge maps
  nodes.forEach(node => {
    incomingEdges.set(node.id, new Set());
    outgoingEdges.set(node.id, new Set());
    levels.set(node.id, 0);
  });
  
  // Build edge relationships
  edges.forEach(edge => {
    incomingEdges.get(edge.target)?.add(edge.source);
    outgoingEdges.get(edge.source)?.add(edge.target);
  });
  
  // Find nodes with no dependencies (root nodes)
  const rootNodes = nodes.filter(node => incomingEdges.get(node.id)?.size === 0);
  
  // BFS to assign levels
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = rootNodes.map(node => ({ id: node.id, level: 0 }));
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    
    if (visited.has(id)) continue;
    visited.add(id);
    
    // Update level (take maximum to handle nodes with multiple paths)
    const currentLevel = levels.get(id) || 0;
    levels.set(id, Math.max(currentLevel, level));
    
    // Add children to queue
    const children = outgoingEdges.get(id) || new Set();
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }
  
  // Handle nodes that weren't reached (cycles or isolated nodes)
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      // For cyclic or isolated nodes, calculate based on their connections
      const incoming = incomingEdges.get(node.id) || new Set();
      const outgoing = outgoingEdges.get(node.id) || new Set();
      
      if (incoming.size > 0) {
        // Place after its dependencies
        const maxIncomingLevel = Math.max(...Array.from(incoming).map(id => levels.get(id) || 0));
        levels.set(node.id, maxIncomingLevel + 1);
      } else if (outgoing.size > 0) {
        // Place before its dependents
        const minOutgoingLevel = Math.min(...Array.from(outgoing).map(id => levels.get(id) || 0));
        levels.set(node.id, Math.max(0, minOutgoingLevel - 1));
      }
    }
  });
  
  return levels;
};

const getLayoutedElements = (nodes: any[], edges: any[], focusNodeId: string) => {
  // Create a new dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Set graph layout options
  dagreGraph.setGraph({
    rankdir: 'LR', // Left to Right layout for dependency flow
    align: 'UL', // Up-Left alignment to keep same rank nodes aligned
    nodesep: 50, // Vertical separation between nodes
    ranksep: 150, // Horizontal separation between ranks
    edgesep: 25, // Separation between edges
    marginx: 50,
    marginy: 50,
    ranker: 'tight-tree', // Use tight-tree algorithm for better rank assignment
  });

  // Calculate node levels based on dependencies
  const nodeLevels = calculateNodeLevels(nodes, edges);

  // Group nodes by their path structure (e.g., components/atoms, components/molecules)
  const nodeGroups = new Map<string, string[]>();
  nodes.forEach(node => {
    const pathParts = node.id.split('/');
    if (pathParts.length >= 2) {
      // Group by first two levels of path (e.g., "components/atoms")
      const groupKey = pathParts.slice(0, 2).join('/');
      if (!nodeGroups.has(groupKey)) {
        nodeGroups.set(groupKey, []);
      }
      nodeGroups.get(groupKey)?.push(node.id);
    }
  });

  // Add nodes to the graph with rank constraints
  nodes.forEach((node) => {
    // Estimate node dimensions based on label length
    const labelLength = node.data.label.length;
    const width = Math.max(150, labelLength * 8);
    const height = 50;
    
    const nodeData: any = { 
      width, 
      height,
      label: node.data.label,
    };

    // Set rank if we have a level for this node
    const level = nodeLevels.get(node.id);
    if (level !== undefined) {
      nodeData.rank = level;
    }
    
    dagreGraph.setNode(node.id, nodeData);
  });

  // Add invisible edges between nodes in the same group to keep them together
  nodeGroups.forEach((nodeIds) => {
    if (nodeIds.length > 1) {
      for (let i = 0; i < nodeIds.length - 1; i++) {
        // Only add constraint if nodes are at the same level
        const level1 = nodeLevels.get(nodeIds[i]);
        const level2 = nodeLevels.get(nodeIds[i + 1]);
        if (level1 === level2) {
          dagreGraph.setEdge(nodeIds[i], nodeIds[i + 1], {
            weight: 0,
            style: { display: 'none' }
          });
        }
      }
    }
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Get the graph dimensions for centering
  const graphInfo = dagreGraph.graph();
  const graphWidth = graphInfo.width || 800;
  const graphHeight = graphInfo.height || 600;

  // Apply the calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const nodeWidth = nodeWithPosition.width;
    const nodeHeight = nodeWithPosition.height;
    
    return {
      ...node,
      position: {
        // dagre gives center positions, React Flow needs top-left
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      draggable: true,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        ...node.style,
        // Highlight the focused node
        ...(node.id === focusNodeId ? { 
          boxShadow: '0 0 12px 4px rgba(66, 184, 131, 0.4)',
          border: '2px solid #42b883',
        } : {}),
      },
    };
  });

  // Style edges based on their relationship to the focused node
  const layoutedEdges = edges.map((edge) => {
    const isDirectlyConnected = edge.source === focusNodeId || edge.target === focusNodeId;
    
    return {
      ...edge,
      type: 'smoothstep',
      style: {
        stroke: isDirectlyConnected ? '#42b883' : '#2196f3',
        strokeWidth: isDirectlyConnected ? 3 : 2,
        opacity: isDirectlyConnected ? 1 : 0.6,
      },
      animated: isDirectlyConnected,
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
};

// 選択されたノードの依存関係を抽出する関数
function extractDependencySubgraph(graph: DependencyGraph, focusNodeId: string) {
  const relevantNodes = new Set<string>();
  const relevantEdges = new Set<string>();

  function traverse(nodeId: string, direction: 'parent' | 'child', visited: Set<string>) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    relevantNodes.add(nodeId);

    if (direction === 'parent') {
      Array.from(graph.edges).forEach((edge) => {
        if (edge.to === nodeId) {
          relevantEdges.add(`${edge.from}-${edge.to}`);
          traverse(edge.from, 'parent', visited);
        }
      });
    } else {
      Array.from(graph.edges).forEach((edge) => {
        if (edge.from === nodeId) {
          relevantEdges.add(`${edge.from}-${edge.to}`);
          traverse(edge.to, 'child', visited);
        }
      });
    }
  }

  traverse(focusNodeId, 'parent', new Set<string>());
  traverse(focusNodeId, 'child', new Set<string>());

  const nodes = Array.from(relevantNodes)
    .map((nodeId) => {
      const nodeData = Array.from(graph.nodes.values()).find((n) => n.id === nodeId);
      if (!nodeData) return null;

      return {
        id: nodeData.relativePath,
        data: {
          label: getNodeLabel(nodeData.relativePath),
        },
        position: { x: 0, y: 0 },
        style: getNodeStyle(nodeData.type, nodeId === focusNodeId),
      };
    })
    .filter((node): node is NonNullable<typeof node> => node !== null);

  const edges = Array.from(graph.edges)
    .filter((edge) => relevantEdges.has(`${edge.from}-${edge.to}`))
    .map((edge) => {
      const fromNode = Array.from(graph.nodes.values()).find((n) => n.id === edge.from);
      const toNode = Array.from(graph.nodes.values()).find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return null;

      return {
        id: `${fromNode.relativePath}-${toNode.relativePath}`,
        source: fromNode.relativePath,
        target: toNode.relativePath,
        type: 'smoothstep',
      };
    })
    .filter((edge): edge is NonNullable<typeof edge> => edge !== null);

  return { nodes, edges };
}

// ReactFlowを使用するコンポーネント
function DependencyGraphViewerInner({ graph, focusNodeId }: DependencyGraphViewerProps) {
  const [nodes, setNodes] = React.useState<any[]>([]);
  const [edges, setEdges] = React.useState<any[]>([]);
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);
  const { fitView } = useReactFlow();

  const onNodesChange = React.useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onNodeMouseEnter = React.useCallback((event: React.MouseEvent, node: any) => {
    setHoveredNode(node.id);
  }, []);

  const onNodeMouseLeave = React.useCallback(() => {
    setHoveredNode(null);
  }, []);

  React.useEffect(() => {
    const focusNode = Array.from(graph.nodes.values()).find((n) => n.id === focusNodeId);
    if (!focusNode) return;

    const { nodes: initialNodes, edges: initialEdges } = extractDependencySubgraph(
      graph,
      focusNodeId
    );

    const enhancedNodes = initialNodes.map((node) => {
      const nodeInfo = Array.from(graph.nodes.values()).find((n) => n.relativePath === node.id);

      return {
        ...node,
        data: {
          ...node.data,
          info: {
            type: nodeInfo?.type || 'unknown',
            dependencies: nodeInfo?.dependencies.imports.length || 0,
            dependents: nodeInfo?.dependencies.importedBy.length || 0,
            scriptType: nodeInfo?.scriptType,
            scriptLang: nodeInfo?.scriptLang,
          },
        },
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      enhancedNodes,
      initialEdges,
      focusNode.relativePath
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Simple fitView after layout
    setTimeout(() => {
      fitView();
    }, 100);
  }, [graph, focusNodeId, fitView]);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnScroll={true}
        panOnScroll={false}
        panOnDrag={true}
        snapToGrid={true}
        snapGrid={[10, 10]}
      >
        <Background />
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
      {hoveredNode && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            backgroundColor: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            fontSize: '12px',
            zIndex: 1000,
            minWidth: '200px',
          }}
        >
          <div>
            <strong>パス:</strong> {hoveredNode}
          </div>
          <div>
            <strong>タイプ:</strong> {nodes.find((n) => n.id === hoveredNode)?.data?.info?.type}
          </div>
          {nodes.find((n) => n.id === hoveredNode)?.data?.info?.type === 'vue' && (
            <>
              <div>
                <strong>API スタイル:</strong>{' '}
                {nodes.find((n) => n.id === hoveredNode)?.data?.info?.scriptType || 'Options API'}
              </div>
              <div>
                <strong>言語:</strong>{' '}
                {nodes.find((n) => n.id === hoveredNode)?.data?.info?.scriptLang || 'js'}
              </div>
            </>
          )}
          <div>
            <strong>依存数:</strong>{' '}
            {nodes.find((n) => n.id === hoveredNode)?.data?.info?.dependencies || 0}
          </div>
          <div>
            <strong>被依存数:</strong>{' '}
            {nodes.find((n) => n.id === hoveredNode)?.data?.info?.dependents || 0}
          </div>
        </div>
      )}
    </>
  );
}

// メインのエクスポートコンポーネント
export function DependencyGraphViewer(props: DependencyGraphViewerProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <DependencyGraphViewerInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
