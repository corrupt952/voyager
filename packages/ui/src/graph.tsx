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

const getLayoutedElements = (nodes: any[], edges: any[], focusNodeId: string) => {
  const LEVEL_SEPARATION = 200;
  const NODE_VERTICAL_SPACING = 50;
  const CENTER_X = 500;

  const parentMap = new Map<string, string[]>();
  const childrenMap = new Map<string, string[]>();

  nodes.forEach((node) => {
    parentMap.set(node.id, []);
    childrenMap.set(node.id, []);
  });

  edges.forEach((edge) => {
    childrenMap.get(edge.source)?.push(edge.target);
    parentMap.get(edge.target)?.push(edge.source);
  });

  const nodeLevels = new Map<string, number>();
  const focusedNode = nodes.find((n) => n.id === focusNodeId) || nodes[0];
  nodeLevels.set(focusedNode.id, 0);

  const calculateParentLevels = (nodeId: string, level: number, visited: Set<string>) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    parentMap.get(nodeId)?.forEach((parentId) => {
      nodeLevels.set(parentId, level - 1);
      calculateParentLevels(parentId, level - 1, visited);
    });
  };

  const calculateChildLevels = (nodeId: string, level: number, visited: Set<string>) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    childrenMap.get(nodeId)?.forEach((childId) => {
      nodeLevels.set(childId, level + 1);
      calculateChildLevels(childId, level + 1, visited);
    });
  };

  calculateParentLevels(focusedNode.id, 0, new Set());
  calculateChildLevels(focusedNode.id, 0, new Set());

  const levelNodesMap = new Map<number, string[]>();
  nodeLevels.forEach((level, nodeId) => {
    if (!levelNodesMap.has(level)) {
      levelNodesMap.set(level, []);
    }
    levelNodesMap.get(level)?.push(nodeId);
  });

  const nodePositions = new Map<string, { x: number; y: number }>();
  levelNodesMap.forEach((nodeIds, level) => {
    const levelHeight = nodeIds.length * NODE_VERTICAL_SPACING;
    const startY = -levelHeight / 2;

    nodeIds.forEach((nodeId, index) => {
      nodePositions.set(nodeId, {
        x: CENTER_X + level * LEVEL_SEPARATION,
        y: startY + index * NODE_VERTICAL_SPACING,
      });
    });
  });

  const layoutedNodes = nodes.map((node) => {
    const position = nodePositions.get(node.id) || { x: 0, y: 0 };
    return {
      ...node,
      position,
      draggable: true,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  const layoutedEdges = edges.map((edge) => ({
    ...edge,
    type: 'smoothstep',
    style: {
      stroke: '#888',
      strokeWidth: 2,
      opacity: 0.6,
    },
  }));

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
          label: nodeId.split('/').pop() || nodeId,
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

    setTimeout(() => {
      fitView({
        padding: 0.5,
        minZoom: 0.5,
        maxZoom: 1,
        duration: 800,
      });
    }, 0);
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
        maxZoom={1.5}
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
          maxZoom: 1,
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
