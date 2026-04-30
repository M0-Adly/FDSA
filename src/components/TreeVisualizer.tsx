import React, { useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom Node to display department stats
const CustomNode = ({ data }: any) => {
  const isCenter = data.type === 'center';
  const isDistrict = data.type === 'district';
  
  let bgClass = 'bg-white/5 border-white/10';
  if (isCenter) bgClass = 'bg-indigo-500/20 border-indigo-500/50';
  if (isDistrict) bgClass = 'bg-emerald-500/20 border-emerald-500/50';
  if (data.isSelected) bgClass = 'bg-blue-500/30 border-blue-400 ring-2 ring-blue-500';

  return (
    <div className={`px-4 py-2 rounded-xl border backdrop-blur-md shadow-xl transition-all ${bgClass} cursor-pointer`}>
      <Handle type="target" position={Position.Top} className="!bg-white/30 !w-2 !h-2 border-none" />
      <div className="text-center">
        <div className="font-bold text-xs text-white/90">{data.label}</div>
        {!isCenter && !isDistrict && (
          <div className="flex justify-center gap-2 mt-2">
            <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/30 text-blue-300 rounded font-black border border-blue-500/30">O:{data.ongoing}</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/30 text-amber-300 rounded font-black border border-amber-500/30">P:{data.pending}</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-white/30 !w-2 !h-2 border-none" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export function TreeVisualizer({ rootNode, selectedDeptId, onNodeClick }: any) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const n: any[] = [];
    const e: any[] = [];
    
    // Root Node
    n.push({
      id: 'root',
      type: 'custom',
      position: { x: 400, y: 50 },
      data: { label: rootNode.name_en, type: 'center' }
    });

    // Districts and Departments
    const districts = rootNode.children.toArray();
    districts.forEach((dist: any, dIndex: number) => {
      const distId = `dist-${dist.id}`;
      const dx = 150 + dIndex * 500;
      
      n.push({
        id: distId,
        type: 'custom',
        position: { x: dx, y: 150 },
        data: { label: dist.name_en, type: 'district' }
      });
      
      e.push({
        id: `e-root-${distId}`,
        source: 'root',
        target: distId,
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 }
      });

      const depts = dist.children.toArray();
      depts.forEach((dept: any, pIndex: number) => {
        const deptId = `dept-${dept.id}`;
        n.push({
          id: deptId,
          type: 'custom',
          position: { x: dx - 250 + pIndex * 110, y: 300 + (pIndex % 2) * 60 },
          data: { 
            label: dept.name_en, 
            type: 'dept',
            ongoing: dept.ongoingReports.size(),
            pending: dept.pendingReports.size(),
            deptData: dept,
            isSelected: selectedDeptId === dept.id
          }
        });

        e.push({
          id: `e-${distId}-${deptId}`,
          source: distId,
          target: deptId,
          style: { stroke: 'rgba(255,255,255,0.1)' }
        });
      });
    });

    return { nodes: n, edges: e };
  }, [rootNode, selectedDeptId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when props change
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          if (node.data.type === 'dept' && onNodeClick) {
            onNodeClick(node.data.deptData);
          }
        }}
        fitView
      >
        <Background color="#ffffff" gap={16} size={1} style={{ opacity: 0.05 }} />
      </ReactFlow>
    </div>
  );
}
