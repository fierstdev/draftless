import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Plus, GitBranch, Clock, GitMerge, Trash2, Maximize2, MoreVertical, Pencil } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useStore } from '@/lib/store'
import { listSnapshots, openSnapshotsDb, type Snapshot } from '@/lib/snapshots'
import { SnapshotDiffDialog } from '@/components/SnapshotDiffDialog'
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'
import { NoticeBanner } from '@/components/NoticeBanner'
import { useIsMobile } from '@/hooks/use-mobile'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface HistoryViewProps {
	activeFileId: string | null
	isCollapsed: boolean
	onRename: (id: string, name: string) => void
	onWeave: (snap: Snapshot) => void
}

const Timeline = lazy(() => import('../Timeline').then((module) => ({ default: module.Timeline })))

export function HistoryView({ activeFileId, isCollapsed, onRename, onWeave }: HistoryViewProps) {
	const [snapshots, setSnapshots] = useState<Snapshot[]>([])
	const [newSnapshotName, setNewSnapshotName] = useState('')
	const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
	const [currentParentId, setCurrentParentId] = useState<string | null>(null)
	const [isGraphExpanded, setIsGraphExpanded] = useState(false)
	const [isDiffOpen, setIsDiffOpen] = useState(false)
	const [leftDiffSnapshotId, setLeftDiffSnapshotId] = useState<string | null>(null)
	const [rightDiffSnapshotId, setRightDiffSnapshotId] = useState<string | null>(null)
	const [snapshotToDelete, setSnapshotToDelete] = useState<Snapshot | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const editor = useStore(state => state.editor)
	const isMobile = useIsMobile()

	const snapshotsById = useMemo(
		() => new Map(snapshots.map((snapshot) => [snapshot.id, snapshot] as const)),
		[snapshots],
	)

	useEffect(() => {
		let isMounted = true
		const loadSnapshots = async () => {
			if (!activeFileId) {
				if (isMounted) {
					setSnapshots([])
				}
				return
			}

			try {
				const all = await listSnapshots(activeFileId)
				if (isMounted) {
					setSnapshots(all)
					if (all.length < 2) {
						setIsDiffOpen(false)
						setLeftDiffSnapshotId(null)
						setRightDiffSnapshotId(null)
					}
				}
			} catch (error) {
				console.error(error)
			}
		}
		loadSnapshots()
		return () => { isMounted = false }
	}, [activeFileId])

	const handleSaveSnapshot = async () => {
		if (!editor || !newSnapshotName || !activeFileId) return
		const content = editor.getJSON()
		const id = crypto.randomUUID()
		const fallbackSnapshots = snapshots.length > 0 ? snapshots : await listSnapshots(activeFileId)
		const parentId = currentParentId ?? fallbackSnapshots[0]?.id ?? null
		const newSnap: Snapshot = { id, timestamp: Date.now(), description: newSnapshotName, content, parentId }
		const db = await openSnapshotsDb(activeFileId)
		await db.put('snapshots', newSnap)
		setSnapshots((prev) => [newSnap, ...(prev.length > 0 ? prev : fallbackSnapshots)])
		setNewSnapshotName('')
		setCurrentParentId(id)
	}

	const handleRestore = (snap: Snapshot) => {
		if (!editor || editor.isDestroyed) return
		editor.commands.setContent(snap.content)
		setCurrentParentId(snap.id)
	}

	const openDiffForSnapshot = (snapshot: Snapshot) => {
		const initialPair = getInitialDiffPair(snapshot, snapshotsById, currentParentId)
		if (!initialPair) return

		setLeftDiffSnapshotId(initialPair.left.id)
		setRightDiffSnapshotId(initialPair.right.id)
		setIsDiffOpen(true)
	}

	const confirmDeleteSnapshot = async () => {
		if (!activeFileId || !snapshotToDelete) return
		try {
			setErrorMessage(null)
			const id = snapshotToDelete.id
			const db = await openSnapshotsDb(activeFileId)
			await db.delete('snapshots', id)
			setSnapshots(prev => prev.filter(s => s.id !== id))
			if (currentParentId === id) setCurrentParentId(null)
			if (leftDiffSnapshotId === id) setLeftDiffSnapshotId(null)
			if (rightDiffSnapshotId === id) setRightDiffSnapshotId(null)
			setSnapshotToDelete(null)
		} catch (error) {
			console.error(error)
			setErrorMessage("Couldn't delete this saved version yet. Try again in a moment.")
			setSnapshotToDelete(null)
		}
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
		return <div className="p-4 text-xs text-center text-muted-foreground h-full flex items-center justify-center">Open a chapter or note to see saved versions</div>
	}

	// 3. Expanded View
	return (
		<div className="flex flex-col h-full bg-sidebar-accent/10">
			<div className="p-3 md:p-4 space-y-3 border-b border-sidebar-border shrink-0 bg-sidebar">
				<div className="flex gap-2">
					<Input placeholder="Name this version..." value={newSnapshotName} onChange={(e) => setNewSnapshotName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshot()} className="h-9 md:h-8 bg-sidebar-accent/50 border-sidebar-border text-xs" />
					<Button onClick={handleSaveSnapshot} disabled={!newSnapshotName} size="icon" className="h-9 w-9 md:h-8 md:w-8 bg-sidebar-primary text-sidebar-primary-foreground shrink-0"><Plus className="w-4 h-4" /></Button>
				</div>
				<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')} className="w-full">
					<TabsList className="grid w-full grid-cols-2 bg-sidebar-accent/50 h-9 md:h-8 border border-sidebar-border">
						<TabsTrigger value="list" className="text-xs h-6">List</TabsTrigger>
						<TabsTrigger value="map" className="text-xs h-6">Map</TabsTrigger>
					</TabsList>
				</Tabs>
				{errorMessage && (
					<NoticeBanner
						variant="error"
						message={errorMessage}
						onDismiss={() => setErrorMessage(null)}
					/>
				)}
			</div>

			<div className="flex-1 min-h-0 relative">
				{viewMode === 'list' ? (
					<ScrollArea className="h-full">
						<div className="p-2.5 flex flex-col gap-1.5">
							{snapshots.length === 0 && (
								<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-sidebar-border bg-sidebar px-4 py-10 text-center">
									<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar-accent/70 text-muted-foreground shadow-sm">
										<GitBranch className="h-5 w-5" />
									</div>
									<p className="text-sm font-medium text-sidebar-foreground">No saved versions</p>
									<p className="mt-2 max-w-[220px] text-[11px] leading-relaxed text-muted-foreground">
										Save a version before a big rewrite so you can find your way back easily.
									</p>
								</div>
							)}
							{snapshots.map((snap) => (
								<Card key={snap.id} className={`group/card relative overflow-hidden border bg-sidebar shadow-sm transition-all hover:shadow-md rounded-xl ${snap.id === currentParentId ? 'border-sidebar-primary bg-sidebar-accent/30' : 'border-sidebar-border'}`}>
									<CardContent className="p-2.5 md:p-3">
										<div className="mb-1.5 flex items-start justify-between gap-2">
											<div className="min-w-0 flex items-center gap-2">
												{snap.id === currentParentId && <div className="w-2 h-2 rounded-full bg-sidebar-primary shadow-sm" />}
												<span className={`truncate text-[11px] font-medium ${snap.id === currentParentId ? 'text-sidebar-primary font-bold' : 'text-sidebar-foreground'}`}>{snap.description}</span>
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5 opacity-100 -mr-1 md:opacity-0 md:group-hover/card:opacity-100"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={(event) => { event.stopPropagation(); openDiffForSnapshot(snap) }}>
														Compare Drafts
													</DropdownMenuItem>
													<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(snap.id, snap.description) }}><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem>
													<DropdownMenuItem
														className="text-destructive"
														onClick={(event) => {
															event.stopPropagation()
															setSnapshotToDelete(snap)
														}}
													><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
										<div className="ml-4 text-[10px] text-muted-foreground whitespace-nowrap">{formatDistanceToNow(snap.timestamp, { addSuffix: true })}</div>
										<div className="hidden items-center justify-end gap-1 pt-2 opacity-0 transition-opacity md:flex md:group-hover/card:opacity-100">
											<Button variant="ghost" size="sm" className="h-6 text-[10px] text-sidebar-foreground" onClick={() => openDiffForSnapshot(snap)}>Compare Drafts</Button>
											<Button variant="ghost" size="sm" className="h-6 text-[10px] text-sidebar-primary" onClick={() => onWeave(snap)}><GitMerge className="w-3 h-3 mr-1" /> Weave</Button>
											<Button variant="ghost" size="sm" className="h-6 text-[10px] text-sidebar-foreground" onClick={(e) => { e.stopPropagation(); handleRestore(snap) }}><Clock className="w-3 h-3 mr-1" /> Bring Back</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</ScrollArea>
				) : (
					<div className={isMobile ? "h-[420px] w-full p-2 flex flex-col" : "h-[500px] w-full p-2 flex flex-col"}>
						<div className="flex justify-end p-2 shrink-0"><Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setIsGraphExpanded(true)}><Maximize2 className="w-3 h-3 mr-1" /> Expand Map</Button></div>
						<div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-muted/10 relative">
							<Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading version map...</div>}>
								<Timeline checkpoints={snapshots} currentCheckpointId={currentParentId} onRestore={handleRestore} />
							</Suspense>
						</div>
					</div>
				)}
			</div>

			<Dialog open={isGraphExpanded} onOpenChange={setIsGraphExpanded}>
				<DialogContent className="w-[92vw] max-w-[92vw] h-[88vh] sm:max-w-[92vw] p-0 gap-0 bg-card overflow-hidden">
					<div className="flex flex-col h-full">
						<DialogHeader className="p-4 border-b border-border"><DialogTitle>Version Map</DialogTitle></DialogHeader>
						<div className="flex-1 min-h-0 bg-muted/10 p-2 md:p-4">
							<Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading version map...</div>}>
								<Timeline checkpoints={snapshots} currentCheckpointId={currentParentId} onRestore={handleRestore} />
							</Suspense>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<SnapshotDiffDialog
				open={isDiffOpen}
				onOpenChange={setIsDiffOpen}
				snapshots={snapshots}
				leftSnapshotId={leftDiffSnapshotId}
				rightSnapshotId={rightDiffSnapshotId}
				onLeftSnapshotChange={setLeftDiffSnapshotId}
				onRightSnapshotChange={setRightDiffSnapshotId}
			/>
			<ConfirmActionDialog
				open={!!snapshotToDelete}
				onOpenChange={(open) => {
					if (!open) {
						setSnapshotToDelete(null)
					}
				}}
				title="Delete Saved Version"
				description={
					snapshotToDelete
						? `Delete "${snapshotToDelete.description}" from this chapter or note's saved versions?`
						: 'Delete this saved version?'
				}
				confirmLabel="Delete Version"
				onConfirm={confirmDeleteSnapshot}
			/>
		</div>
	)
}

function getInitialDiffPair(
	snapshot: Snapshot,
	snapshotsById: Map<string, Snapshot>,
	currentParentId: string | null,
): { left: Snapshot; right: Snapshot } | null {
	const currentSnapshot =
		currentParentId && currentParentId !== snapshot.id
			? snapshotsById.get(currentParentId) ?? null
			: null
	const parentSnapshot = snapshot.parentId ? snapshotsById.get(snapshot.parentId) ?? null : null
	const fallbackSnapshot =
		Array.from(snapshotsById.values()).find((entry) => entry.id !== snapshot.id) ?? null

	const companionSnapshot = currentSnapshot ?? parentSnapshot ?? fallbackSnapshot
	if (!companionSnapshot) return null

	return snapshot.timestamp >= companionSnapshot.timestamp
		? { left: companionSnapshot, right: snapshot }
		: { left: snapshot, right: companionSnapshot }
}
