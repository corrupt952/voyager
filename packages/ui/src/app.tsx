import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { DependencyGraphViewer } from './graph';
import { ComponentSelector } from './component-selector';
import '@xyflow/react/dist/style.css';
import { DependencyGraph } from '@voyager-vue/core';

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
    const node = nodes.find((n) => n.id.endsWith(hash));
    return node?.id || null;
  };

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(getInitialNodeId());

  // コンポーネント選択時の処理
  const handleNodeSelect = (nodeId: string) => {
    const node = Array.from(window.__GRAPH_DATA__.nodes.values()).find((n) => n.id === nodeId);
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
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div style={{ width: '280px', borderRight: '1px solid #dee2e6' }}>
        <ComponentSelector
          nodes={graphData.nodes}
          onSelect={handleNodeSelect}
          selectedNodeId={selectedNodeId}
        />
      </div>
      <div style={{ flex: 1 }}>
        {selectedNodeId ? (
          <DependencyGraphViewer graph={graphData} focusNodeId={selectedNodeId} />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              background: '#f8f9fa',
            }}
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
