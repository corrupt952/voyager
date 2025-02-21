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

const getLayoutedElements = (nodes: any[], edges: any[], focusNodeId: string) => {
  const LEVEL_SEPARATION = 300; // 左右の間隔を適度に調整
  const NODE_VERTICAL_SPACING = 50;
  const CENTER_X = 500;

  // 依存関係の分析
  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();

  // エッジの初期化と分類
  nodes.forEach((node) => {
    incomingEdges.set(node.id, []);
    outgoingEdges.set(node.id, []);
  });
  edges.forEach((edge) => {
    outgoingEdges.get(edge.source)?.push(edge.target);
    incomingEdges.get(edge.target)?.push(edge.source);
  });

  // ノードのレベルを計算
  const nodeLevels = new Map<string, number>();

  // 初期レベルの設定
  nodes.forEach((node) => {
    nodeLevels.set(node.id, 0);
  });

  // 各ノードの最右の依存元と最左の被依存先を計算
  const calculateExtremeLevels = (nodeId: string): { rightmost: number; leftmost: number } => {
    const incoming = incomingEdges.get(nodeId) || [];
    const outgoing = outgoingEdges.get(nodeId) || [];

    // このノードに依存しているノードの中で最も右にあるレベル
    const dependentLevels = incoming.map((src) => nodeLevels.get(src) || 0);
    const rightmostDependent = dependentLevels.length > 0 ? Math.max(...dependentLevels) : -1;

    // このノードが依存しているノードの中で最も左にあるレベル
    const dependencyLevels = outgoing.map((target) => nodeLevels.get(target) || 0);
    const leftmostDependency =
      dependencyLevels.length > 0 ? Math.min(...dependencyLevels) : Number.MAX_SAFE_INTEGER;

    return {
      rightmost: rightmostDependent,
      leftmost: leftmostDependency,
    };
  };

  // レベルの最適化（複数回の反復で収束させる）
  const MAX_ITERATIONS = 5;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let changed = false;
    nodes.forEach((node) => {
      const { rightmost, leftmost } = calculateExtremeLevels(node.id);

      let newLevel;
      if (rightmost === -1 && leftmost === Number.MAX_SAFE_INTEGER) {
        // 孤立したノード
        newLevel = 0;
      } else if (rightmost === -1) {
        // 依存されていないノード
        newLevel = leftmost - 1;
      } else if (leftmost === Number.MAX_SAFE_INTEGER) {
        // 依存していないノード
        newLevel = rightmost + 1;
      } else {
        // 中間ノード
        newLevel = Math.max(rightmost + 1, leftmost - 1);
      }

      if (nodeLevels.get(node.id) !== newLevel) {
        changed = true;
        nodeLevels.set(node.id, newLevel);
      }
    });

    if (!changed) break;
  }

  // レベルの正規化（最小値を0にする）
  const minLevel = Math.min(...Array.from(nodeLevels.values()));
  nodeLevels.forEach((level, nodeId) => {
    nodeLevels.set(nodeId, level - minLevel);
  });

  // 垂直位置の計算
  const calculateVerticalPositions = () => {
    const verticalRanks = new Map<string, number>();
    const levelGroups = new Map<number, string[]>();

    // レベルごとにノードをグループ化
    nodeLevels.forEach((level, nodeId) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)?.push(nodeId);
    });

    // 各レベル内でのノードの順序を最適化
    levelGroups.forEach((nodeIds, level) => {
      // 親子関係に基づいてノードをグループ化
      const nodeGroups: { nodeId: string; parentId: string | null }[][] = [];
      const processedNodes = new Set<string>();

      // まず親子関係のあるノードを処理
      nodeIds.forEach((nodeId) => {
        if (processedNodes.has(nodeId)) return;

        const parents = incomingEdges.get(nodeId) || [];
        if (parents.length > 0) {
          // 親が存在する場合、その親に関連する全ての子ノードをグループ化
          const parentId = parents[0];
          const siblingNodes = nodeIds.filter((id) =>
            (incomingEdges.get(id) || []).includes(parentId)
          );

          nodeGroups.push(
            siblingNodes.map((id) => ({
              nodeId: id,
              parentId,
            }))
          );

          siblingNodes.forEach((id) => processedNodes.add(id));
        }
      });

      // 残りのノードを処理
      const remainingNodes = nodeIds.filter((id) => !processedNodes.has(id));
      remainingNodes.forEach((nodeId) => {
        nodeGroups.push([{ nodeId, parentId: null }]);
      });

      // グループごとに垂直位置を割り当て
      let currentY = 0;
      nodeGroups.forEach((group, groupIndex) => {
        group.forEach((node, nodeIndex) => {
          verticalRanks.set(node.nodeId, currentY + nodeIndex * NODE_VERTICAL_SPACING);
        });
        currentY += (group.length + 1) * NODE_VERTICAL_SPACING; // グループ間にも余白を追加
      });
    });

    return verticalRanks;
  };

  const verticalPositions = calculateVerticalPositions();

  // ノードの位置を計算
  const nodePositions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    const level = nodeLevels.get(node.id) || 0;
    nodePositions.set(node.id, {
      x: CENTER_X + level * LEVEL_SEPARATION,
      y: verticalPositions.get(node.id) || 0,
    });
  });

  // ノードの配置を適用
  const layoutedNodes = nodes.map((node) => {
    const position = nodePositions.get(node.id) || { x: 0, y: 0 };
    const level = nodeLevels.get(node.id) || 0;

    return {
      ...node,
      position,
      draggable: true,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        ...node.style,
        zIndex: level,
      },
    };
  });

  // エッジのスタイル
  const layoutedEdges = edges.map((edge) => {
    const sourceLevel = nodeLevels.get(edge.source) || 0;
    const targetLevel = nodeLevels.get(edge.target) || 0;
    const levelDiff = Math.abs(targetLevel - sourceLevel);

    return {
      ...edge,
      type: 'smoothstep',
      style: {
        stroke: '#2196f3',
        strokeWidth: levelDiff === 1 ? 2 : 1,
        opacity: Math.max(0.4, 1 - levelDiff * 0.2),
      },
      animated: levelDiff === 1,
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
  const { fitView, setViewport } = useReactFlow();

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

    // 選択されたノードの位置を取得
    const selectedNode = layoutedNodes.find((node) => node.id === focusNode.relativePath);

    setTimeout(() => {
      fitView({
        padding: 0.2,
        minZoom: 1.0,
        maxZoom: 4.0,
        duration: 800,
      });

      // 選択されたノードが中心になるように調整
      if (selectedNode) {
        const x = selectedNode.position.x;
        const y = selectedNode.position.y;
        const zoom = 2.0;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const transform = {
          x: centerX - x * zoom,
          y: centerY - y * zoom,
          zoom: zoom,
        };

        // 中心位置とズームレベルを設定
        setViewport(transform);
      }
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
        minZoom={0.1}
        maxZoom={4.0}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: {
            stroke: '#888',
            strokeWidth: 2,
            opacity: 0.6,
          },
          animated: true,
        }}
        fitViewOptions={{
          padding: 0.5,
          minZoom: 0.5,
          maxZoom: 4.0,
          duration: 800,
        }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnScroll={true}
        panOnScroll={false}
        panOnDrag={true}
        snapToGrid={true}
        snapGrid={[10, 10]}
        key={focusNodeId}
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
