import React, { useState } from 'react';
import { DependencyNode } from '@voyager-vue/core';
import { getNodeLabel } from './utils';

interface ComponentSelectorProps {
  nodes: Map<string, DependencyNode>;
  onSelect: (nodeId: string) => void;
  selectedNodeId: string | null;
}

// カテゴリの定義
const CATEGORIES = {
  vue: 'Components',
  script: 'Scripts',
  definition: 'Type Definitions',
} as const;

export function ComponentSelector({ nodes, onSelect, selectedNodeId }: ComponentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [apiTypeFilter, setApiTypeFilter] = useState<string>('all');

  // ノードをカテゴリ別に分類
  const categorizedNodes = Array.from(nodes.values()).reduce((acc, node) => {
    if (!acc.has(node.type)) {
      acc.set(node.type, []);
    }
    acc.get(node.type)?.push(node);
    return acc;
  }, new Map<string, DependencyNode[]>());

  // ノードをカテゴリ順にソート
  const orderedCategories = Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[];
  const sortedEntries = orderedCategories
    .map((category) => [category, categorizedNodes.get(category)])
    .filter(([_, nodes]) => nodes && nodes.length > 0) as [string, DependencyNode[]][];

  // 各カテゴリ内でノードを名前でソート
  sortedEntries.forEach(([_, nodes]) => {
    nodes.sort((a, b) => getNodeLabel(a.id).localeCompare(getNodeLabel(b.id)));
  });

  // 検索フィルター
  const filterNode = (node: DependencyNode) => {
    const matchesSearch = node.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesApiType = apiTypeFilter === 'all' || 
      (node.type === 'vue' && node.scriptType === apiTypeFilter);
    return matchesSearch && matchesApiType;
  };

  // カテゴリの折りたたみ状態を切り替える
  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // フォルダの折りたたみ状態を切り替える
  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // ファイルパスからツリー構造を構築
  const buildTree = () => {
    const tree: any = {};
    
    Array.from(nodes.values()).forEach((node) => {
      const parts = node.id.split('/');
      let current = tree;
      
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          if (!current.files) current.files = [];
          current.files.push(node);
        } else {
          if (!current.folders) current.folders = {};
          if (!current.folders[part]) current.folders[part] = {};
          current = current.folders[part];
        }
      });
    });
    
    return tree;
  };

  // ツリーをレンダリング
  const renderTree = (tree: any, path: string = '') => {
    const items: React.ReactElement[] = [];
    
    // フォルダをレンダリング
    if (tree.folders) {
      Object.entries(tree.folders).forEach(([folderName, folderContent]) => {
        const folderPath = path ? `${path}/${folderName}` : folderName;
        const isCollapsed = collapsedFolders.has(folderPath);
        
        items.push(
          <div key={`folder-${folderPath}`} className="tree-folder">
            <div className="tree-folder-header" onClick={() => toggleFolder(folderPath)}>
              <span className="tree-icon">{isCollapsed ? '▶' : '▼'}</span>
              <span className="folder-name">{folderName}</span>
            </div>
            {!isCollapsed && (
              <div className="tree-folder-content">
                {renderTree(folderContent as any, folderPath)}
              </div>
            )}
          </div>
        );
      });
    }
    
    // ファイルをレンダリング
    if (tree.files) {
      tree.files.forEach((node: DependencyNode) => {
        if (!filterNode(node)) return;
        
        items.push(
          <div
            key={`file-${node.id}`}
            className={`tree-file ${selectedNodeId === node.id ? 'selected' : ''}`}
            onClick={() => onSelect(node.id)}
          >
            <div className="node-content">
              <span>{node.id.split('/').pop()}</span>
              {node.type === 'vue' && node.scriptType && node.scriptType !== 'unknown' && (
                <div className="node-badges">
                  <span className={`api-badge ${node.scriptType}`}>
                    {node.scriptType === 'composition' ? 'C' : 
                     node.scriptType === 'options' ? 'O' : 
                     node.scriptType === 'mixed' ? 'M' : 
                     node.scriptType === 'scriptSetup' ? 'S' : ''}
                  </span>
                  {node.scriptLang === 'ts' && (
                    <span className="lang-badge">TS</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      });
    }
    
    return items;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex gap-2 p-2 border-b border-gray-200 bg-white">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
          />
        </div>
        <div>
          <select
            value={apiTypeFilter}
            onChange={(e) => setApiTypeFilter(e.target.value)}
            title="Filter by API type"
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          >
            <option value="all">All APIs</option>
            <option value="composition">Composition</option>
            <option value="options">Options</option>
            <option value="mixed">Mixed</option>
            <option value="scriptSetup">Script Setup</option>
          </select>
        </div>
        <div className="flex gap-1">
          <button
            className={`px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer hover:bg-gray-100 ${viewMode === 'flat' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700'}`}
            onClick={() => setViewMode('flat')}
            title="Flat view"
          >
            ☰
          </button>
          <button
            className={`px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer hover:bg-gray-100 ${viewMode === 'tree' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700'}`}
            onClick={() => setViewMode('tree')}
            title="Tree view"
          >
            🌳
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-2">
        {viewMode === 'flat' ? (
          sortedEntries.map(([type, nodes]) => {
          const filteredNodes = nodes.filter(filterNode);
          if (filteredNodes.length === 0) return null;

          return (
            <div key={type} className="category">
              <div className="category-header" onClick={() => toggleCategory(type)}>
                <div className="category-title">
                  <span className="collapse-icon">
                    {collapsedCategories.has(type) ? '▶' : '▼'}
                  </span>
                  {CATEGORIES[type as keyof typeof CATEGORIES] || type}
                </div>
                <span className="count">{filteredNodes.length}</span>
              </div>
              <div className={`node-list ${collapsedCategories.has(type) ? 'collapsed' : ''}`}>
                {filteredNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`node ${selectedNodeId === node.id ? 'selected' : ''}`}
                    onClick={() => onSelect(node.id)}
                  >
                    <div className="node-content">
                      <span>{getNodeLabel(node.id)}</span>
                      {node.type === 'vue' && node.scriptType && node.scriptType !== 'unknown' && (
                        <div className="node-badges">
                          <span className={`api-badge ${node.scriptType}`}>
                            {node.scriptType === 'composition' ? 'C' : 
                             node.scriptType === 'options' ? 'O' : 
                             node.scriptType === 'mixed' ? 'M' : 
                             node.scriptType === 'scriptSetup' ? 'S' : ''}
                          </span>
                          {node.scriptLang === 'ts' && (
                            <span className="lang-badge">TS</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
        ) : (
          <div className="tree-view">
            {renderTree(buildTree())}
          </div>
        )}
      </div>

      <style>{`
        .tree-view {
          padding: 0 8px;
        }

        .tree-folder {
          margin-bottom: 2px;
        }

        .tree-folder-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          cursor: pointer;
          user-select: none;
          font-size: 13px;
          color: #495057;
        }

        .tree-folder-header:hover {
          background: #e9ecef;
        }

        .tree-icon {
          font-size: 10px;
          color: #666;
        }

        .folder-name {
          font-weight: 500;
        }

        .tree-folder-content {
          margin-left: 16px;
        }

        .tree-file {
          padding: 4px 8px 4px 24px;
          font-size: 13px;
          cursor: pointer;
          color: #495057;
        }

        .tree-file:hover {
          background: #e9ecef;
        }

        .tree-file.selected {
          background: #dee2e6;
          color: #000;
        }

        .category {
          margin-bottom: 16px;
        }

        .category-header {
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 500;
          color: #495057;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          user-select: none;
        }

        .category-header:hover {
          background: #e9ecef;
        }

        .category-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .collapse-icon {
          font-size: 10px;
          color: #666;
        }

        .count {
          background: #e9ecef;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
          color: #666;
        }

        .node-list {
          padding: 4px 0;
          transition: max-height 0.2s ease-out;
          overflow: hidden;
        }

        .node-list.collapsed {
          max-height: 0;
          padding: 0;
        }

        .node {
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
          color: #495057;
        }

        .node:hover {
          background: #e9ecef;
        }

        .node.selected {
          background: #dee2e6;
          color: #000;
        }

        .node-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .node-badges {
          display: flex;
          gap: 4px;
        }

        .api-badge {
          padding: 1px 4px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: bold;
          color: white;
        }

        .api-badge.composition {
          background: #00BD7E;
        }

        .api-badge.options {
          background: #FF6B6B;
        }

        .api-badge.mixed {
          background: #FF8C42;
        }

        .api-badge.scriptSetup {
          background: #4ECDC4;
        }

        .lang-badge {
          padding: 1px 4px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: bold;
          background: #3178c6;
          color: white;
        }

        .api-filter {
          flex-shrink: 0;
        }

        .api-filter select {
          padding: 6px 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 13px;
          background: white;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
