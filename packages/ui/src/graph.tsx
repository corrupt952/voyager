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
import { DependencyGraph, DependencyNode, DependencyEdge } from '@voyager-vue/core';
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

// Calculate node levels with focus node at center, dependencies on left, dependents on right
const calculateDirectionalLevels = (nodes: any[], edges: any[], focusNodeId: string): Map<string, number> => {
  const levels = new Map<string, number>();
  
  // Initialize all nodes with a placeholder level
  nodes.forEach(node => {
    levels.set(node.id, 0);
  });
  
  // Focus node is at center (level 0)
  levels.set(focusNodeId, 0);
  
  // BFS for dependencies (going left, negative levels)
  const dependencyQueue: { id: string; level: number }[] = [{ id: focusNodeId, level: 0 }];
  const dependencyVisited = new Set<string>([focusNodeId]);
  
  while (dependencyQueue.length > 0) {
    const { id, level } = dependencyQueue.shift()!;
    
    // Find nodes that this node depends on (this node imports them)
    edges.forEach(edge => {
      if (edge.source === id && !dependencyVisited.has(edge.target)) {
        dependencyVisited.add(edge.target);
        const newLevel = level - 1;
        const currentLevel = levels.get(edge.target);
        if (currentLevel === undefined || newLevel < currentLevel) {
          levels.set(edge.target, newLevel);
          dependencyQueue.push({ id: edge.target, level: newLevel });
        }
      }
    });
  }
  
  // BFS for dependents (going right, positive levels)
  const dependentQueue: { id: string; level: number }[] = [{ id: focusNodeId, level: 0 }];
  const dependentVisited = new Set<string>([focusNodeId]);
  
  while (dependentQueue.length > 0) {
    const { id, level } = dependentQueue.shift()!;
    
    // Find nodes that depend on this node (they import this node)
    edges.forEach(edge => {
      if (edge.target === id && !dependentVisited.has(edge.source)) {
        dependentVisited.add(edge.source);
        const newLevel = level + 1;
        const currentLevel = levels.get(edge.source);
        if (currentLevel === undefined || newLevel > currentLevel) {
          levels.set(edge.source, newLevel);
          dependentQueue.push({ id: edge.source, level: newLevel });
        }
      }
    });
  }
  
  // Normalize levels to be non-negative (shift all levels to the right)
  const minLevel = Math.min(...Array.from(levels.values()).filter(l => l !== undefined));
  nodes.forEach(node => {
    const level = levels.get(node.id);
    if (level !== undefined) {
      levels.set(node.id, level - minLevel);
    } else {
      // Unconnected nodes get placed at the far right
      levels.set(node.id, 999);
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
    align: undefined, // Remove alignment to avoid staircase effect
    nodesep: 50, // Vertical separation between nodes
    ranksep: 150, // Horizontal separation between ranks
    edgesep: 25, // Separation between edges
    marginx: 50,
    marginy: 50,
    ranker: 'network-simplex', // Better algorithm for complex graphs
  });

  // Calculate node levels with directional flow from focus node
  const nodeLevels = calculateDirectionalLevels(nodes, edges, focusNodeId);

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

  // Remove invisible edges for now to avoid staircase effect

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
      Array.from(graph.edges).forEach((edge: DependencyEdge) => {
        if (edge.to === nodeId) {
          relevantEdges.add(`${edge.from}-${edge.to}`);
          traverse(edge.from, 'parent', visited);
        }
      });
    } else {
      Array.from(graph.edges).forEach((edge: DependencyEdge) => {
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
      const nodeData = Array.from(graph.nodes.values()).find((n: DependencyNode) => n.id === nodeId);
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

// カスタムノードコンポーネント
const CustomNode = ({ data }: { data: any }) => {
  const { label, info } = data;
  const scriptType = info?.scriptType;
  const scriptLang = info?.scriptLang;
  const nodeType = info?.type;

  // APIタイプのバッジを作成
  const getApiBadge = () => {
    if (nodeType !== 'vue' || !scriptType || scriptType === 'unknown') return null;
    
    const badgeStyle = {
      padding: '2px 6px',
      borderRadius: '10px',
      fontSize: '9px',
      fontWeight: 'bold',
      marginLeft: '4px',
      display: 'inline-block',
    };

    const badges = [];
    
    // APIタイプバッジ
    if (scriptType === 'composition') {
      badges.push(
        <span key="api" style={{ ...badgeStyle, backgroundColor: '#00BD7E', color: '#fff' }}>
          Composition
        </span>
      );
    } else if (scriptType === 'options') {
      badges.push(
        <span key="api" style={{ ...badgeStyle, backgroundColor: '#FF6B6B', color: '#fff' }}>
          Options
        </span>
      );
    } else if (scriptType === 'mixed') {
      badges.push(
        <span key="api" style={{ ...badgeStyle, backgroundColor: '#FF8C42', color: '#fff' }}>
          Mixed
        </span>
      );
    } else if (scriptType === 'functional') {
      badges.push(
        <span key="api" style={{ ...badgeStyle, backgroundColor: '#4ECDC4', color: '#fff' }}>
          Functional
        </span>
      );
    }
    
    // 言語バッジ
    if (scriptLang === 'ts') {
      badges.push(
        <span key="lang" style={{ ...badgeStyle, backgroundColor: '#3178c6', color: '#fff' }}>
          TS
        </span>
      );
    }
    
    return badges;
  };

  return (
    <div className="px-3 py-2 text-center">
      <div>{label}</div>
      <div className="mt-1">
        {getApiBadge()}
      </div>
    </div>
  );
};

const nodeTypes = {
  vueComponent: CustomNode,
  script: CustomNode,
  definition: CustomNode,
};

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
    const focusNode = Array.from(graph.nodes.values()).find((n: DependencyNode) => n.id === focusNodeId);
    if (!focusNode) return;

    const { nodes: initialNodes, edges: initialEdges } = extractDependencySubgraph(
      graph,
      focusNodeId
    );

    const enhancedNodes = initialNodes.map((node) => {
      const nodeInfo = Array.from(graph.nodes.values()).find((n: DependencyNode) => n.relativePath === node.id);

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
        nodeTypes={nodeTypes}
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
      <div className="fixed bottom-5 right-5 bg-white px-4 py-3 rounded-lg shadow-lg text-xs z-[1000]">
        <div className="font-bold mb-2">Legend</div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
            <span>Vue Component</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
            <span>Script</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded-sm"></div>
            <span>Type Definition</span>
          </div>
          <div style={{ marginTop: '8px', borderTop: '1px solid #e0e0e0', paddingTop: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>API Types</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#00BD7E', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>C</span>
                <span>Composition API</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#FF6B6B', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>O</span>
                <span>Options API</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#FF8C42', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>M</span>
                <span>Mixed API</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#4ECDC4', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>S</span>
                <span>Script Setup</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#3178c6', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>TS</span>
                <span>TypeScript</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
