import React, { useEffect, useState } from 'react'
import { Plus, GitBranch, Clock, GitMerge, Trash2, Maximize2, MoreVertical, Pencil } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { openDB } from 'idb'
import { Timeline } from '../Timeline'
import { useStore } from '@/lib/store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Content } from '@tiptap/core'
import type { Fragment, Node } from '@tiptap/pm/model'

export interface Snapshot {
	id: string;
	timestamp: number;
	description: string;
	content: Content | Fragment | Node
	parentId: string | null
}

interface HistoryViewProps {
	activeFileId: string | null
	isCollapsed: boolean
	onRename: (id: string, name: string) => void
	onWeave: (snap: Snapshot) => void
}

const DB_VERSION = 4

export function HistoryView({ activeFileId, isCollapsed, onRename, onWeave }: HistoryViewProps) {
	const [snapshots, setSnapshots] = useState<Snapshot[]>([])
	const [newSnapshotName, setNewSnapshotName] = useState('')
	const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
	const [currentParentId, setCurrentParentId] = useState<string | null>(null)
	const [isGraphExpanded, setIsGraphExpanded] = useState(false)
	const editor = useStore(state => state.editor)

	const getDBName = () => `draftless-snapshots-${activeFileId}`
	const initDB = async () => {
		return openDB(getDBName(), DB_VERSION, {
			upgrade(db) {
				if (db.objectStoreNames.contains('snapshots')) db.deleteObjectStore('snapshots')
				db.createObjectStore('snapshots', { keyPath: 'id' })
			},
		})
	}

	useEffect(() => {
		let isMounted = true
		const loadSnapshots = async () => {
			if (!activeFileId) { if (isMounted) setSnapshots([]); return }
			try {
				const db = await initDB()
				const all = await db.getAll('snapshots')
				if (isMounted) setSnapshots(all.sort((a: Snapshot, b: Snapshot) => b.timestamp - a.timestamp))
			} catch (err) { console.error(err) }
		}
		loadSnapshots()
		return () => { isMounted = false }
	}, [activeFileId])

	const handleSaveSnapshot = async () => {
		if (!editor || !newSnapshotName) return
		const content = editor.getJSON()
		const id = crypto.randomUUID()
		const newSnap: Snapshot = { id, timestamp: Date.now(), description: newSnapshotName, content, parentId: currentParentId }
		const db = await initDB()
		await db.put('snapshots', newSnap)
		setSnapshots([newSnap, ...snapshots])
		setNewSnapshotName('')
		setCurrentParentId(id)
	}

	const handleRestore = (snap: Snapshot) => {
		if (!editor || editor.isDestroyed) return
		editor.commands.setContent(snap.content)
		setCurrentParentId(snap.id)
	}

	const handleDeleteSnapshot = async (e: React.MouseEvent, id: string) => {
		e.preventDefault(); e.stopPropagation()
		if (!confirm("Delete this checkpoint?")) return
		const db = await initDB()
		await db.delete('snapshots', id)
		setSnapshots(prev => prev.filter(s => s.id !== id))
		if (currentParentId === id) setCurrentParentId(null)
	}

	// 1. Collapsed View
	if (isCollapsed) {
		return (
			<div className="flex flex-col items-center pt-4 gap-3 w-full">
				<TooltipProvider delayDuration={0}>
					{snapshots.slice(0, 8).map((snap) => (
						<Tooltip key={snap.id}>
							<TooltipTrigger asChild>
								<div className={`w-2.5 h-2.5 rounded-full transition-all hover:scale-150 cursor-pointer ${snap.id === currentParentId ? 'bg-sidebar-primary ring-2 ring-sidebar-primary ring-offset-2' : 'bg-sidebar-border hover:bg-sidebar-primary/50'}`} onClick={() => handleRestore(snap)} />
							</TooltipTrigger>
							<TooltipContent side="right">
								<div className="text-xs font-bold">{snap.description}</div>
								<div className="text-[10px] text-muted-foreground">{formatDistanceToNow(snap.timestamp, { addSuffix: true })}</div>
							</TooltipContent>
						</Tooltip>
					))}
				</TooltipProvider>
			</div>
		)
	}

	// 2. Empty State
	if (!activeFileId) {
		return <div className="p-4 text-xs text-center text-muted-foreground h-full flex items-center justify-center">Select a chapter to view history</div>
	}

	// 3. Expanded View
	return (
		<div className="flex flex-col h-full bg-sidebar-accent/10">
			<div className="p-4 space-y-4 border-b border-sidebar-border shrink-0 bg-sidebar">
				<div className="flex gap-2">
					<Input placeholder="Checkpoint..." value={newSnapshotName} onChange={(e) => setNewSnapshotName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshot()} className="h-8 bg-sidebar-accent/50 border-sidebar-border text-xs" />
					<Button onClick={handleSaveSnapshot} disabled={!newSnapshotName} size="icon" className="h-8 w-8 bg-sidebar-primary text-sidebar-primary-foreground shrink-0"><Plus className="w-4 h-4" /></Button>
				</div>
				<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')} className="w-full">
					<TabsList className="grid w-full grid-cols-2 bg-sidebar-accent/50 h-8 border border-sidebar-border">
						<TabsTrigger value="list" className="text-xs h-6">List</TabsTrigger>
						<TabsTrigger value="map" className="text-xs h-6">Graph</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			<div className="flex-1 min-h-0 relative">
				{viewMode === 'list' ? (
					<ScrollArea className="h-full">
						<div className="p-3 flex flex-col gap-2">
							{snapshots.length === 0 && (
								<div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
									<GitBranch className="w-8 h-8 text-muted-foreground mb-3" />
									<p className="text-xs font-medium">No checkpoints</p>
								</div>
							)}
							{snapshots.map((snap) => (
								<Card key={snap.id} className={`group/card relative transition-all border shadow-sm hover:shadow-md overflow-hidden bg-sidebar ${snap.id === currentParentId ? 'border-sidebar-primary bg-sidebar-accent/30' : 'border-sidebar-border'}`}>
									<CardContent className="p-3">
										<div className="flex justify-between items-start mb-2">
											<div className="flex items-center gap-2">
												{snap.id === currentParentId && <div className="w-2 h-2 rounded-full bg-sidebar-primary shadow-sm" />}
												<span className={`text-xs font-medium ${snap.id === currentParentId ? 'text-sidebar-primary font-bold' : 'text-sidebar-foreground'}`}>{snap.description}</span>
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/card:opacity-100 -mr-1"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(snap.id, snap.description) }}><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem>
													<DropdownMenuItem className="text-destructive" onClick={(e) => handleDeleteSnapshot(e, snap.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
										<span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{formatDistanceToNow(snap.timestamp, { addSuffix: true })}</span>
										<div className="flex items-center justify-end gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity pt-2">
											<Button variant="ghost" size="sm" className="h-6 text-[10px] text-sidebar-primary" onClick={() => onWeave(snap)}><GitMerge className="w-3 h-3 mr-1" /> Weave</Button>
											<Button variant="ghost" size="sm" className="h-6 text-[10px] text-sidebar-foreground" onClick={(e) => { e.stopPropagation(); handleRestore(snap) }}><Clock className="w-3 h-3 mr-1" /> Restore</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</ScrollArea>
				) : (
					<div className="h-[500px] w-full p-2 flex flex-col">
						<div className="flex justify-end p-2 shrink-0"><Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setIsGraphExpanded(true)}><Maximize2 className="w-3 h-3 mr-1" /> Expand</Button></div>
						<div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-muted/10 relative">
							<Timeline checkpoints={snapshots} currentCheckpointId={currentParentId} onRestore={handleRestore} />
						</div>
					</div>
				)}
			</div>

			<Dialog open={isGraphExpanded} onOpenChange={setIsGraphExpanded}>
				<DialogContent className="max-w-[90vw] h-[80vh] p-0 gap-0 bg-card">
					<div className="flex flex-col h-full">
						<DialogHeader className="p-4 border-b border-border"><DialogTitle>Version History Graph</DialogTitle></DialogHeader>
						<div className="flex-1 min-h-0 bg-muted/10 p-4"><Timeline checkpoints={snapshots} currentCheckpointId={currentParentId} onRestore={handleRestore} /></div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}