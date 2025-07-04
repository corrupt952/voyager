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
import dagre from '@dagrejs/dagre';
import { DependencyGraph, DependencyNode, DependencyEdge } from '@voyager-vue/core';
import { getNodeLabel } from './utils';


const getNodeStyle = (type: string, isSelected: boolean, isExpanded: boolean = false) => {
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

  const expandedStyle = isExpanded && !isSelected
    ? {
        border: '2px solid #4CAF50',
        boxShadow: '0 0 4px 1px rgba(76, 175, 80, 0.3)',
      }
    : {};

  return {
    ...baseStyle,
    ...typeStyle,
    ...selectedStyle,
    ...expandedStyle,
  };
};

const normalizeNodeId = (id: string) => {
  const withoutExt = id.replace(/\.[^/.]+$/, '');
  return withoutExt.replace(/\/index$/, '');
};

export interface DependencyGraphViewerProps {
  graph: DependencyGraph;
  focusNodeId: string;
}


const calculateDirectionalLevels = (nodes: any[], edges: any[], focusNodeId: string): Map<string, number> => {
  const levels = new Map<string, number>();
  
  nodes.forEach(node => {
    levels.set(node.id, 0);
  });
  
  levels.set(focusNodeId, 0);
  
  const dependencyQueue: { id: string; level: number }[] = [{ id: focusNodeId, level: 0 }];
  const dependencyVisited = new Set<string>([focusNodeId]);
  
  while (dependencyQueue.length > 0) {
    const { id, level } = dependencyQueue.shift()!;
    
    edges.forEach(edge => {
      if (edge.source === id && !dependencyVisited.has(edge.target)) {
        dependencyVisited.add(edge.target);
        const newLevel = level - 1;
        const currentLevel = levels.get(edge.target);
        if (currentLevel === undefined || newLevel < currentLevel) {
          levels.set(edge.target, newLevel);
          dependencyQueue.push({ id: edge.target, level: newLevel });
        }
      }
    });
  }
  
  const dependentQueue: { id: string; level: number }[] = [{ id: focusNodeId, level: 0 }];
  const dependentVisited = new Set<string>([focusNodeId]);
  
  while (dependentQueue.length > 0) {
    const { id, level } = dependentQueue.shift()!;
    
    edges.forEach(edge => {
      if (edge.target === id && !dependentVisited.has(edge.source)) {
        dependentVisited.add(edge.source);
        const newLevel = level + 1;
        const currentLevel = levels.get(edge.source);
        if (currentLevel === undefined || newLevel > currentLevel) {
          levels.set(edge.source, newLevel);
          dependentQueue.push({ id: edge.source, level: newLevel });
        }
      }
    });
  }
  
  const minLevel = Math.min(...Array.from(levels.values()).filter(l => l !== undefined));
  nodes.forEach(node => {
    const level = levels.get(node.id);
    if (level !== undefined) {
      levels.set(node.id, level - minLevel);
    } else {
      levels.set(node.id, 999);
    }
  });
  
  return levels;
};

const getLayoutedElements = (nodes: any[], edges: any[], focusNodeId: string) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({
    rankdir: 'LR',
    align: undefined,
    nodesep: 50,
    ranksep: 150,
    edgesep: 25,
    marginx: 50,
    marginy: 50,
    ranker: 'network-simplex',
  });

  const nodeLevels = calculateDirectionalLevels(nodes, edges, focusNodeId);

  nodes.forEach((node) => {
    const labelLength = node.data.label.length;
    const width = Math.max(150, labelLength * 8);
    const height = 50;
    
    const nodeData: any = { 
      width, 
      height,
      label: node.data.label,
    };

    const level = nodeLevels.get(node.id);
    if (level !== undefined) {
      nodeData.rank = level;
    }
    
    dagreGraph.setNode(node.id, nodeData);
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const nodeWidth = nodeWithPosition.width;
    const nodeHeight = nodeWithPosition.height;
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      draggable: true,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        ...node.style,
        ...(node.id === focusNodeId ? { 
          boxShadow: '0 0 12px 4px rgba(66, 184, 131, 0.4)',
          border: '2px solid #42b883',
        } : {}),
      },
    };
  });

  const layoutedEdges = edges.map((edge) => {
    const isDirectlyConnected = edge.source === focusNodeId || edge.target === focusNodeId;
    
    return {
      ...edge,
      type: 'smoothstep',
      style: {
        stroke: isDirectlyConnected ? '#42b883' : '#2196f3',
        strokeWidth: isDirectlyConnected ? 3 : 2,
        opacity: isDirectlyConnected ? 1 : 0.6,
      },
      animated: isDirectlyConnected,
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
};

function extractDependencySubgraph(graph: DependencyGraph, focusNodeId: string, expandedNodes: Set<string>) {
  const relevantNodes = new Set<string>();
  const relevantEdges = new Set<string>();
  const nodeMetadata = new Map<string, { isTerminal: boolean; isExpandable: boolean }>();
  
  const hasParents = (nodeId: string) => Array.from(graph.edges).some(edge => edge.to === nodeId);
  const hasChildren = (nodeId: string) => Array.from(graph.edges).some(edge => edge.from === nodeId);
  
  const focusParents = new Set<string>();
  const focusChildren = new Set<string>();
  
  Array.from(graph.edges).forEach(edge => {
    if (edge.to === focusNodeId) {
      focusParents.add(edge.from);
    }
    if (edge.from === focusNodeId) {
      focusChildren.add(edge.to);
    }
  });
  
  relevantNodes.add(focusNodeId);
  nodeMetadata.set(focusNodeId, {
    isTerminal: false,
    isExpandable: focusParents.size > 0 || focusChildren.size > 0
  });
  
  expandedNodes.forEach(nodeId => {
    if (nodeId === focusNodeId) {
      focusParents.forEach(parent => {
        relevantNodes.add(parent);
        relevantEdges.add(`${parent}-${focusNodeId}`);
        nodeMetadata.set(parent, {
          isTerminal: !hasParents(parent),
          isExpandable: hasParents(parent)
        });
      });
      focusChildren.forEach(child => {
        relevantNodes.add(child);
        relevantEdges.add(`${focusNodeId}-${child}`);
        nodeMetadata.set(child, {
          isTerminal: !hasChildren(child),
          isExpandable: hasChildren(child)
        });
      });
    } else if (focusParents.has(nodeId)) {
      relevantNodes.add(nodeId);
      relevantEdges.add(`${nodeId}-${focusNodeId}`);
      let hasGrandparents = false;
      Array.from(graph.edges).forEach(edge => {
        if (edge.to === nodeId) {
          relevantNodes.add(edge.from);
          relevantEdges.add(`${edge.from}-${nodeId}`);
          hasGrandparents = true;
          nodeMetadata.set(edge.from, {
            isTerminal: !hasParents(edge.from),
            isExpandable: hasParents(edge.from)
          });
        }
      });
      nodeMetadata.set(nodeId, {
        isTerminal: !hasGrandparents,
        isExpandable: hasGrandparents
      });
    } else if (focusChildren.has(nodeId)) {
      relevantNodes.add(nodeId);
      relevantEdges.add(`${focusNodeId}-${nodeId}`);
      let hasGrandchildren = false;
      Array.from(graph.edges).forEach(edge => {
        if (edge.from === nodeId) {
          relevantNodes.add(edge.to);
          relevantEdges.add(`${nodeId}-${edge.to}`);
          hasGrandchildren = true;
          nodeMetadata.set(edge.to, {
            isTerminal: !hasChildren(edge.to),
            isExpandable: hasChildren(edge.to)
          });
        }
      });
      nodeMetadata.set(nodeId, {
        isTerminal: !hasGrandchildren,
        isExpandable: hasGrandchildren
      });
    }
  });

  const nodes = Array.from(relevantNodes)
    .map((nodeId) => {
      const nodeData = Array.from(graph.nodes.values()).find((n: DependencyNode) => n.id === nodeId);
      if (!nodeData) return null;

      const metadata = nodeMetadata.get(nodeId) || { isTerminal: false, isExpandable: true };

      return {
        id: nodeData.relativePath,
        data: {
          label: getNodeLabel(nodeData.relativePath),
          metadata,
        },
        position: { x: 0, y: 0 },
        style: getNodeStyle(nodeData.type, nodeId === focusNodeId, expandedNodes.has(nodeId)),
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

  return { nodes, edges, nodeMetadata };
}

const CustomNode = ({ data }: { data: any }) => {
  const { label, info } = data;
  const scriptType = info?.scriptType;
  const scriptLang = info?.scriptLang;
  const nodeType = info?.type;

  const getApiBadge = () => {
    if (nodeType !== 'vue' || !scriptType || scriptType === 'unknown') return null;
    
    const badgeStyle = {
      padding: '2px 6px',
      borderRadius: '10px',
      fontSize: '9px',
      fontWeight: 'bold',
      marginLeft: '4px',
      display: 'inline-block',
    };

    const badges = [];
    
    if (scriptType === 'composition') {
      badges.push(
        <span key="api" style={{ ...badgeStyle, backgroundColor: '#00BD7E', color: '#fff' }}>
          Composition
        </span>
      );
    } else if (scriptType === 'options') {
      badges.push(
        <span key="api" style={{ ...badgeStyle, backgroundColor: '#FF6B6B', color: '#fff' }}>
          Options
        </span>
      );
    } else if (scriptType === 'mixed') {
      badges.push(
        <span key="api" style={{ ...badgeStyle, backgroundColor: '#FF8C42', color: '#fff' }}>
          Mixed
        </span>
      );
    } else if (scriptType === 'functional') {
      badges.push(
        <span key="api" style={{ ...badgeStyle, backgroundColor: '#4ECDC4', color: '#fff' }}>
          Functional
        </span>
      );
    }
    
    if (scriptLang === 'ts') {
      badges.push(
        <span key="lang" style={{ ...badgeStyle, backgroundColor: '#3178c6', color: '#fff' }}>
          TS
        </span>
      );
    }
    
    return badges;
  };

  return (
    <div className="px-3 py-2 text-center">
      <div>{label}</div>
      <div className="mt-1">
        {getApiBadge()}
      </div>
    </div>
  );
};

const nodeTypes = {
  vueComponent: CustomNode,
  script: CustomNode,
  definition: CustomNode,
};

function DependencyGraphViewerInner({ graph, focusNodeId }: DependencyGraphViewerProps) {
  const [nodes, setNodes] = React.useState<any[]>([]);
  const [edges, setEdges] = React.useState<any[]>([]);
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set([focusNodeId]));
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

  const onNodeClick = React.useCallback((event: React.MouseEvent, node: any) => {
    const nodeId = Array.from(graph.nodes.values()).find((n: DependencyNode) => n.relativePath === node.id)?.id;
    if (!nodeId) return;
    
    if (node.data.metadata?.isTerminal) return;
    
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  }, [graph]);

  React.useEffect(() => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      newExpanded.add(focusNodeId);
      return newExpanded;
    });
  }, [focusNodeId]);

  React.useEffect(() => {
    const focusNode = Array.from(graph.nodes.values()).find((n: DependencyNode) => n.id === focusNodeId);
    if (!focusNode) return;

    const { nodes: initialNodes, edges: initialEdges, nodeMetadata } = extractDependencySubgraph(
      graph,
      focusNodeId,
      expandedNodes
    );

    const enhancedNodes = initialNodes.map((node) => {
      const nodeInfo = Array.from(graph.nodes.values()).find((n: DependencyNode) => n.relativePath === node.id);

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
        padding: 0.1,
        includeHiddenNodes: false,
        minZoom: 0.1,
        maxZoom: 2,
      });
    }, 100);
  }, [graph, focusNodeId, expandedNodes, fitView]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        fitView={true}
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false,
          minZoom: 0.1,
          maxZoom: 2,
        }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnScroll={true}
        panOnScroll={false}
        panOnDrag={true}
        snapToGrid={true}
        snapGrid={[10, 10]}
      >
        <Background />
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
      <div className="fixed bottom-5 right-5 bg-white px-4 py-3 rounded-lg shadow-lg text-xs z-[1000]">
        <div className="font-bold mb-2">Legend</div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
            <span>Vue Component</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
            <span>Script</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded-sm"></div>
            <span>Type Definition</span>
          </div>
          <div style={{ marginTop: '8px', borderTop: '1px solid #e0e0e0', paddingTop: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>API Types</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#00BD7E', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>C</span>
                <span>Composition API</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#FF6B6B', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>O</span>
                <span>Options API</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#FF8C42', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>M</span>
                <span>Mixed API</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#4ECDC4', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>S</span>
                <span>Script Setup</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#3178c6', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>TS</span>
                <span>TypeScript</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
            <strong>Path:</strong> {hoveredNode}
          </div>
          <div>
            <strong>Type:</strong> {nodes.find((n) => n.id === hoveredNode)?.data?.info?.type}
          </div>
          {nodes.find((n) => n.id === hoveredNode)?.data?.info?.type === 'vue' && (
            <>
              <div>
                <strong>API Style:</strong>{' '}
                {nodes.find((n) => n.id === hoveredNode)?.data?.info?.scriptType || 'Options API'}
              </div>
              <div>
                <strong>Language:</strong>{' '}
                {nodes.find((n) => n.id === hoveredNode)?.data?.info?.scriptLang || 'js'}
              </div>
            </>
          )}
          <div>
            <strong>Dependencies:</strong>{' '}
            {nodes.find((n) => n.id === hoveredNode)?.data?.info?.dependencies || 0}
          </div>
          <div>
            <strong>Dependents:</strong>{' '}
            {nodes.find((n) => n.id === hoveredNode)?.data?.info?.dependents || 0}
          </div>
        </div>
      )}
    </div>
  );
}

export function DependencyGraphViewer(props: DependencyGraphViewerProps) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <DependencyGraphViewerInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
