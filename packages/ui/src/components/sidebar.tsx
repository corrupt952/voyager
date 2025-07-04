import React, { useState } from 'react';
import { DependencyNode } from '@voyager-vue/core';
import { getNodeLabel } from '../utils';

interface SidebarProps {
  nodes: Map<string, DependencyNode>;
  onSelect: (nodeId: string) => void;
  selectedNodeId: string | null;
}

const CATEGORIES = {
  vue: 'Components',
  script: 'Scripts',
  definition: 'Type Definitions',
} as const;

export function Sidebar({ nodes, onSelect, selectedNodeId }: SidebarProps) {
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
      const parts = node.relativePath.split('/');
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
          <div key={`folder-${folderPath}`} className="mb-0.5">
            <div 
              className="flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none text-sm text-gray-600 hover:bg-gray-100 rounded"
              onClick={() => toggleFolder(folderPath)}
            >
              <span className="text-xs text-gray-500">
                {isCollapsed ? '▶' : '▼'}
              </span>
              <span className="font-medium">{folderName}</span>
            </div>
            {!isCollapsed && (
              <div className="ml-4">
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
            className={`px-2 py-1 pl-6 text-sm cursor-pointer rounded hover:bg-gray-100 ${
              selectedNodeId === node.id ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
            }`}
            onClick={() => onSelect(node.id)}
          >
            <div className="flex justify-between items-center">
              <span>{node.id.split('/').pop()}</span>
              {node.type === 'vue' && node.scriptType && node.scriptType !== 'unknown' && (
                <div className="flex gap-1">
                  <span className={`px-1 py-0.5 rounded text-xs font-bold text-white ${
                    node.scriptType === 'composition' ? 'bg-green-500' :
                    node.scriptType === 'options' ? 'bg-red-500' :
                    node.scriptType === 'mixed' ? 'bg-orange-500' :
                    node.scriptType === 'functional' ? 'bg-cyan-500' :
                    node.scriptType === 'class' ? 'bg-purple-500' : ''
                  }`}>
                    {node.scriptType === 'composition' ? 'C' : 
                     node.scriptType === 'options' ? 'O' : 
                     node.scriptType === 'mixed' ? 'M' : 
                     node.scriptType === 'functional' ? 'F' : 
                     node.scriptType === 'class' ? 'Cl' : ''}
                  </span>
                  {node.scriptLang === 'ts' && (
                    <span className="px-1 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">
                      TS
                    </span>
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
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <select
            value={apiTypeFilter}
            onChange={(e) => setApiTypeFilter(e.target.value)}
            title="Filter by API type"
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="all">All APIs</option>
            <option value="composition">Composition</option>
            <option value="options">Options</option>
            <option value="mixed">Mixed</option>
            <option value="functional">Functional</option>
          </select>
        </div>
        <div className="flex gap-1">
          <button
            className={`px-2 py-1 border rounded text-xs cursor-pointer transition-colors ${
              viewMode === 'flat' 
                ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
            onClick={() => setViewMode('flat')}
            title="Flat view"
          >
            ☰
          </button>
          <button
            className={`px-2 py-1 border rounded text-xs cursor-pointer transition-colors ${
              viewMode === 'tree' 
                ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
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
              <div key={type} className="mb-4">
                <div 
                  className="px-3 py-1 text-xs font-medium text-gray-600 flex items-center justify-between uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => toggleCategory(type)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">
                      {collapsedCategories.has(type) ? '▶' : '▼'}
                    </span>
                    {CATEGORIES[type as keyof typeof CATEGORIES] || type}
                  </div>
                  <span className="bg-gray-200 px-1.5 py-0.5 rounded-full text-xs text-gray-600">
                    {filteredNodes.length}
                  </span>
                </div>
                <div className={`py-1 transition-all overflow-hidden ${
                  collapsedCategories.has(type) ? 'max-h-0' : ''
                }`}>
                  {filteredNodes.map((node) => (
                    <div
                      key={node.id}
                      className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 ${
                        selectedNodeId === node.id ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
                      }`}
                      onClick={() => onSelect(node.id)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{getNodeLabel(node.id)}</span>
                        {node.type === 'vue' && node.scriptType && node.scriptType !== 'unknown' && (
                          <div className="flex gap-1">
                            <span className={`px-1 py-0.5 rounded text-xs font-bold text-white ${
                              node.scriptType === 'composition' ? 'bg-green-500' :
                              node.scriptType === 'options' ? 'bg-red-500' :
                              node.scriptType === 'mixed' ? 'bg-orange-500' :
                              node.scriptType === 'functional' ? 'bg-cyan-500' :
                              node.scriptType === 'class' ? 'bg-purple-500' : ''
                            }`}>
                              {node.scriptType === 'composition' ? 'C' : 
                               node.scriptType === 'options' ? 'O' : 
                               node.scriptType === 'mixed' ? 'M' : 
                               node.scriptType === 'functional' ? 'F' : 
                               node.scriptType === 'class' ? 'Cl' : ''}
                            </span>
                            {node.scriptLang === 'ts' && (
                              <span className="px-1 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">
                                TS
                              </span>
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
          <div className="px-2">
            {renderTree(buildTree())}
          </div>
        )}
      </div>
    </div>
  );
}