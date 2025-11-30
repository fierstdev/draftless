import React, { useEffect, useState } from 'react'
import {
	Plus, Clock, History,
	GitMerge, Trash2, BookOpen, UserPlus, Search, FileText,
	StickyNote, Maximize2, MoreVertical, Pencil
} from 'lucide-react'
import * as Y from 'yjs'
import { formatDistanceToNow } from 'date-fns'
import { openDB } from 'idb'
import { Timeline } from './Timeline'
import { useStore } from '@/lib/store'
import { Weaver } from './Weaver'
import { SettingsDialog } from './SettingsDialog'
import { CodexManager, type CodexEntity, type EntityType } from '@/lib/codex'
import { ProjectManager, type ProjectFile, type FileType } from '@/lib/project'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarRail,
	useSidebar
} from "@/components/ui/sidebar"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Snapshot {
	id: string
	timestamp: number
	description: string
	content: any
	parentId: string | null
}

const DB_VERSION = 4

const getTextFromJson = (json: any): string => {
	if (!json) return '';
	if (json.text) return json.text;
	if (Array.isArray(json.content)) {
		return json.content.map((child: any) => getTextFromJson(child)).join('\n');
	}
	return '';
}

export function AppSidebar({ projectDoc, activeFileId, ...props }: { projectDoc: Y.Doc, activeFileId: string } & React.ComponentProps<typeof Sidebar>) {
	const [snapshots, setSnapshots] = useState<Snapshot[]>([])
	const [newSnapshotName, setNewSnapshotName] = useState('')
	const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
	const [currentParentId, setCurrentParentId] = useState<string | null>(null)

	// Weaver State
	const [isWeaverOpen, setIsWeaverOpen] = useState(false)
	const [weaveTarget, setWeaveTarget] = useState<Snapshot | null>(null)

	// Navigation State
	const [activeTab, setActiveTab] = useState<'files' | 'history' | 'codex'>('files')

	// Codex State
	const [entities, setEntities] = useState<CodexEntity[]>([])
	const [codexSearch, setCodexSearch] = useState('')
	const [isEntityDialogOpen, setIsEntityDialogOpen] = useState(false)
	const [currentEntity, setCurrentEntity] = useState<CodexEntity | null>(null) // For Edit Mode
	const [newEntity, setNewEntity] = useState<{name: string, type: EntityType, description: string}>({ name: '', type: 'character', description: '' })

	// Files State
	const [files, setFiles] = useState<ProjectFile[]>([])
	const [newFileTitle, setNewFileTitle] = useState('')
	const [isNewFileOpen, setIsNewFileOpen] = useState(false)

	// Rename Dialog State
	const [renameTarget, setRenameTarget] = useState<{ id: string, type: 'file' | 'snapshot', name: string } | null>(null)

	// Graph Dialog State
	const [isGraphExpanded, setIsGraphExpanded] = useState(false)

	const editor = useStore((state) => state.editor)
	const openFile = useStore((state) => state.openFile)
	const isSplitView = useStore((state) => state.isSplitView)
	const primaryFileId = useStore((state) => state.primaryFileId)
	const secondaryFileId = useStore((state) => state.secondaryFileId)
	const setActiveFileId = useStore((state) => state.setActiveFileId)

	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'

	// --- CODEX LOGIC ---
	useEffect(() => {
		const codex = new CodexManager(projectDoc)
		const map = projectDoc.getMap('draftless-codex')
		const updateHandler = () => setEntities(codex.getAll())
		map.observe(updateHandler)
		updateHandler()
		return () => map.unobserve(updateHandler)
	}, [projectDoc])

	const filteredEntities = entities.filter(e =>
		e.name.toLowerCase().includes(codexSearch.toLowerCase()) ||
		e.type.toLowerCase().includes(codexSearch.toLowerCase())
	)

	const handleSaveEntity = () => {
		if (!newEntity.name) return
		const codex = new CodexManager(projectDoc)

		const colors: Record<string, string> = {
			character: '#3b82f6', location: '#10b981', item: '#f59e0b', lore: '#8b5cf6'
		}

		if (currentEntity) {
			codex.update(currentEntity.id, {
				name: newEntity.name,
				type: newEntity.type,
				description: newEntity.description,
				color: colors[newEntity.type] || '#64748b'
			})
		} else {
			codex.add({
				...newEntity,
				color: colors[newEntity.type] || '#64748b'
			})
		}

		setIsEntityDialogOpen(false)
		setCurrentEntity(null)
		setNewEntity({ name: '', type: 'character', description: '' })
	}

	const handleEditEntity = (e: React.MouseEvent, entity: CodexEntity) => {
		e.stopPropagation()
		setCurrentEntity(entity)
		setNewEntity({ name: entity.name, type: entity.type, description: entity.description })
		setIsEntityDialogOpen(true)
	}

	const handleDeleteEntity = (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		if (!confirm("Delete this entity?")) return
		const codex = new CodexManager(projectDoc)
		codex.delete(id)
	}

	// --- PROJECT FILES LOGIC ---
	useEffect(() => {
		const pm = new ProjectManager(projectDoc)
		const map = projectDoc.getMap('draftless-project-files')
		const updateHandler = () => setFiles(pm.getAll())
		map.observe(updateHandler)
		updateHandler()
		return () => map.unobserve(updateHandler)
	}, [projectDoc])

	const handleCreateFile = (type: FileType) => {
		const pm = new ProjectManager(projectDoc)
		const id = pm.create(newFileTitle || "Untitled", type)
		setNewFileTitle('')
		setIsNewFileOpen(false)
		openFile(id)
	}

	const handleDeleteFile = (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		if (!confirm("Delete this file?")) return
		const pm = new ProjectManager(projectDoc)
		pm.delete(id)
		if (activeFileId === id) setActiveFileId(null)
	}

	// --- HISTORY LOGIC ---
	const getDBName = () => `draftless-snapshots-${activeFileId}`
	const initDB = async () => {
		return openDB(getDBName(), DB_VERSION, {
			upgrade(db) {
				if (db.objectStoreNames.contains('snapshots')) { db.deleteObjectStore('snapshots') }
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
				if (isMounted) setSnapshots(all.sort((a, b) => b.timestamp - a.timestamp))
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

	// --- UNIVERSAL RENAME HANDLER ---
	const handleRenameSubmit = async () => {
		if (!renameTarget || !renameTarget.name.trim()) return

		if (renameTarget.type === 'file') {
			const pm = new ProjectManager(projectDoc)
			pm.update(renameTarget.id, { title: renameTarget.name })
		}
		else if (renameTarget.type === 'snapshot') {
			const db = await initDB()
			const snap = snapshots.find(s => s.id === renameTarget.id)
			if (snap) {
				snap.description = renameTarget.name
				await db.put('snapshots', snap)
				const all = await db.getAll('snapshots')
				setSnapshots(all.sort((a: Snapshot, b: Snapshot) => b.timestamp - a.timestamp))
			}
		}
		setRenameTarget(null)
	}

	const handleOpenWeaver = (snap: Snapshot) => {
		setWeaveTarget(snap)
		setIsWeaverOpen(true)
	}

	const handleConfirmWeave = (text: string) => {
		if (!editor) return
		editor.commands.setContent(text)
		setIsWeaverOpen(false)
	}

	return (
		<>
			<Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground" {...props}>

				{/* HEADER: FIXED HEIGHT */}
				<SidebarHeader className="h-16 border-b border-sidebar-border px-4 flex flex-col justify-center shrink-0 transition-all">
					{!isCollapsed ? (
						// EXPANDED: Horizontal Tabs
						<div className="grid grid-cols-3 bg-sidebar-accent/50 p-1 rounded-lg border border-sidebar-border/50 w-full">
							<button onClick={() => setActiveTab('files')} className={`flex items-center justify-center h-7 rounded-md text-xs font-medium transition-all ${activeTab === 'files' ? 'bg-sidebar shadow-sm text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}><FileText className="w-3.5 h-3.5 mr-1.5" /> Files</button>
							<button onClick={() => setActiveTab('history')} className={`flex items-center justify-center h-7 rounded-md text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-sidebar shadow-sm text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}><History className="w-3.5 h-3.5 mr-1.5" /> History</button>
							<button onClick={() => setActiveTab('codex')} className={`flex items-center justify-center h-7 rounded-md text-xs font-medium transition-all ${activeTab === 'codex' ? 'bg-sidebar shadow-sm text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}><BookOpen className="w-3.5 h-3.5 mr-1.5" /> Codex</button>
						</div>
					) : (
						// COLLAPSED: Only show the Active Tab Icon as a title
						<div className="flex justify-center items-center h-full">
							{activeTab === 'files' && <FileText className="w-5 h-5 text-sidebar-primary" />}
							{activeTab === 'history' && <History className="w-5 h-5 text-sidebar-primary" />}
							{activeTab === 'codex' && <BookOpen className="w-5 h-5 text-sidebar-primary" />}
						</div>
					)}
				</SidebarHeader>

				<SidebarContent className="h-[calc(100vh-8rem)] overflow-hidden">

					{/* COLLAPSED NAVIGATION (Vertical Stack at top of content) */}
					{isCollapsed && (
						<div className="flex flex-col items-center gap-3 py-4 border-b border-sidebar-border bg-sidebar-accent/5">
							<TooltipProvider delayDuration={0}>
								<Tooltip>
									<TooltipTrigger asChild>
										<button onClick={() => setActiveTab('files')} className={`p-2 rounded-md transition-all ${activeTab === 'files' ? 'bg-sidebar-accent text-sidebar-primary shadow-sm' : 'text-muted-foreground hover:bg-sidebar-accent/50'}`}>
											<FileText className="w-4 h-4" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="right" className="font-bold">Files</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<button onClick={() => setActiveTab('history')} className={`p-2 rounded-md transition-all ${activeTab === 'history' ? 'bg-sidebar-accent text-sidebar-primary shadow-sm' : 'text-muted-foreground hover:bg-sidebar-accent/50'}`}>
											<History className="w-4 h-4" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="right" className="font-bold">History</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<button onClick={() => setActiveTab('codex')} className={`p-2 rounded-md transition-all ${activeTab === 'codex' ? 'bg-sidebar-accent text-sidebar-primary shadow-sm' : 'text-muted-foreground hover:bg-sidebar-accent/50'}`}>
											<BookOpen className="w-4 h-4" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="right" className="font-bold">Codex</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					)}

					{/* FILES TAB */}
					{activeTab === 'files' && (
						<div className="flex flex-col h-full bg-sidebar-accent/10">
							{!isCollapsed && (
								<div className="p-4 border-b border-sidebar-border bg-sidebar shrink-0">
									<Dialog open={isNewFileOpen} onOpenChange={setIsNewFileOpen}>
										<DialogTrigger asChild><Button className="w-full gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 shadow-sm h-8 text-xs"><Plus className="w-3.5 h-3.5" /> New Chapter</Button></DialogTrigger>
										{/* ... Dialog Content ... */}
										<DialogContent className="bg-card border-border">
											<DialogHeader><DialogTitle>Add New File</DialogTitle></DialogHeader>
											<Input placeholder="Chapter Title" value={newFileTitle} onChange={(e) => setNewFileTitle(e.target.value)} className="bg-background" />
											<DialogFooter className="gap-2"><Button variant="secondary" onClick={() => handleCreateFile('note')}>Add Note</Button><Button onClick={() => handleCreateFile('chapter')}>Add Chapter</Button></DialogFooter>
										</DialogContent>
									</Dialog>
								</div>
							)}
							{/* File List (Auto-minimizes styling when collapsed) */}
							<ScrollArea className="flex-1">
								<div className={`flex flex-col gap-1 ${isCollapsed ? 'p-2 items-center' : 'p-2'}`}>
									{files.map(file => {
										const isActive = primaryFileId === file.id || (isSplitView && secondaryFileId === file.id);
										return isCollapsed ? (
											// Collapsed Item
											<TooltipProvider delayDuration={0} key={file.id}>
												<Tooltip>
													<TooltipTrigger asChild>
														<button onClick={() => openFile(file.id)} className={`p-2 rounded-md transition-colors ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-sidebar-accent/50'}`}>
															{file.type === 'chapter' ? <FileText className="w-4 h-4" /> : <StickyNote className="w-4 h-4" />}
														</button>
													</TooltipTrigger>
													<TooltipContent side="right" className="flex flex-col gap-1">
														<span className="font-bold">{file.title}</span>
														<span className="text-[10px] uppercase text-muted-foreground">{(file.type)}</span>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										) : (
											// Expanded Item
											<div key={file.id} onClick={() => openFile(file.id)} className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
												<div className="flex items-center gap-2 overflow-hidden">
													{file.type === 'chapter' ? <FileText className="w-4 h-4 opacity-70 shrink-0" /> : <StickyNote className="w-4 h-4 opacity-70 shrink-0" />}
													<span className="truncate">{file.title}</span>
												</div>
												<DropdownMenu>
													<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground shrink-0"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger>
													<DropdownMenuContent align="end"><DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameTarget({ id: file.id, type: 'file', name: file.title }) }}><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => handleDeleteFile(e, file.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent>
												</DropdownMenu>
											</div>
										);
									})}
								</div>
							</ScrollArea>
						</div>
					)}

					{/* HISTORY TAB */}
					{activeTab === 'history' && (
						<div className="flex flex-col h-full bg-sidebar-accent/10">
							{!isCollapsed && (
								<div className="p-4 space-y-4 border-b border-sidebar-border shrink-0 bg-sidebar">
									{!activeFileId ? <div className="text-xs text-center text-muted-foreground py-4">Select a chapter</div> : (
										<>
											<div className="flex gap-2"><Input placeholder="Checkpoint..." value={newSnapshotName} onChange={(e) => setNewSnapshotName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshot()} className="h-8 bg-sidebar-accent/50 border-sidebar-border text-xs" /><Button onClick={handleSaveSnapshot} disabled={!newSnapshotName} size="icon" className="h-8 w-8 bg-sidebar-primary text-sidebar-primary-foreground shrink-0"><Plus className="w-4 h-4" /></Button></div>
											<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')} className="w-full"><TabsList className="grid w-full grid-cols-2 bg-sidebar-accent/50 h-8 border border-sidebar-border"><TabsTrigger value="list" className="text-xs h-6">List</TabsTrigger><TabsTrigger value="map" className="text-xs h-6">Graph</TabsTrigger></TabsList></Tabs>
										</>
									)}
								</div>
							)}

							{activeFileId && (
								<div className="flex-1 min-h-0 relative">
									{!isCollapsed && viewMode === 'list' && (
										// Expanded List View (Existing)
										<ScrollArea className="h-full">
											<div className="p-3 flex flex-col gap-2">
												{snapshots.map((snap) => (
													<Card key={snap.id} className={`group/card relative transition-all border shadow-sm hover:shadow-md overflow-hidden bg-sidebar ${snap.id === currentParentId ? 'border-sidebar-primary bg-sidebar-accent/30' : 'border-sidebar-border'}`}>
														<CardContent className="p-3">
															<div className="flex justify-between items-start mb-2">
																<div className="flex items-center gap-2">{snap.id === currentParentId && <div className="w-2 h-2 rounded-full bg-sidebar-primary shadow-sm" />}<span className={`text-xs font-medium ${snap.id === currentParentId ? 'text-sidebar-primary font-bold' : 'text-sidebar-foreground'}`}>{snap.description}</span></div>
																<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/card:opacity-100 -mr-1"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameTarget({ id: snap.id, type: 'snapshot', name: snap.description }) }}><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={(e) => handleDeleteSnapshot(e, snap.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
															</div>
															<span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{formatDistanceToNow(snap.timestamp, { addSuffix: true })}</span>
															<div className="flex items-center justify-end gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity pt-2">
																<Button variant="ghost" size="sm" className="h-6 text-[10px] text-sidebar-primary" onClick={() => handleOpenWeaver(snap)}><GitMerge className="w-3 h-3 mr-1" /> Weave</Button>
																<Button variant="ghost" size="sm" className="h-6 text-[10px] text-sidebar-foreground" onClick={(e) => { e.stopPropagation(); handleRestore(snap) }}><Clock className="w-3 h-3 mr-1" /> Restore</Button>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										</ScrollArea>
									)}

									{!isCollapsed && viewMode === 'map' && (
										// FIX: Graph Container using Flex-1
										<div className="h-[500px] w-full p-2 flex flex-col">
											<div className="flex justify-end p-2 shrink-0"><Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setIsGraphExpanded(true)}><Maximize2 className="w-3 h-3 mr-1" /> Expand</Button></div>
											<div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-muted/10 relative">
												<Timeline checkpoints={snapshots} currentCheckpointId={currentParentId} onRestore={handleRestore} />
											</div>
										</div>
									)}

									{isCollapsed && (
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
									)}
								</div>
							)}
						</div>
					)}

					{/* CODEX TAB */}
					{activeTab === 'codex' && (
						<div className="flex flex-col h-full bg-sidebar-accent/10">
							{!isCollapsed && (
								<div className="p-4 space-y-3 border-b border-sidebar-border bg-sidebar shrink-0">
									<div className="relative"><Search className="absolute left-2 top-2 w-4 h-4 text-muted-foreground" /><Input placeholder="Filter..." className="pl-8 h-8 bg-sidebar-accent/50 border-sidebar-border text-xs" value={codexSearch} onChange={(e) => setCodexSearch(e.target.value)} /></div>
									<Button onClick={() => { setCurrentEntity(null); setIsEntityDialogOpen(true); }} className="w-full gap-2 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm h-8 text-xs"><UserPlus className="w-3.5 h-3.5" /> Add Entity</Button>
								</div>
							)}
							{!isCollapsed ? (
								<ScrollArea className="flex-1">
									<div className="p-3 flex flex-col gap-2">
										{filteredEntities.map(entity => (
											<Card key={entity.id} className="bg-sidebar border-sidebar-border hover:border-sidebar-primary/30 cursor-pointer group" onClick={(e) => handleEditEntity(e, entity)}>
												<CardContent className="p-3 flex items-start gap-3 relative overflow-hidden">
													<div className="w-1 absolute left-0 top-0 bottom-0" style={{ backgroundColor: entity.color }} />
													<div className="pl-2 flex-1">
														<div className="flex justify-between items-center">
															<div className="text-xs font-bold text-sidebar-foreground">{entity.name}</div>
															<div className="flex items-center gap-1"><span className="text-[10px] text-muted-foreground uppercase">{entity.type}</span><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 -mr-2 ml-1"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={(e) => handleEditEntity(e, entity)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={(e) => handleDeleteEntity(e, entity.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
														</div>
														<p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{entity.description}</p>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								</ScrollArea>
							) : (
								// Collapsed Codex Dots
								<div className="flex flex-col items-center pt-4 gap-2 w-full">
									<TooltipProvider delayDuration={0}>
										{filteredEntities.map(entity => (
											<Tooltip key={entity.id}>
												<TooltipTrigger asChild><div className="w-3 h-3 rounded-full cursor-help hover:scale-125 transition-transform" style={{ backgroundColor: entity.color }} /></TooltipTrigger>
												<TooltipContent side="right"><div className="font-bold text-xs">{entity.name}</div><div className="text-[10px] uppercase text-muted-foreground">{entity.type}</div></TooltipContent>
											</Tooltip>
										))}
									</TooltipProvider>
								</div>
							)}
						</div>
					)}

				</SidebarContent>

				<SidebarFooter className="border-t border-sidebar-border shrink-0">
					<SidebarMenu>
						<SidebarMenuItem className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 py-2`}>
							{!isCollapsed && <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className={`w-2 h-2 rounded-full ${editor ? 'bg-emerald-500' : 'bg-red-500'}`} />{editor ? 'Online' : 'Offline'}</div>}
							<div className="flex items-center gap-2">{!isCollapsed && <span className="text-[10px] font-mono text-muted-foreground/50">v0.1.0</span>}<SettingsDialog /></div>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>

			{editor && weaveTarget && (
				<Weaver isOpen={isWeaverOpen} onClose={() => setIsWeaverOpen(false)} currentText={editor.getText()} checkpointText={getTextFromJson(weaveTarget.content)} onConfirm={handleConfirmWeave} />
			)}

			<Dialog open={isGraphExpanded} onOpenChange={setIsGraphExpanded}>
				<DialogContent className="max-w-[90vw] h-[80vh] p-0 gap-0 bg-card">
					<div className="flex flex-col h-full">
						<DialogHeader className="p-4 border-b border-border"><DialogTitle>Version History Graph</DialogTitle></DialogHeader>
						<div className="flex-1 min-h-0 bg-muted/10 p-4"><Timeline checkpoints={snapshots} currentCheckpointId={currentParentId} onRestore={handleRestore} /></div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={isEntityDialogOpen} onOpenChange={(open) => { setIsEntityDialogOpen(open); if (!open) setCurrentEntity(null); }}>
				<DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
					<DialogHeader><DialogTitle>{currentEntity ? 'Edit Entity' : 'Add to Codex'}</DialogTitle></DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2"><Label>Name</Label><Input value={newEntity.name} onChange={(e) => setNewEntity({...newEntity, name: e.target.value})} className="bg-background" /></div>
						<div className="grid gap-2"><Label>Type</Label><Select value={newEntity.type} onValueChange={(v) => setNewEntity({...newEntity, type: v as EntityType})}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="character">Character</SelectItem><SelectItem value="location">Location</SelectItem><SelectItem value="item">Item</SelectItem><SelectItem value="lore">Lore</SelectItem></SelectContent></Select></div>
						<div className="grid gap-2"><Label>Description</Label><Textarea value={newEntity.description} onChange={(e) => setNewEntity({...newEntity, description: e.target.value})} className="bg-background" /></div>
					</div>
					<DialogFooter><Button onClick={handleSaveEntity} disabled={!newEntity.name} className="bg-primary text-primary-foreground">{currentEntity ? 'Save Changes' : 'Add to Codex'}</Button></DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
				<DialogContent className="bg-card border-border sm:max-w-[425px]">
					<DialogHeader><DialogTitle>Rename</DialogTitle></DialogHeader>
					<div className="py-4"><Input value={renameTarget?.name || ''} onChange={(e) => setRenameTarget(prev => prev ? { ...prev, name: e.target.value } : null)} onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()} autoFocus className="bg-background" /></div>
					<DialogFooter><Button onClick={handleRenameSubmit} disabled={!renameTarget?.name.trim()} className="bg-primary text-primary-foreground">Save</Button></DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}