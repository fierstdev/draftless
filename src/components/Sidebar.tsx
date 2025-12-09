import React, { useState } from 'react'
import { TableOfContents, History, BookOpen } from 'lucide-react'
import * as Y from 'yjs'
import { openDB } from 'idb'
import { useStore } from '@/lib/store'
import { Weaver } from './Weaver'
import { SettingsDialog } from './SettingsDialog'
import { FilesView } from './sidebar/FilesView'
import { HistoryView, type Snapshot } from './sidebar/HistoryView'
import { CodexView } from './sidebar/CodexView'
import { ProjectManager } from '@/lib/project'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarRail, useSidebar
} from "@/components/ui/sidebar"
import {
	Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const getTextFromJson = (json): string => {
	if (!json) return '';
	if (json.text) return json.text;
	if (Array.isArray(json.content)) {
		return json.content.map((child) => getTextFromJson(child)).join('\n');
	}
	return '';
}

export function AppSidebar({ projectDoc, activeFileId, ...props }: { projectDoc: Y.Doc, activeFileId: string } & React.ComponentProps<typeof Sidebar>) {
	const [activeTab, setActiveTab] = useState<'files' | 'history' | 'codex'>('files')

	// Rename State
	const [renameTarget, setRenameTarget] = useState<{ id: string, type: 'file' | 'snapshot', name: string } | null>(null)

	// Weaver State
	const [isWeaverOpen, setIsWeaverOpen] = useState(false)
	const [weaveTarget, setWeaveTarget] = useState<Snapshot | null>(null)

	const editor = useStore((state) => state.editor)
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'

	const handleRenameSubmit = async () => {
		if (!renameTarget || !renameTarget.name.trim()) return
		if (renameTarget.type === 'file') {
			const pm = new ProjectManager(projectDoc)
			pm.update(renameTarget.id, { title: renameTarget.name })
		}
		else if (renameTarget.type === 'snapshot') {
			const db = await openDB(`draftless-snapshots-${activeFileId}`, 4)
			const snap = await db.get('snapshots', renameTarget.id)
			if (snap) {
				snap.description = renameTarget.name
				await db.put('snapshots', snap)
			}
		}
		setRenameTarget(null)
	}

	return (
		<>
			<Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground" {...props}>

				<SidebarHeader className="h-max border-b border-sidebar-border px-4 flex flex-col justify-center shrink-0 transition-all">
					{!isCollapsed ? (
						<div className="grid grid-cols-3 bg-sidebar-accent/50 p-1 rounded-lg border border-sidebar-border/50 w-full">
							<button onClick={() => setActiveTab('files')} className={`flex items-center justify-center h-7 rounded-md text-xs font-medium transition-all ${activeTab === 'files' ? 'bg-sidebar shadow-sm text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}><TableOfContents className="w-3.5 h-3.5 mr-1.5" />Contents</button>
							<button onClick={() => setActiveTab('history')} className={`flex items-center justify-center h-7 rounded-md text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-sidebar shadow-sm text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}><History className="w-3.5 h-3.5 mr-1.5" />History</button>
							<button onClick={() => setActiveTab('codex')} className={`flex items-center justify-center h-7 rounded-md text-xs font-medium transition-all ${activeTab === 'codex' ? 'bg-sidebar shadow-sm text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}><BookOpen className="w-3.5 h-3.5 mr-1.5" />Codex</button>
						</div>
					) : (
						<div className="flex flex-col gap-2 items-center w-full py-2">
							<TooltipProvider delayDuration={0}>
								<Tooltip><TooltipTrigger asChild><button onClick={() => setActiveTab('files')} className={`p-2 rounded-md transition-all ${activeTab === 'files' ? 'bg-sidebar-accent text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}><TableOfContents className="w-5 h-5" /></button></TooltipTrigger><TooltipContent side="right">Contents</TooltipContent></Tooltip>
								<Tooltip><TooltipTrigger asChild><button onClick={() => setActiveTab('history')} className={`p-2 rounded-md transition-all ${activeTab === 'history' ? 'bg-sidebar-accent text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}><History className="w-5 h-5" /></button></TooltipTrigger><TooltipContent side="right">History</TooltipContent></Tooltip>
								<Tooltip><TooltipTrigger asChild><button onClick={() => setActiveTab('codex')} className={`p-2 rounded-md transition-all ${activeTab === 'codex' ? 'bg-sidebar-accent text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}><BookOpen className="w-5 h-5" /></button></TooltipTrigger><TooltipContent side="right">Codex</TooltipContent></Tooltip>
							</TooltipProvider>
						</div>
					)}
				</SidebarHeader>

				<SidebarContent className="h-[calc(100vh-8rem)] overflow-hidden">
					{activeTab === 'files' && (
						<FilesView
							projectDoc={projectDoc}
							isCollapsed={isCollapsed}
							onRename={(id, name) => setRenameTarget({ id, type: 'file', name })}
						/>
					)}
					{activeTab === 'history' && (
						<HistoryView
							activeFileId={activeFileId}
							isCollapsed={isCollapsed}
							onRename={(id, name) => setRenameTarget({ id, type: 'snapshot', name })}
							onWeave={(snap) => { setWeaveTarget(snap); setIsWeaverOpen(true) }}
						/>
					)}
					{activeTab === 'codex' && (
						<CodexView
							projectDoc={projectDoc}
							isCollapsed={isCollapsed}
						/>
					)}
				</SidebarContent>

				<SidebarFooter className="border-t border-sidebar-border shrink-0">
					<SidebarMenu>
						<SidebarMenuItem className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 py-2`}>
							{!isCollapsed && (
								<div className="flex flex-col gap-0.5">
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<div className={`w-2 h-2 rounded-full ${editor ? 'bg-emerald-500' : 'bg-red-500'}`} />
										{editor ? 'Online' : 'Offline'}
									</div>
									{/* FOOTER CREDIT */}
									<div className="text-[12px] gap-1 flex text-muted-foreground/40">
										<span>Draftless – by  </span>
										<a href="https://fierst.dev" target="_blank"
										   className="text-[12px] text-muted-foreground/40 hover:text-primary transition-colors">
											  Fierst
										</a>
									</div>

								</div>
							)}
							<div className="flex items-center gap-2">
								{!isCollapsed && <span className="text-[10px] font-mono text-muted-foreground/50">v0.9.0-beta</span>}
								<SettingsDialog />
							</div>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>

			{editor && weaveTarget && (
				<Weaver isOpen={isWeaverOpen} onClose={() => setIsWeaverOpen(false)} currentText={editor.getText()} checkpointText={getTextFromJson(weaveTarget.content)} onConfirm={(text) => { if(editor) { editor.commands.setContent(text); setIsWeaverOpen(false) } }} />
			)}

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
