import React, { useState, useMemo } from 'react';
import { DependencyNode } from '@voyager-vue/core';
import { getNodeLabel } from '../utils';

interface SidebarProps {
  nodes: Map<string, DependencyNode>;
  onSelect: (nodeId: string) => void;
  selectedNodeId: string | null;
  onHome?: () => void;
}

const CATEGORIES = {
  vue: 'Components',
  script: 'Scripts', 
  definition: 'Type Definitions',
} as const;

type SortOption = 'name' | 'dependencies' | 'type' | 'complexity';
type FilterOption = 'all' | 'vue' | 'script' | 'definition' | 'healthy' | 'warning' | 'error';


export function Sidebar({ nodes, onSelect, selectedNodeId, onHome }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  // Enhanced component analysis with health scoring
  const componentAnalysis = useMemo(() => {
    const nodesArray = Array.from(nodes.values());
    const analysis = new Map<string, {
      node: DependencyNode;
      health: 'healthy' | 'warning' | 'error';
      dependencyCount: number;
      complexity: number;
      issues: string[];
    }>();

    nodesArray.forEach(node => {
      const importCount = node.dependencies?.imports?.length || 0;
      const importedByCount = node.dependencies?.importedBy?.length || 0;
      const dependencyCount = importCount + importedByCount;
      const issues: string[] = [];
      
      // Health scoring logic
      let health: 'healthy' | 'warning' | 'error' = 'healthy';
      
      // Check for high coupling (lots of imports)
      if (importCount > 10) {
        issues.push('High coupling');
        health = 'warning';
      }
      
      // Check for very high coupling
      if (importCount > 20) {
        health = 'error';
      }
      
      // Check for potential circular dependencies (simplified)
      if (node.id.includes('index') && importCount > 5) {
        issues.push('Potential barrel export');
        health = health === 'healthy' ? 'warning' : health;
      }
      
      // Check for unused components (not imported by anyone)
      if (importedByCount === 0 && node.type === 'vue') {
        issues.push('Unused component');
        health = health === 'healthy' ? 'warning' : health;
      }
      
      // Calculate complexity score (simplified)
      const complexity = Math.min(100, dependencyCount * 3 + (node.id.length > 50 ? 10 : 0));
      
      analysis.set(node.id, {
        node,
        health,
        dependencyCount,
        complexity,
        issues
      });
    });

    return analysis;
  }, [nodes]);


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

  // Enhanced filtering and sorting
  const filterAndSortNodes = (nodes: DependencyNode[]) => {
    let filteredNodes = nodes.filter(node => {
      const analysis = componentAnalysis.get(node.id);
      if (!analysis) return false;
      
      // Search filter
      const matchesSearch = node.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Type filter
      const matchesType = filterBy === 'all' || 
        node.type === filterBy ||
        (filterBy === 'healthy' && analysis.health === 'healthy') ||
        (filterBy === 'warning' && analysis.health === 'warning') ||
        (filterBy === 'error' && analysis.health === 'error');
      
      return matchesSearch && matchesType;
    });

    // Sorting
    filteredNodes.sort((a, b) => {
      const analysisA = componentAnalysis.get(a.id);
      const analysisB = componentAnalysis.get(b.id);
      
      if (!analysisA || !analysisB) return 0;
      
      switch (sortBy) {
        case 'name':
          return getNodeLabel(a.id).localeCompare(getNodeLabel(b.id));
        case 'dependencies':
          return analysisB.dependencyCount - analysisA.dependencyCount;
        case 'complexity':
          return analysisB.complexity - analysisA.complexity;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filteredNodes;
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
        const analysis = componentAnalysis.get(node.id);
        if (!analysis) return;
        
        // Apply filtering
        const matchesSearch = node.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterBy === 'all' || 
          node.type === filterBy ||
          (filterBy === 'healthy' && analysis.health === 'healthy') ||
          (filterBy === 'warning' && analysis.health === 'warning') ||
          (filterBy === 'error' && analysis.health === 'error');
        
        if (!matchesSearch || !matchesType) return;
        
        items.push(
          <div
            key={`file-${node.id}`}
            className={`px-2 py-1.5 pl-6 text-sm cursor-pointer rounded hover:bg-gray-100 group ${
              selectedNodeId === node.id ? 'bg-blue-50 text-blue-900 border-l-2 border-blue-500' : 'text-gray-700'
            }`}
            onClick={() => onSelect(node.id)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Health indicator */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  analysis.health === 'healthy' ? 'bg-green-500' :
                  analysis.health === 'warning' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <span className="truncate">{node.id.split('/').pop()}</span>
                {(analysis.node.dependencies?.imports?.length > 0 || analysis.node.dependencies?.importedBy?.length > 0) && (
                  <span className="text-xs text-gray-500">
                    ({analysis.node.dependencies?.imports?.length || 0}{analysis.node.dependencies?.importedBy?.length > 0 ? `→${analysis.node.dependencies.importedBy.length}` : ''})
                  </span>
                )}
              </div>
              
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {node.type === 'vue' && node.scriptType && node.scriptType !== 'unknown' && (
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
                )}
                {node.scriptLang === 'ts' && (
                  <span className="px-1 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">
                    TS
                  </span>
                )}
              </div>
            </div>
            
            {/* Issues tooltip on hover */}
            {analysis.issues.length > 0 && (
              <div className="text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {analysis.issues.join(', ')}
              </div>
            )}
          </div>
        );
      });
    }
    
    return items;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with branding */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button 
            onClick={onHome}
            className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-1 transition-colors"
            title="Back to dashboard"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Voyager</h1>
              <p className="text-xs text-gray-500">Dependency Explorer</p>
            </div>
          </button>
        </div>
      </div>


      {/* Search and Controls */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 space-y-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filters and View Controls */}
        <div className="flex gap-2">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="all">All Files</option>
            <option value="vue">Vue Components</option>
            <option value="script">Scripts</option>
            <option value="definition">Types</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warnings</option>
            <option value="error">Critical</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="name">Name</option>
            <option value="dependencies">Dependencies</option>
            <option value="complexity">Complexity</option>
            <option value="type">Type</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1">
          <button
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              viewMode === 'flat' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setViewMode('flat')}
          >
            List View
          </button>
          <button
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              viewMode === 'tree' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setViewMode('tree')}
          >
            Tree View
          </button>
        </div>
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'flat' ? (
          <div className="p-2">
            {sortedEntries.map(([type, nodes]) => {
              const filteredNodes = filterAndSortNodes(nodes);
              if (filteredNodes.length === 0) return null;

              return (
                <div key={type} className="mb-4">
                  <div 
                    className="px-2 py-2 text-xs font-semibold text-gray-700 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100 rounded"
                    onClick={() => toggleCategory(type)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {collapsedCategories.has(type) ? '▶' : '▼'}
                      </span>
                      {CATEGORIES[type as keyof typeof CATEGORIES] || type}
                    </div>
                    <span className="bg-gray-200 px-2 py-0.5 rounded-full text-xs text-gray-600">
                      {filteredNodes.length}
                    </span>
                  </div>
                  <div className={`transition-all overflow-hidden ${
                    collapsedCategories.has(type) ? 'max-h-0' : ''
                  }`}>
                    {filteredNodes.map((node) => {
                      const analysis = componentAnalysis.get(node.id);
                      if (!analysis) return null;

                      return (
                        <div
                          key={node.id}
                          className={`px-2 py-2 text-sm cursor-pointer rounded hover:bg-gray-100 group ${
                            selectedNodeId === node.id ? 'bg-blue-50 text-blue-900 border-l-2 border-blue-500' : 'text-gray-700'
                          }`}
                          onClick={() => onSelect(node.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Health indicator */}
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                analysis.health === 'healthy' ? 'bg-green-500' :
                                analysis.health === 'warning' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{getNodeLabel(node.id)}</div>
                                <div className="text-xs text-gray-500">
                                  {analysis.node.dependencies?.imports?.length > 0 && `${analysis.node.dependencies.imports.length} imports`}
                                  {analysis.node.dependencies?.importedBy?.length > 0 && (analysis.node.dependencies?.imports?.length > 0 ? ' • ' : '') + `${analysis.node.dependencies.importedBy.length} used by`}
                                  {analysis.issues.length > 0 && ` • ${analysis.issues.join(', ')}`}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {node.type === 'vue' && node.scriptType && node.scriptType !== 'unknown' && (
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
                              )}
                              {node.scriptLang === 'ts' && (
                                <span className="px-1 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">
                                  TS
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-2">
            {renderTree(buildTree())}
          </div>
        )}
      </div>
    </div>
  );
}