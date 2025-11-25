import { useMemo } from 'react';
import ReactFlow, {
	Handle,
	Position,
	MarkerType,
	Background,
	Controls,
	type NodeProps,
	type Node,
	type Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { formatDistanceToNow } from 'date-fns';
import { GitCommit } from 'lucide-react';
import { cn } from '@/lib/utils';
import dagre from 'dagre';

// --- CUSTOM NODE COMPONENT ---
const CheckpointNode = ({ data, selected }: NodeProps) => {
	return (
		<div className={cn(
			"px-4 py-3 rounded-xl shadow-sm border min-w-[180px] transition-all duration-300 bg-card group",
			// SELECTION STATE
			selected
				? "border-primary ring-2 ring-primary/20 shadow-md scale-105"
				: "border-border hover:border-primary/50 hover:shadow-md",
			// ACTIVE STATE (Current Checkpoint)
			data.isCurrent ? "ring-1 ring-primary border-primary bg-primary/5" : ""
		)}>
			{/* Connector Handles */}
			<Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2 !h-2 border-2 border-background" />

			<div className="flex items-center gap-3 mb-2">
				<div className={cn(
					"flex items-center justify-center w-6 h-6 rounded-md transition-colors",
					data.isCurrent
						? "bg-primary text-primary-foreground shadow-sm"
						: "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
				)}>
					<GitCommit className="w-3.5 h-3.5" />
				</div>
				<span className={cn(
					"text-xs font-bold truncate max-w-[110px] tracking-tight",
					data.isCurrent ? "text-primary" : "text-card-foreground group-hover:text-foreground"
				)}>
          {data.label}
        </span>
			</div>

			<div className="flex items-center justify-between border-t border-border pt-2 mt-1">
				<div className="text-[10px] text-muted-foreground font-medium font-mono uppercase tracking-wider">
					{formatDistanceToNow(data.timestamp, { addSuffix: true })}
				</div>
				{data.isCurrent && (
					<span className="flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]" />
				)}
			</div>

			<Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-2 !h-2 border-2 border-background" />
		</div>
	);
};

const nodeTypes = { checkpoint: CheckpointNode };

// --- LAYOUT ALGORITHM ---
const nodeWidth = 240;
const nodeHeight = 120;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	dagreGraph.setGraph({ rankdir: 'LR' }); // Left to Right

	nodes.forEach((node) => {
		dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
	});

	edges.forEach((edge) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	dagre.layout(dagreGraph);

	nodes.forEach((node) => {
		const nodeWithPosition = dagreGraph.node(node.id);
		node.position = {
			x: nodeWithPosition.x - nodeWidth / 2,
			y: nodeWithPosition.y - nodeHeight / 2,
		};
		node.targetPosition = Position.Left;
		node.sourcePosition = Position.Right;
	});

	return { nodes, edges };
};

// --- MAIN COMPONENT ---
interface TimelineProps {
	checkpoints: any[];
	currentCheckpointId: string | null;
	onRestore: (checkpoint: any) => void;
}

export function Timeline({ checkpoints, currentCheckpointId, onRestore }: TimelineProps) {

	const { nodes, edges } = useMemo(() => {
		if (!checkpoints.length) return { nodes: [], edges: [] };

		const rawNodes: Node[] = checkpoints.map((cp) => ({
			id: cp.id,
			type: 'checkpoint',
			position: { x: 0, y: 0 },
			data: {
				label: cp.description,
				timestamp: cp.timestamp,
				isCurrent: cp.id === currentCheckpointId
			},
		}));

		const rawEdges: Edge[] = checkpoints
			.filter(cp => cp.parentId)
			.map(cp => ({
				id: `e-${cp.parentId}-${cp.id}`,
				source: cp.parentId!,
				target: cp.id,
				type: 'smoothstep',
				animated: false,
				markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--muted-foreground)' }, // The arrow tip
				style: { stroke: 'var(--border)', strokeWidth: 2 }, // The line itself
			}));

		return getLayoutedElements(rawNodes, rawEdges);

	}, [checkpoints, currentCheckpointId]);

	return (
		<div className="w-full h-full bg-muted/10 rounded-xl border border-border overflow-hidden relative group">

			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				onNodeClick={(_, node) => {
					const cp = checkpoints.find(c => c.id === node.id);
					if (cp) onRestore(cp);
				}}
				fitView
				minZoom={0.2}
				maxZoom={1.5}
				proOptions={{ hideAttribution: true }}
			>
				{/* NOTE: ReactFlow 'color' prop expects a hex/rgba string for the dots.
            'var(--muted-foreground)' might not render dots in some browsers inside Canvas.
            Using a class-based opacity on a hardcoded color is safer, or just minimal styling.
        */}
				<Background gap={24} color="#888" className="opacity-[0.15]" size={1} />

				<Controls
					className="bg-card border-border shadow-sm rounded-lg overflow-hidden m-2 text-muted-foreground"
					showInteractive={false}
				/>
			</ReactFlow>
		</div>
	);
}