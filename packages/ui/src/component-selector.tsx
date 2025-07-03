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
  const filterNode = (node: DependencyNode) =>
    node.id.toLowerCase().includes(searchQuery.toLowerCase());

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

  return (
    <div className="component-selector">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="category-list">
        {sortedEntries.map(([type, nodes]) => {
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
                    {getNodeLabel(node.id)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .component-selector {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #f8f9fa;
        }

        .search-bar {
          padding: 8px;
          border-bottom: 1px solid #e9ecef;
          background: white;
        }

        .search-bar input {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 13px;
        }

        .category-list {
          flex: 1;
          overflow: auto;
          padding: 8px 0;
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
      `}</style>
    </div>
  );
}
