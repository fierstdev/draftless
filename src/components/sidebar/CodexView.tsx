import React, { useEffect, useState } from 'react'
import { Search, UserPlus, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { CodexManager, type CodexEntity, type EntityType } from '@/lib/codex'
import * as Y from 'yjs'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CodexViewProps {
	projectDoc: Y.Doc
	isCollapsed: boolean
}

export function CodexView({ projectDoc, isCollapsed }: CodexViewProps) {
	const [entities, setEntities] = useState<CodexEntity[]>([])
	const [search, setSearch] = useState('')
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [currentEntity, setCurrentEntity] = useState<CodexEntity | null>(null)
	const [newEntity, setNewEntity] = useState<{name: string, type: EntityType, description: string}>({ name: '', type: 'character', description: '' })

	useEffect(() => {
		const codex = new CodexManager(projectDoc)
		const map = projectDoc.getMap('draftless-codex')
		const updateHandler = () => setEntities(codex.getAll())
		map.observe(updateHandler)
		updateHandler()
		return () => map.unobserve(updateHandler)
	}, [projectDoc])

	const filtered = entities.filter(e =>
		e.name.toLowerCase().includes(search.toLowerCase()) ||
		e.type.toLowerCase().includes(search.toLowerCase())
	)

	const handleSave = () => {
		if (!newEntity.name) return
		const codex = new CodexManager(projectDoc)
		const colors: Record<string, string> = { character: '#3b82f6', location: '#10b981', item: '#f59e0b', lore: '#8b5cf6' }
		if (currentEntity) {
			codex.update(currentEntity.id, { ...newEntity, color: colors[newEntity.type] || '#64748b' })
		} else {
			codex.add({ ...newEntity, color: colors[newEntity.type] || '#64748b' })
		}
		setIsDialogOpen(false); setCurrentEntity(null); setNewEntity({ name: '', type: 'character', description: '' })
	}

	const handleEdit = (e: React.MouseEvent, entity: CodexEntity) => {
		e.stopPropagation()
		setCurrentEntity(entity)
		setNewEntity({ name: entity.name, type: entity.type, description: entity.description })
		setIsDialogOpen(true)
	}

	const handleDelete = (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		if (!confirm("Delete this entity?")) return
		const codex = new CodexManager(projectDoc)
		codex.delete(id)
	}

	if (isCollapsed) {
		return (
			<div className="flex flex-col items-center pt-4 gap-2 w-full">
				<TooltipProvider delayDuration={0}>
					{filtered.map(entity => (
						<Tooltip key={entity.id}>
							<TooltipTrigger asChild>
								<div className="w-3 h-3 rounded-full cursor-help hover:scale-125 transition-transform ring-2 ring-sidebar-border" style={{ backgroundColor: entity.color }} />
							</TooltipTrigger>
							<TooltipContent side="right">
								<div className="font-bold text-xs">{entity.name}</div>
								<div className="text-[10px] uppercase text-muted-foreground">{entity.type}</div>
							</TooltipContent>
						</Tooltip>
					))}
				</TooltipProvider>
			</div>
		)
	}

	return (
		<div className="flex flex-col h-full bg-sidebar-accent/10">
			<div className="p-4 space-y-3 border-b border-sidebar-border bg-sidebar shrink-0">
				<div className="relative">
					<Search className="absolute left-2 top-2 w-4 h-4 text-muted-foreground" />
					<Input placeholder="Filter..." className="pl-8 h-8 bg-sidebar-accent/50 border-sidebar-border text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
				</div>
				<Button onClick={() => { setCurrentEntity(null); setIsDialogOpen(true); }} className="w-full gap-2 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm h-8 text-xs">
					<UserPlus className="w-3.5 h-3.5" /> Add Entity
				</Button>
			</div>
			<ScrollArea className="flex-1">
				<div className="p-3 flex flex-col gap-2">
					{filtered.map(entity => (
						<Card key={entity.id} className="bg-sidebar border-sidebar-border hover:border-sidebar-primary/30 cursor-pointer group" onClick={(e) => handleEdit(e, entity)}>
							<CardContent className="p-3 flex items-start gap-3 relative overflow-hidden">
								<div className="w-1 absolute left-0 top-0 bottom-0" style={{ backgroundColor: entity.color }} />
								<div className="pl-2 flex-1">
									<div className="flex justify-between items-center">
										<div className="text-xs font-bold text-sidebar-foreground">{entity.name}</div>
										<div className="flex items-center gap-1">
											<span className="text-[10px] text-muted-foreground uppercase">{entity.type}</span>
											<DropdownMenu>
												<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 -mr-2 ml-1"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={(e) => handleEdit(e, entity)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
													<DropdownMenuItem className="text-destructive" onClick={(e) => handleDelete(e, entity.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
									<p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{entity.description}</p>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</ScrollArea>

			<Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setCurrentEntity(null); }}>
				<DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
					<DialogHeader><DialogTitle>{currentEntity ? 'Edit Entity' : 'Add to Codex'}</DialogTitle></DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2"><Label>Name</Label><Input value={newEntity.name} onChange={(e) => setNewEntity({...newEntity, name: e.target.value})} className="bg-background" /></div>
						<div className="grid gap-2"><Label>Type</Label><Select value={newEntity.type} onValueChange={(v) => setNewEntity({...newEntity, type: v as EntityType})}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="character">Character</SelectItem><SelectItem value="location">Location</SelectItem><SelectItem value="item">Item</SelectItem><SelectItem value="lore">Lore</SelectItem></SelectContent></Select></div>
						<div className="grid gap-2"><Label>Description</Label><Textarea value={newEntity.description} onChange={(e) => setNewEntity({...newEntity, description: e.target.value})} className="bg-background" /></div>
					</div>
					<DialogFooter><Button onClick={handleSave} disabled={!newEntity.name} className="bg-primary text-primary-foreground">{currentEntity ? 'Save Changes' : 'Add to Codex'}</Button></DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}