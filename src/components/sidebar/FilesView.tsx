import React, { useEffect, useState } from 'react'
import { StickyNote, Plus, MoreVertical, Pencil, Trash2, FileText } from 'lucide-react';
import { ProjectManager, type ProjectFile, type FileType } from '@/lib/project'
import { useStore } from '@/lib/store'
import * as Y from 'yjs'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog"
import {
	DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FilesViewProps {
	projectDoc: Y.Doc
	isCollapsed: boolean
	onRename: (id: string, name: string) => void
}

export function FilesView({ projectDoc, isCollapsed, onRename }: FilesViewProps) {
	const [files, setFiles] = useState<ProjectFile[]>([])
	const [newFileTitle, setNewFileTitle] = useState('')
	const [isNewFileOpen, setIsNewFileOpen] = useState(false)

	const activeFileId = useStore(state => state.activeFileId)
	const openFile = useStore(state => state.openFile)
	const primaryFileId = useStore(state => state.primaryFileId)
	const secondaryFileId = useStore(state => state.secondaryFileId)
	const isSplitView = useStore(state => state.isSplitView)
	const setActiveFileId = useStore(state => state.setActiveFileId)

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

	if (isCollapsed) {
		return (
			<div className="flex flex-col items-center pt-4 gap-2 w-full">
				<TooltipProvider delayDuration={0}>
					{files.map(file => (
						<Tooltip key={file.id}>
							<TooltipTrigger asChild>
								<button
									onClick={() => openFile(file.id)}
									className={`p-2 rounded-md transition-colors ${primaryFileId === file.id ? 'bg-sidebar-accent text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}
								>
									{file.type === 'chapter' ? <FileText className="w-4 h-4" /> : <StickyNote className="w-4 h-4" />}
								</button>
							</TooltipTrigger>
							<TooltipContent side="right">{file.title}</TooltipContent>
						</Tooltip>
					))}
				</TooltipProvider>
			</div>
		)
	}

	return (
		<div className="flex flex-col h-full bg-sidebar-accent/10">
			<div className="p-4 border-b border-sidebar-border bg-sidebar shrink-0">
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
			<ScrollArea className="flex-1">
				<div className="p-2 flex flex-col gap-1">
					{files.map(file => {
						const isActive = primaryFileId === file.id || (isSplitView && secondaryFileId === file.id);
						return (
							<div
								key={file.id}
								onClick={() => openFile(file.id)}
								className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
							>
								<div className="flex items-center gap-2 overflow-hidden">
									{file.type === 'chapter' ? <FileText className="w-4 h-4 opacity-70 shrink-0" /> : <StickyNote className="w-4 h-4 opacity-70 shrink-0" />}
									<span className="truncate">{file.title}</span>
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground shrink-0">
											<MoreVertical className="w-3 h-3" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(file.id, file.title) }}>
											<Pencil className="w-4 h-4 mr-2" /> Rename
										</DropdownMenuItem>
										<DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => handleDeleteFile(e, file.id)}>
											<Trash2 className="w-4 h-4 mr-2" /> Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						)
					})}
				</div>
			</ScrollArea>
		</div>
	)
}