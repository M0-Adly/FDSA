import { useEffect } from 'react';
import { ReactFlow, Controls, Background, type Node, type Edge, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../lib/store';
import { DepartmentNode } from '../lib/crisis-system';

const buildGraph = (root: DepartmentNode | null) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];


  if (!root) return { nodes, edges };

  nodes.push({
    id: root.name,
    data: { label: 'Central System' },
    position: { x: 400, y: 50 },
    type: 'input',
    style: { background: '#1e3a8a', color: 'white', borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold' }
  });

  let districtX = 200;
  let child = root.children.head;
  while (child) {
    const dist = child.data;
    nodes.push({
      id: dist.name,
      data: { label: dist.name },
      position: { x: districtX, y: 150 },
      style: { background: '#2563eb', color: 'white', borderRadius: '8px', padding: '10px 20px' }
    });
    edges.push({ id: `${root.name}-${dist.name}`, source: root.name, target: dist.name, animated: true });

    let deptY = 250;
    let dept = dist.children.head;
    while (dept) {
      const d = dept.data;
      const ongoing = d.ongoingReports.size();
      const pending = d.pendingReports.size();
      
      nodes.push({
        id: d.name,
        data: { label: `${d.name.split(' - ')[0]}\nO: ${ongoing} | P: ${pending}` },
        position: { x: districtX, y: deptY },
        style: { 
          background: ongoing === 3 ? '#b91c1c' : pending > 0 ? '#d97706' : '#059669', 
          color: 'white', 
          borderRadius: '8px', 
          padding: '10px',
          cursor: 'pointer'
        }
      });
      edges.push({ id: `${dist.name}-${d.name}`, source: dist.name, target: d.name });

      deptY += 80;
      dept = dept.next;
    }
    
    districtX += 400;
    child = child.next;
  }

  return { nodes, edges };
};

export function TreeVisualizer() {
  const { system, version, setSelectedNode } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const graph = buildGraph(system.root);
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [system, version, setNodes, setEdges]);

  return (
    <div className="w-full h-[600px] glass-panel p-2">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
