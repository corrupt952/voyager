import { DependencyGraph, DependencyNode, DependencyEdge } from '@voyager-vue/core';
import { Node, Edge } from '@xyflow/react';

type NodeData = {
  label: string;
  type: 'vue' | 'script' | 'definition';
  scriptType?: string;
  scriptLang?: string;
};

export type FlowNode = Node<NodeData>;
export type FlowEdge = Edge;

type NodeWithDeps = {
  id: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  rank?: number;
};

/**
 * 依存関係グラフをReactFlowのノードとエッジに変換する
 */
export function convertToReactFlow(graph: DependencyGraph): {
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  // 1. 依存関係の解析
  const nodesWithDeps = new Map<string, NodeWithDeps>();

  // ノードの初期化
  Array.from(graph.nodes.keys()).forEach((id) => {
    const node = graph.nodes.get(id);
    if (!node) return;

    nodesWithDeps.set(id, {
      id,
      dependencies: new Set(node.dependencies.imports),
      dependents: new Set(node.dependencies.importedBy),
    });
  });

  // 2. ランク付け（Longest Path Layering）
  function assignRanks() {
    const visited = new Set<string>();
    const ranks = new Map<string, number>();

    function dfs(nodeId: string, currentRank: number) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodesWithDeps.get(nodeId);
      if (!node) return;

      ranks.set(nodeId, Math.max(currentRank, ranks.get(nodeId) || 0));

      // 依存されているノードを処理（下位層へ）
      node.dependents.forEach((depId) => {
        dfs(depId, currentRank + 1);
      });
    }

    // ルートノード（他に依存していないが依存されている）から開始
    const rootNodes = Array.from(nodesWithDeps.values())
      .filter((node) => node.dependencies.size === 0)
      .map((node) => node.id);

    if (rootNodes.length === 0) {
      // ルートノードが見つからない場合は循環依存の可能性があるため、
      // 最も依存されているノードをルートとして扱う
      const mostDependedNode = Array.from(nodesWithDeps.values()).reduce((max, node) =>
        node.dependents.size > (max?.dependents.size || 0) ? node : max
      );
      if (mostDependedNode) {
        rootNodes.push(mostDependedNode.id);
      }
    }

    rootNodes.forEach((rootId) => dfs(rootId, 0));

    // ランクを設定
    ranks.forEach((rank, id) => {
      const node = nodesWithDeps.get(id);
      if (node) {
        node.rank = rank;
      }
    });
  }

  assignRanks();

  // 3. 各ランクでのノードの水平位置を決定
  const rankGroups = new Map<number, string[]>();
  nodesWithDeps.forEach((node) => {
    if (typeof node.rank === 'number') {
      if (!rankGroups.has(node.rank)) {
        rankGroups.set(node.rank, []);
      }
      rankGroups.get(node.rank)?.push(node.id);
    }
  });

  // 4. 座標の計算
  const spacing = { x: 250, y: 200 };
  const positions = new Map<string, { x: number; y: number }>();

  rankGroups.forEach((nodesInRank, rank) => {
    const rankWidth = nodesInRank.length * spacing.x;
    const startX = -(rankWidth / 2);

    nodesInRank.forEach((nodeId, index) => {
      positions.set(nodeId, {
        x: startX + index * spacing.x,
        y: rank * spacing.y,
      });
    });
  });

  // 5. ReactFlowのノードとエッジの生成
  const nodes: FlowNode[] = Array.from(graph.nodes.values()).map((node: DependencyNode) => ({
    id: node.relativePath,
    type: node.type === 'vue' ? 'vueComponent' : node.type,
    position: positions.get(node.id) || { x: 0, y: 0 },
    data: {
      label: node.id.split('/').pop() || node.id,
      type: node.type,
      scriptType: node.scriptType,
      scriptLang: node.scriptLang,
    },
  }));

  const edges: FlowEdge[] = Array.from(graph.edges)
    .map((edge: DependencyEdge) => {
      const fromNode = graph.nodes.get(edge.from);
      const toNode = graph.nodes.get(edge.to);
      if (!fromNode || !toNode) return null;

      return {
        id: `${fromNode.relativePath}-${toNode.relativePath}`,
        source: fromNode.relativePath,
        target: toNode.relativePath,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#888' },
      };
    })
    .filter((edge): edge is NonNullable<typeof edge> => edge !== null);

  return { nodes, edges };
}
