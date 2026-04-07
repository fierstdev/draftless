import React, { useEffect, useState } from 'react'
import { Search, UserPlus, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { CodexManager, type CodexEntity } from '@/lib/codex'
import * as Y from 'yjs'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CodexEntityDialog } from '@/components/CodexEntityDialog'
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'
import { NoticeBanner } from '@/components/NoticeBanner'
import { EMPTY_ENTITY_FORM, type CodexEntityFormState } from '@/lib/codex-form'

interface CodexViewProps {
	projectDoc: Y.Doc
	isCollapsed: boolean
}

export function CodexView({ projectDoc, isCollapsed }: CodexViewProps) {
	const [entities, setEntities] = useState<CodexEntity[]>([])
	const [search, setSearch] = useState('')
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [dialogSession, setDialogSession] = useState(0)
	const [currentEntity, setCurrentEntity] = useState<CodexEntity | null>(null)
	const [entityToDelete, setEntityToDelete] = useState<CodexEntity | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [dialogSeed, setDialogSeed] = useState<CodexEntityFormState>(EMPTY_ENTITY_FORM)

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
		e.type.toLowerCase().includes(search.toLowerCase()) ||
		e.aliases.some((alias) => alias.toLowerCase().includes(search.toLowerCase()))
	)

	const openAddDialog = () => {
		setCurrentEntity(null)
		setDialogSeed(EMPTY_ENTITY_FORM)
		setDialogSession((current) => current + 1)
		setIsDialogOpen(true)
	}

	const handleEdit = (e: React.MouseEvent, entity: CodexEntity) => {
		e.stopPropagation()
		setCurrentEntity(entity)
		setDialogSeed({
			name: entity.name,
			type: entity.type,
			description: entity.description,
			aliasesText: entity.aliases.join(', '),
		})
		setDialogSession((current) => current + 1)
		setIsDialogOpen(true)
	}

	const confirmDelete = async () => {
		if (!entityToDelete) return
		try {
			setErrorMessage(null)
			const codex = new CodexManager(projectDoc)
			codex.delete(entityToDelete.id)
			setEntityToDelete(null)
		} catch (error) {
			console.error(error)
			setErrorMessage("Couldn't remove this codex entry. Please try again.")
			setEntityToDelete(null)
		}
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
								{entity.aliases.length > 0 && (
									<div className="mt-1 max-w-[180px] text-[10px] text-muted-foreground">
										Also: {entity.aliases.join(', ')}
									</div>
								)}
							</TooltipContent>
						</Tooltip>
					))}
				</TooltipProvider>
			</div>
		)
	}

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col bg-sidebar-accent/10">
			<div className="p-3 md:p-4 space-y-2.5 md:space-y-3 border-b border-sidebar-border bg-sidebar shrink-0">
					<div className="relative">
						<Search className="absolute left-2 top-2 w-4 h-4 text-muted-foreground" />
						<Input placeholder="Search your codex..." className="pl-8 h-9 md:h-8 bg-sidebar-accent/50 border-sidebar-border text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
					</div>
					<Button onClick={openAddDialog} className="w-full gap-2 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm h-9 md:h-8 text-xs">
						<UserPlus className="w-3.5 h-3.5" /> Add Entry
					</Button>
				{errorMessage && (
					<NoticeBanner
						variant="error"
						message={errorMessage}
						onDismiss={() => setErrorMessage(null)}
					/>
				)}
			</div>
			<div className="flex min-h-0 flex-1 flex-col">
				<ScrollArea className="h-full min-h-0 flex-1">
					<div className="p-2.5 flex flex-col gap-1.5">
						{filtered.length === 0 && (
							<div className="rounded-xl border border-dashed border-sidebar-border bg-sidebar px-4 py-8 text-center">
								<div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-sidebar-accent/70 text-muted-foreground shadow-sm">
									<UserPlus className="h-5 w-5" />
								</div>
								<div className="text-sm font-medium text-sidebar-foreground">
									{entities.length === 0 ? 'Your codex is empty' : 'No codex entries match that search'}
								</div>
								<div className="mt-2 text-xs leading-relaxed text-muted-foreground">
									{entities.length === 0
										? 'Add a character, place, object, or piece of lore so it stays close while you write.'
										: 'Try another name, type, or alternate name.'}
								</div>
							</div>
						)}
						{filtered.map(entity => (
							<Card key={entity.id} className="bg-sidebar border-sidebar-border hover:border-sidebar-primary/30 cursor-pointer group rounded-xl" onClick={(e) => handleEdit(e, entity)}>
								<CardContent className="relative flex items-start gap-2.5 overflow-hidden p-2.5">
									<div className="w-1 absolute left-0 top-0 bottom-0" style={{ backgroundColor: entity.color }} />
									<div className="pl-2 flex-1">
										<div className="flex justify-between items-center">
											<div className="truncate pr-2 text-[13px] font-semibold leading-tight text-sidebar-foreground">{entity.name}</div>
											<div className="flex items-center gap-1">
												<span className="text-[10px] text-muted-foreground uppercase">{entity.type}</span>
												<DropdownMenu>
													<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-100 -mr-1 md:opacity-0 md:group-hover:opacity-100"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger>
													<DropdownMenuContent align="end">
															<DropdownMenuItem onClick={(e) => handleEdit(e, entity)}><Pencil className="w-4 h-4 mr-2" /> Edit Entry</DropdownMenuItem>
														<DropdownMenuItem
															className="text-destructive"
															onClick={(event) => {
																event.stopPropagation()
																setEntityToDelete(entity)
															}}
														><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</div>
										<p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground line-clamp-2">{entity.description}</p>
										{entity.aliases.length > 0 && (
											<p className="mt-1.5 text-[10px] text-muted-foreground line-clamp-1">
												Also: {entity.aliases.join(', ')}
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</ScrollArea>
			</div>

				<CodexEntityDialog
				key={`${currentEntity?.id ?? 'new'}-${dialogSession}`}
				open={isDialogOpen}
				onOpenChange={(open) => {
					setIsDialogOpen(open)
					if (!open) {
						setCurrentEntity(null)
					}
				}}
				projectDoc={projectDoc}
				entity={currentEntity}
				initialValue={dialogSeed}
					title={currentEntity ? 'Edit Codex Entry' : 'New Codex Entry'}
				/>
			<ConfirmActionDialog
				open={!!entityToDelete}
				onOpenChange={(open) => {
					if (!open) {
						setEntityToDelete(null)
					}
				}}
				title="Delete Codex Entry"
				description={
					entityToDelete
						? `Delete "${entityToDelete.name}" from the codex? Highlights in your draft will disappear until you add it again.`
						: 'Delete this entry from the codex?'
				}
				confirmLabel="Delete Entry"
				onConfirm={confirmDelete}
			/>
		</div>
	)
}
