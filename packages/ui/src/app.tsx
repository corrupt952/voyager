import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { DependencyGraphViewer } from './graph';
import { ComponentSelector } from './component-selector';
import '@xyflow/react/dist/style.css';
import './tailwind.css';
import { DependencyGraph, DependencyNode } from '@voyager-vue/core';

// グローバル変数からグラフデータを取得
declare global {
  interface Window {
    __GRAPH_DATA__: DependencyGraph;
  }
}

function App() {
  // URLハッシュからコンポーネントIDを取得
  const getInitialNodeId = () => {
    const hash = window.location.hash.slice(1); // '#'を除去
    if (!hash) return null;

    // グラフデータ内に存在するノードかチェック
    const nodes = Array.from(window.__GRAPH_DATA__.nodes.values());
    const node = nodes.find((n: DependencyNode) => n.id.endsWith(hash));
    return node?.id || null;
  };

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(getInitialNodeId());

  // コンポーネント選択時の処理
  const handleNodeSelect = (nodeId: string) => {
    const node = Array.from(window.__GRAPH_DATA__.nodes.values()).find((n: DependencyNode) => n.id === nodeId);
    if (!node) return;

    window.location.hash = node.relativePath;
    setSelectedNodeId(nodeId);
  };

  // URLハッシュの変更を監視
  useEffect(() => {
    const handleHashChange = () => {
      const newNodeId = getInitialNodeId();
      if (newNodeId !== selectedNodeId) {
        setSelectedNodeId(newNodeId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [selectedNodeId]);

  // グラフデータを正規化
  const graphData = {
    nodes: window.__GRAPH_DATA__.nodes,
    edges: window.__GRAPH_DATA__.edges,
  };

  return (
    <div className="flex w-full h-full">
      <div className="w-[280px] border-r border-gray-300">
        <ComponentSelector
          nodes={graphData.nodes}
          onSelect={handleNodeSelect}
          selectedNodeId={selectedNodeId}
        />
      </div>
      <div className="flex-1">
        {selectedNodeId ? (
          <DependencyGraphViewer graph={graphData} focusNodeId={selectedNodeId} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600 bg-gray-50"
          >
            左のエクスプローラーからコンポーネントを選択してください
          </div>
        )}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
