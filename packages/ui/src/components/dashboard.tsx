import React, { useMemo } from 'react';
import { DependencyNode } from '@voyager-vue/core';

interface DashboardProps {
  nodes: Map<string, DependencyNode>;
}

interface ComponentStats {
  totalComponents: number;
  healthyComponents: number;
  warningComponents: number;
  errorComponents: number;
  vueComponents: number;
  scriptFiles: number;
  typeDefinitions: number;
  orphanedComponents: number;
  highCouplingComponents: number;
  averageDependencies: number;
}

export function Dashboard({ nodes }: DashboardProps) {
  const stats = useMemo((): ComponentStats => {
    const nodesArray = Array.from(nodes.values());
    let healthyComponents = 0;
    let warningComponents = 0; 
    let errorComponents = 0;
    let orphanedComponents = 0;
    let highCouplingComponents = 0;
    let totalDependencies = 0;

    nodesArray.forEach(node => {
      const importCount = node.dependencies?.imports?.length || 0;
      const importedByCount = node.dependencies?.importedBy?.length || 0;
      totalDependencies += importCount + importedByCount;
      
      // Health scoring logic (same as sidebar)
      let health: 'healthy' | 'warning' | 'error' = 'healthy';
      
      if (importCount > 10) {
        health = 'warning';
      }
      
      if (importCount > 20) {
        health = 'error';
      }
      
      if (node.id.includes('index') && importCount > 5) {
        health = health === 'healthy' ? 'warning' : health;
      }
      
      if (importedByCount === 0 && node.type === 'vue') {
        health = health === 'healthy' ? 'warning' : health;
        orphanedComponents++;
      }
      
      if (importCount > 10) {
        highCouplingComponents++;
      }
      
      if (health === 'healthy') healthyComponents++;
      else if (health === 'warning') warningComponents++;
      else errorComponents++;
    });

    return {
      totalComponents: nodesArray.length,
      healthyComponents,
      warningComponents,
      errorComponents,
      vueComponents: nodesArray.filter(n => n.type === 'vue').length,
      scriptFiles: nodesArray.filter(n => n.type === 'script').length,
      typeDefinitions: nodesArray.filter(n => n.type === 'definition').length,
      orphanedComponents,
      highCouplingComponents,
      averageDependencies: nodesArray.length > 0 ? Math.round(totalDependencies / nodesArray.length) : 0,
    };
  }, [nodes]);

  return (
    <div className="h-full bg-gray-50 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vue Dependency Explorer</h1>
          <p className="text-gray-600">Visualize and analyze your Vue.js component dependencies</p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-600">{stats.totalComponents}</div>
                <div className="text-sm text-gray-600">Total Files</div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">{stats.healthyComponents}</div>
                <div className="text-sm text-gray-600">Healthy</div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-yellow-600">{stats.warningComponents}</div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-600">{stats.errorComponents}</div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">File Types</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Vue Components</span>
                <span className="font-medium text-green-600">{stats.vueComponents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Script Files</span>
                <span className="font-medium text-blue-600">{stats.scriptFiles}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Type Definitions</span>
                <span className="font-medium text-purple-600">{stats.typeDefinitions}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Code Quality</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Orphaned Components</span>
                <span className="font-medium text-orange-600">{stats.orphanedComponents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">High Coupling</span>
                <span className="font-medium text-red-600">{stats.highCouplingComponents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Dependencies</span>
                <span className="font-medium text-gray-900">{stats.averageDependencies}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Overview */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Overview</h3>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div className="flex h-full rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${(stats.healthyComponents / stats.totalComponents) * 100}%` }}
              />
              <div 
                className="bg-yellow-500 h-full transition-all duration-300"
                style={{ width: `${(stats.warningComponents / stats.totalComponents) * 100}%` }}
              />
              <div 
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${(stats.errorComponents / stats.totalComponents) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Healthy: {Math.round((stats.healthyComponents / stats.totalComponents) * 100)}%</span>
            <span>Warnings: {Math.round((stats.warningComponents / stats.totalComponents) * 100)}%</span>
            <span>Critical: {Math.round((stats.errorComponents / stats.totalComponents) * 100)}%</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Select a component from the sidebar to view its dependency graph</p>
          <div className="flex justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}