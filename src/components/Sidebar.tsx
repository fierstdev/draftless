import React, { useEffect, useState } from 'react'
import {
	Plus, Clock, History, GitMerge, Trash2, BookOpen, UserPlus, Search, FileText, Maximize2, StickyNote
} from 'lucide-react';
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
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog"
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

const getTextFromJson = (node: any): string => {
	if (!node) return ''

	// 1. Leaf Node (Text)
	if (node.type === 'text') {
		return node.text || ''
	}

	// 2. Container Node (Doc, Paragraph, etc.)
	if (node.content && Array.isArray(node.content)) {
		// Join children directly (no spaces/newlines between words)
		const childrenText = node.content.map((child: any) => getTextFromJson(child)).join('')

		// Add newline ONLY after block-level elements
		if (['paragraph', 'heading', 'blockquote', 'codeBlock'].includes(node.type)) {
			return childrenText + '\n\n'
		}

		return childrenText
	}

	return ''
}

export function AppSidebar({ projectDoc, activeFileId, ...props }: { projectDoc: Y.Doc, activeFileId: string } & React.ComponentProps<typeof Sidebar>) {
	const [snapshots, setSnapshots] = useState<Snapshot[]>([])
	const [newSnapshotName, setNewSnapshotName] = useState('')
	const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
	const [currentParentId, setCurrentParentId] = useState<string | null>(null)

	// Weaver State
	const [isWeaverOpen, setIsWeaverOpen] = useState(false)
	const [weaveTarget, setWeaveTarget] = useState<Snapshot | null>(null)

	// Tab State (Default to Files for Scrivener feel)
	const [activeTab, setActiveTab] = useState<'files' | 'history' | 'codex'>('files')

	// Codex State
	const [entities, setEntities] = useState<CodexEntity[]>([])
	const [codexSearch, setCodexSearch] = useState('')
	const [isEntityDialogOpen, setIsEntityDialogOpen] = useState(false)
	const [newEntity, setNewEntity] = useState<{name: string, type: EntityType, description: string}>({ name: '', type: 'character', description: '' })

	// Project Files State
	const [files, setFiles] = useState<ProjectFile[]>([])
	const [newFileTitle, setNewFileTitle] = useState('')
	const [isNewFileOpen, setIsNewFileOpen] = useState(false)

	// Graph Expansion
	const [isGraphExpanded, setIsGraphExpanded] = useState(false)

	const editor = useStore((state) => state.editor)
	const setActiveFileId = useStore((state) => state.setActiveFileId)
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'

	// --- CODEX LOGIC ---
	useEffect(() => {
		const codex = new CodexManager(projectDoc)
		const map = projectDoc.getMap('draftless-codex')

		const updateHandler = () => {
			setEntities(codex.getAll())
		}

		map.observe(updateHandler)
		updateHandler()

		return () => map.unobserve(updateHandler)
	}, [projectDoc])

	const filteredEntities = entities.filter(e =>
		e.name.toLowerCase().includes(codexSearch.toLowerCase()) ||
		e.type.toLowerCase().includes(codexSearch.toLowerCase())
	)

	const handleAddEntity = () => {
		if (!newEntity.name) return
		const codex = new CodexManager(projectDoc)

		const colors: Record<string, string> = {
			character: '#3b82f6',
			location: '#10b981',
			item: '#f59e0b',
			lore: '#8b5cf6'
		}

		codex.add({
			...newEntity,
			color: colors[newEntity.type] || '#64748b'
		})

		setIsEntityDialogOpen(false)
		setNewEntity({ name: '', type: 'character', description: '' })
	}

	// --- PROJECT FILES LOGIC ---
	useEffect(() => {
		const pm = new ProjectManager(projectDoc)
		const map = projectDoc.getMap('draftless-project-files')

		const updateHandler = () => {
			setFiles(pm.getAll())
		}

		map.observe(updateHandler)
		updateHandler()

		return () => map.unobserve(updateHandler)
	}, [projectDoc])

	const handleCreateFile = (type: FileType) => {
		const pm = new ProjectManager(projectDoc)
		const id = pm.create(newFileTitle || "Untitled", type)
		setNewFileTitle('')
		setIsNewFileOpen(false)
		setActiveFileId(id) // Switch to new file immediately
	}

	const handleDeleteFile = (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		if (!confirm("Delete this file?")) return
		const pm = new ProjectManager(projectDoc)
		pm.delete(id)
		if (activeFileId === id) setActiveFileId(null)
	}

	// --- HISTORY LOGIC (Scoped to Active File) ---
	const getDBName = () => `draftless-snapshots-${activeFileId}`

	const initDB = async () => {
		return openDB(getDBName(), DB_VERSION, {
			upgrade(db) {
				if (db.objectStoreNames.contains('snapshots')) {
					db.deleteObjectStore('snapshots')
				}
				db.createObjectStore('snapshots', { keyPath: 'id' })
			},
		})
	}

	useEffect(() => {
		if (!activeFileId) {
			setSnapshots([])
			return
		}
		const loadSnapshots = async () => {
			try {
				const db = await initDB()
				const all = await db.getAll('snapshots')
				setSnapshots(all.sort((a, b) => b.timestamp - a.timestamp))
			} catch (err) {
				console.error("Failed to load snapshots:", err)
			}
		}
		loadSnapshots()
	}, [activeFileId])

	const handleSaveSnapshot = async () => {
		if (!editor || !newSnapshotName) return
		const content = editor.getJSON()
		const id = crypto.randomUUID()
		const newSnap: Snapshot = {
			id,
			timestamp: Date.now(),
			description: newSnapshotName,
			content,
			parentId: currentParentId
		}
		const db = await initDB()
		await db.put('snapshots', newSnap)
		setSnapshots([newSnap, ...snapshots])
		setNewSnapshotName('')
		setCurrentParentId(id)
	}

	const handleRestore = (snap: Snapshot) => {
		if (!editor) return
		editor.commands.setContent(snap.content)
		setCurrentParentId(snap.id)
	}

	const handleDeleteSnapshot = async (e: React.MouseEvent, id: string) => {
		e.preventDefault()
		e.stopPropagation()
		if (!confirm("Delete this checkpoint?")) return
		const db = await initDB()
		await db.delete('snapshots', id)
		setSnapshots(prev => prev.filter(s => s.id !== id))
		if (currentParentId === id) setCurrentParentId(null)
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
			<Sidebar
				collapsible="icon"
				className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
				style={{ "--sidebar-width": "24rem" } as React.CSSProperties}
				{...props}
			>

				{/* HEADER: TABS */}
				<SidebarHeader className="h-16 border-b border-sidebar-border px-4 flex flex-col justify-center">
					{!isCollapsed ? (
						<div className="grid grid-cols-3 bg-sidebar-accent/50 p-1 rounded-lg border border-sidebar-border/50">
							<button onClick={() => setActiveTab('files')} className={`flex items-center justify-center h-7 rounded-md text-xs font-medium transition-all ${activeTab === 'files' ? 'bg-sidebar shadow-sm text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}>
								<FileText className="w-3.5 h-3.5 mr-1.5" /> Files
							</button>
							<button onClick={() => setActiveTab('history')} className={`flex items-center justify-center h-7 rounded-md text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-sidebar shadow-sm text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}>
								<History className="w-3.5 h-3.5 mr-1.5" /> History
							</button>
							<button onClick={() => setActiveTab('codex')} className={`flex items-center justify-center h-7 rounded-md text-xs font-medium transition-all ${activeTab === 'codex' ? 'bg-sidebar shadow-sm text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}>
								<BookOpen className="w-3.5 h-3.5 mr-1.5" /> Codex
							</button>
						</div>
					) : (
						<div className="flex justify-center">
							{activeTab === 'files' && <FileText className="w-5 h-5 text-sidebar-primary" />}
							{activeTab === 'history' && <History className="w-5 h-5 text-sidebar-primary" />}
							{activeTab === 'codex' && <BookOpen className="w-5 h-5 text-sidebar-primary" />}
						</div>
					)}
				</SidebarHeader>

				{/* --- CONTENT --- */}
				<SidebarContent>

					{/* === TAB: FILES (PROJECT TREE) === */}
					{activeTab === 'files' && (
						<div className="flex flex-col h-full bg-sidebar-accent/10">
							{!isCollapsed && (
								<div className="p-4 border-b border-sidebar-border bg-sidebar">
									<Dialog open={isNewFileOpen} onOpenChange={setIsNewFileOpen}>
										<DialogTrigger asChild>
											<Button className="w-full gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 shadow-sm h-8 text-xs">
												<Plus className="w-3.5 h-3.5" /> New Chapter
											</Button>
										</DialogTrigger>
										<DialogContent className="bg-card border-border">
											<DialogHeader><DialogTitle>Add New File</DialogTitle></DialogHeader>
											<Input
												placeholder="Chapter Title"
												value={newFileTitle}
												onChange={(e) => setNewFileTitle(e.target.value)}
												className="bg-background"
											/>
											<DialogFooter className="gap-2">
												<Button variant="secondary" onClick={() => handleCreateFile('note')}>Add Note</Button>
												<Button onClick={() => handleCreateFile('chapter')}>Add Chapter</Button>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								</div>
							)}
							<ScrollArea className="flex-1">
								<div className="p-2 flex flex-col gap-1">
									{files.map(file => (
										<div
											key={file.id}
											onClick={() => setActiveFileId(file.id)}
											className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${activeFileId === file.id ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
										>
											<div className="flex items-center gap-2">
												{file.type === 'chapter' ? <FileText className="w-4 h-4 opacity-70" /> : <StickyNote className="w-4 h-4 opacity-70" />}
												<span className="truncate">{file.title}</span>
											</div>
											<Button
												variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
												onClick={(e) => handleDeleteFile(e, file.id)}
											>
												<Trash2 className="w-3 h-3" />
											</Button>
										</div>
									))}
								</div>
							</ScrollArea>
						</div>
					)}

					{/* === TAB: HISTORY === */}
					{activeTab === 'history' && (
						<>
							{!isCollapsed && (
								<div className="p-4 space-y-4 border-b border-sidebar-border">
									{!activeFileId ? (
										<div className="text-xs text-center text-muted-foreground py-4">Select a chapter to view history</div>
									) : (
										<>
											<div className="flex gap-2">
												<Input
													placeholder="New checkpoint..."
													value={newSnapshotName}
													onChange={(e) => setNewSnapshotName(e.target.value)}
													onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshot()}
													className="h-8 bg-sidebar-accent/50 border-sidebar-border text-xs"
												/>
												<Button onClick={handleSaveSnapshot} disabled={!newSnapshotName} size="icon" className="h-8 w-8 bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
													<Plus className="w-4 h-4" />
												</Button>
											</div>
											<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')} className="w-full">
												<TabsList className="grid w-full grid-cols-2 bg-sidebar-accent/50 h-8 border border-sidebar-border">
													<TabsTrigger value="list" className="text-xs h-6">List</TabsTrigger>
													<TabsTrigger value="map" className="text-xs h-6">Graph</TabsTrigger>
												</TabsList>
											</Tabs>
										</>
									)}
								</div>
							)}

							{/* History List/Graph (Only if active file) */}
							{activeFileId && (
								<div className="flex-1 min-h-0 bg-sidebar-accent/10 relative group-data-[collapsible=icon]:hidden">
									{viewMode === 'list' ? (
										<ScrollArea className="h-full">
											<div className="p-3 flex flex-col gap-2">
												{snapshots.map((snap) => (
													<Card key={snap.id} className={`group/card relative transition-all border shadow-sm hover:shadow-md overflow-hidden bg-sidebar ${snap.id === currentParentId ? 'border-sidebar-primary bg-sidebar-accent/30' : 'border-sidebar-border'}`}>
														<CardContent className="p-3">
															<div className="flex justify-between items-start mb-2">
																<div className="flex items-center gap-2">
																	{snap.id === currentParentId && <div className="w-2 h-2 rounded-full bg-sidebar-primary shadow-sm" />}
																	<span className={`text-xs font-medium ${snap.id === currentParentId ? 'text-sidebar-primary font-bold' : 'text-sidebar-foreground'}`}>{snap.description}</span>
																</div>
																<span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{formatDistanceToNow(snap.timestamp, { addSuffix: true })}</span>
															</div>
															<div className="flex items-center justify-end gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
																<Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => handleDeleteSnapshot(e, snap.id)}><Trash2 className="w-3 h-3" /></Button>
																<div className="h-3 w-px bg-sidebar-border mx-1" />
																<Button variant="ghost" size="icon" className="h-6 w-6 text-sidebar-primary" onClick={() => handleOpenWeaver(snap)}><GitMerge className="w-3 h-3" /></Button>
																<Button variant="ghost" size="icon" className="h-6 w-6 text-sidebar-foreground" onClick={(e) => { e.stopPropagation(); handleRestore(snap) }}><Clock className="w-3 h-3" /></Button>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										</ScrollArea>
									) : (
										<div className="h-full flex flex-col">
											<div className="flex justify-end p-2 bg-sidebar border-b border-sidebar-border">
												<Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setIsGraphExpanded(true)}>
													<Maximize2 className="w-3 h-3 mr-1" /> Expand
												</Button>
											</div>
											<div className="flex-1 p-2">
												<Timeline checkpoints={snapshots} currentCheckpointId={currentParentId} onRestore={handleRestore} />
											</div>
										</div>
									)}
								</div>
							)}
						</>
					)}

					{/* === TAB: CODEX === */}
					{activeTab === 'codex' && (
						<div className="flex flex-col h-full bg-sidebar-accent/10">
							{!isCollapsed && (
								<div className="p-4 space-y-3 border-b border-sidebar-border bg-sidebar">
									<div className="relative">
										<Search className="absolute left-2 top-2 w-4 h-4 text-muted-foreground" />
										<Input
											placeholder="Filter entities..."
											className="pl-8 h-8 bg-sidebar-accent/50 border-sidebar-border text-xs"
											value={codexSearch}
											onChange={(e) => setCodexSearch(e.target.value)}
										/>
									</div>
									<Button onClick={() => setIsEntityDialogOpen(true)} className="w-full gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 shadow-sm h-8 text-xs">
										<UserPlus className="w-3.5 h-3.5" /> Add Entity
									</Button>
								</div>
							)}

							{!isCollapsed && (
								<ScrollArea className="flex-1">
									<div className="p-3 flex flex-col gap-2">
										{filteredEntities.map(entity => (
											<Card key={entity.id} className="bg-sidebar border-sidebar-border hover:border-sidebar-primary/30 transition-all cursor-pointer hover:shadow-sm group">
												<CardContent className="p-3 flex items-start gap-3 relative overflow-hidden">
													<div className="w-1 absolute left-0 top-0 bottom-0" style={{ backgroundColor: entity.color }} />
													<div className="pl-2 flex-1">
														<div className="flex justify-between items-center">
															<div className="text-xs font-bold text-sidebar-foreground">{entity.name}</div>
															<span className="text-[10px] text-muted-foreground uppercase tracking-wider">{entity.type}</span>
														</div>
														<p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{entity.description}</p>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								</ScrollArea>
							)}
						</div>
					)}

				</SidebarContent>

				<SidebarFooter className="border-t border-sidebar-border">
					<SidebarMenu>
						<SidebarMenuItem className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 py-2`}>
							{!isCollapsed && (
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<div className={`w-2 h-2 rounded-full ${editor ? 'bg-emerald-500' : 'bg-red-500'}`} />
									{editor ? 'Online' : 'Offline'}
								</div>
							)}
							<div className="flex items-center gap-2">
								{!isCollapsed && <span className="text-[10px] font-mono text-muted-foreground/50">v0.1.0</span>}
								<SettingsDialog />
							</div>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>

			{/* WEAVER */}
			{editor && weaveTarget && (
				<Weaver
					isOpen={isWeaverOpen}
					onClose={() => setIsWeaverOpen(false)}
					currentText={editor.getText()}
					checkpointText={getTextFromJson(weaveTarget.content)}
					onConfirm={handleConfirmWeave}
				/>
			)}

			{/* GRAPH EXPANSION DIALOG */}
			<Dialog open={isGraphExpanded} onOpenChange={setIsGraphExpanded}>
				<DialogContent className="max-w-[90vw] h-[80vh] p-0 gap-0 bg-card">
					<div className="flex flex-col h-full">
						<DialogHeader className="p-4 border-b border-border">
							<DialogTitle>Version History Graph</DialogTitle>
						</DialogHeader>
						<div className="flex-1 min-h-0 bg-muted/10 p-4">
							<Timeline checkpoints={snapshots} currentCheckpointId={currentParentId} onRestore={handleRestore} />
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* ADD ENTITY DIALOG */}
			<Dialog open={isEntityDialogOpen} onOpenChange={setIsEntityDialogOpen}>
				<DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
					<DialogHeader>
						<DialogTitle>Add to Codex</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={newEntity.name}
								onChange={(e) => setNewEntity({...newEntity, name: e.target.value})}
								placeholder="e.g. The Red Keep"
								className="bg-background"
							/>
						</div>
						<div className="grid gap-2">
							<Label>Type</Label>
							<Select
								value={newEntity.type}
								onValueChange={(v) => setNewEntity({...newEntity, type: v as EntityType})}
							>
								<SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="character">Character</SelectItem>
									<SelectItem value="location">Location</SelectItem>
									<SelectItem value="item">Item</SelectItem>
									<SelectItem value="lore">Lore</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="desc">Description</Label>
							<Textarea
								id="desc"
								value={newEntity.description}
								onChange={(e) => setNewEntity({...newEntity, description: e.target.value})}
								placeholder="Short bio or description..."
								className="bg-background"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button onClick={handleAddEntity} disabled={!newEntity.name} className="bg-primary text-primary-foreground hover:bg-primary/90">Add to Codex</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}