import { useEffect, useMemo, useState } from 'react'
import { StickyNote, Plus, MoreVertical, Pencil, Trash2, FileText, SlidersHorizontal, ChevronDown } from 'lucide-react'
import {
	getProjectFileFilterSummary,
	getProjectFileMetadataBadges,
	getProjectFileMetadataSummary,
	getProjectFileSearchText,
	hasActiveProjectFileFilters,
	projectFileMatchesFilters,
	ProjectFileViewManager,
	SCENE_STATUS_LABELS,
	ProjectManager,
	type ProjectFileFilters,
	type ProjectFile,
	type ProjectFileView,
	type SceneStatus,
} from '@/lib/project'
import { useStore } from '@/lib/store'
import * as Y from 'yjs'
import { deleteFileArtifacts } from '@/lib/persistence'
import { cn } from '@/lib/utils'

import { FileDetailsDialog, type FileDetailsFormValue } from '@/components/FileDetailsDialog'
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'
import { NoticeBanner } from '@/components/NoticeBanner'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FilesViewProps {
	projectDoc: Y.Doc
	isCollapsed: boolean
}

export function FilesView({ projectDoc, isCollapsed }: FilesViewProps) {
	const [files, setFiles] = useState<ProjectFile[]>([])
	const [savedViews, setSavedViews] = useState<ProjectFileView[]>([])
	const [isFileDialogOpen, setIsFileDialogOpen] = useState(false)
	const [fileDialogMode, setFileDialogMode] = useState<'create' | 'edit'>('create')
	const [fileDialogTarget, setFileDialogTarget] = useState<ProjectFile | null>(null)
	const [fileDialogSessionKey, setFileDialogSessionKey] = useState(0)
	const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null)
	const [isSaveViewOpen, setIsSaveViewOpen] = useState(false)
	const [savedViewsExpanded, setSavedViewsExpanded] = useState(true)
	const [isFiltersOpen, setIsFiltersOpen] = useState(false)
	const [savedViewName, setSavedViewName] = useState('')
	const [viewToDelete, setViewToDelete] = useState<ProjectFileView | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const openFile = useStore(state => state.openFile)
	const primaryFileId = useStore(state => state.primaryFileId)
	const secondaryFileId = useStore(state => state.secondaryFileId)
	const isSplitView = useStore(state => state.isSplitView)
	const closeFile = useStore(state => state.closeFile)
	const fileFilters = useStore((state) => state.fileFilters)
	const updateFileFilters = useStore((state) => state.updateFileFilters)
	const resetFileFilters = useStore((state) => state.resetFileFilters)
	const activeFileViewId = useStore((state) => state.activeFileViewId)
	const applySavedFileView = useStore((state) => state.applySavedFileView)
	const isMobile = useIsMobile()

	useEffect(() => {
		const pm = new ProjectManager(projectDoc)
		const map = projectDoc.getMap('draftless-project-files')
		const updateHandler = () => setFiles(pm.getAll())
		map.observe(updateHandler)
		updateHandler()
		return () => map.unobserve(updateHandler)
	}, [projectDoc])

	useEffect(() => {
		const viewManager = new ProjectFileViewManager(projectDoc)
		const map = projectDoc.getMap('draftless-project-file-views')
		const updateHandler = () => setSavedViews(viewManager.getAll())
		map.observe(updateHandler)
		updateHandler()
		return () => map.unobserve(updateHandler)
	}, [projectDoc])

	const filteredFiles = useMemo(() => {
		return files.filter((file) =>
			projectFileMatchesFilters(file, fileFilters, getProjectFileSearchText(file)),
		)
	}, [fileFilters, files])

	const activeFilterCount = getActiveFilterCount(fileFilters)
	const availablePovs = useMemo(
		() => getUniqueMetadataValues(files, 'pov'),
		[files],
	)
	const availableLocations = useMemo(
		() => getUniqueMetadataValues(files, 'location'),
		[files],
	)
	const activeSavedView = useMemo(
		() => savedViews.find((view) => view.id === activeFileViewId) ?? null,
		[activeFileViewId, savedViews],
	)
	const isSavedViewsOpen = activeFileViewId ? true : savedViewsExpanded
	const activeFilterSummary = useMemo(() => {
		if (activeSavedView) {
			return getProjectFileFilterSummary(activeSavedView.filters)
		}

		return getProjectFileFilterSummary(fileFilters)
	}, [activeSavedView, fileFilters])
	const hasActiveFilters = hasActiveProjectFileFilters(fileFilters)

	const fileDialogInitialValue = useMemo<FileDetailsFormValue>(() => {
		if (fileDialogMode === 'edit' && fileDialogTarget) {
			return {
				title: fileDialogTarget.title,
				type: fileDialogTarget.type === 'note' ? 'note' : 'chapter',
				metadata: {
					status: fileDialogTarget.metadata?.status,
					pov: fileDialogTarget.metadata?.pov ?? '',
					location: fileDialogTarget.metadata?.location ?? '',
					timeline: fileDialogTarget.metadata?.timeline ?? '',
					goal: fileDialogTarget.metadata?.goal ?? '',
				},
			}
		}

		return {
			title: '',
			type: 'chapter',
			metadata: {
				status: undefined,
				pov: '',
				location: '',
				timeline: '',
				goal: '',
			},
		}
	}, [fileDialogMode, fileDialogTarget])

	const handleSaveFileDetails = (value: FileDetailsFormValue) => {
		const pm = new ProjectManager(projectDoc)
		if (fileDialogMode === 'create') {
			const id = pm.create(value.title || 'Untitled', value.type, value.metadata)
			setIsFileDialogOpen(false)
			setFileDialogTarget(null)
			openFile(id)
			return
		}

		if (!fileDialogTarget) return

		pm.update(fileDialogTarget.id, {
			title: value.title,
			type: value.type,
			metadata: value.metadata,
		})
		setIsFileDialogOpen(false)
		setFileDialogTarget(null)
	}

	const confirmDeleteFile = async () => {
		if (!fileToDelete) return
		try {
			setErrorMessage(null)
			const pm = new ProjectManager(projectDoc)
			pm.delete(fileToDelete.id)
			closeFile(fileToDelete.id)
			await new Promise((resolve) => window.setTimeout(resolve, 0))
			await deleteFileArtifacts(fileToDelete.id)
			setFileToDelete(null)
		} catch (error) {
			console.error(error)
			setErrorMessage("Couldn't delete this chapter or note yet. Close it in any open pane and try again.")
			setFileToDelete(null)
		}
	}

	const handleSaveCurrentView = () => {
		const trimmedTitle = savedViewName.trim()
		if (!trimmedTitle) return

		const viewManager = new ProjectFileViewManager(projectDoc)
		const viewId = viewManager.create(trimmedTitle, fileFilters)
		applySavedFileView(viewId, fileFilters)
		setSavedViewName('')
		setIsSaveViewOpen(false)
	}

	const handleDeleteView = async () => {
		if (!viewToDelete) return
		try {
			setErrorMessage(null)
			const viewManager = new ProjectFileViewManager(projectDoc)
			viewManager.delete(viewToDelete.id)
			if (activeFileViewId === viewToDelete.id) {
				resetFileFilters()
			}
			setViewToDelete(null)
		} catch (error) {
			console.error(error)
			setErrorMessage("Couldn't delete that saved filter. Please try again.")
			setViewToDelete(null)
		}
	}

	const handleQuickStatusChange = (
		file: ProjectFile,
		nextStatus: SceneStatus | 'none',
	) => {
		const pm = new ProjectManager(projectDoc)
		pm.update(file.id, {
			metadata: {
				...file.metadata,
				status: nextStatus === 'none' ? undefined : nextStatus,
			},
		})
	}

	const openCreateDialog = () => {
		setFileDialogMode('create')
		setFileDialogTarget(null)
		setFileDialogSessionKey((current) => current + 1)
		setIsFileDialogOpen(true)
	}

	const openEditDialog = (file: ProjectFile) => {
		setFileDialogMode('edit')
		setFileDialogTarget(file)
		setFileDialogSessionKey((current) => current + 1)
		setIsFileDialogOpen(true)
	}

	if (isCollapsed) {
		return (
			<div className="flex flex-col items-center pt-4 gap-2 w-full">
				<TooltipProvider delayDuration={0}>
					{filteredFiles.map(file => (
						<Tooltip key={file.id}>
							<TooltipTrigger asChild>
								<button
									onClick={() => openFile(file.id)}
									className={`p-2 rounded-md transition-colors ${primaryFileId === file.id ? 'bg-sidebar-accent text-sidebar-primary' : 'text-muted-foreground hover:text-foreground'}`}
								>
									{file.type === 'chapter' ? <FileText className="w-4 h-4" /> : <StickyNote className="w-4 h-4" />}
								</button>
							</TooltipTrigger>
							<TooltipContent side="right">
								<div className="space-y-1">
									<div className="font-medium">{file.title}</div>
									<div className="text-xs text-muted-foreground">
										{getProjectFileMetadataSummary(file)}
									</div>
								</div>
							</TooltipContent>
						</Tooltip>
					))}
				</TooltipProvider>
			</div>
		)
	}

		return (
			<div className="flex flex-col h-full bg-sidebar-accent/10">
			<div className="p-3 md:p-4 border-b border-sidebar-border bg-sidebar shrink-0 space-y-2.5 md:space-y-3">
					<Button
						onClick={openCreateDialog}
						className="h-9 w-full gap-2 bg-sidebar-primary text-xs text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary/90 md:h-8"
					>
						<Plus className="w-3.5 h-3.5" /> Add Chapter or Note
					</Button>
					<Input
						placeholder="Search titles, POV, or places..."
						value={fileFilters.query}
						onChange={(event) => updateFileFilters({ query: event.target.value })}
						className="h-9 md:h-8 bg-background text-xs"
				/>
				<Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="min-w-0">
					<div className="flex items-center gap-2">
						<CollapsibleTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="h-9 min-w-0 flex-1 justify-between gap-2 px-3 text-xs md:h-8"
								>
									<span className="flex items-center gap-2 truncate">
										<SlidersHorizontal className="h-3.5 w-3.5" />
										<span>Refine List</span>
										{activeFilterCount > 0 && (
										<span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
											{activeFilterCount}
										</span>
									)}
								</span>
								<ChevronDown
									className={cn(
										'h-3.5 w-3.5 shrink-0 transition-transform',
										isFiltersOpen && 'rotate-180',
									)}
								/>
							</Button>
						</CollapsibleTrigger>
						{!isMobile && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setSavedViewName('')
									setIsSaveViewOpen(true)
								}}
								disabled={!hasActiveFilters}
								className="h-9 px-2 text-xs md:h-8"
							>
								Save Filter
							</Button>
						)}
					</div>
						<CollapsibleContent className="mt-2.5 space-y-3 rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-3">
							<div className="grid grid-cols-3 gap-1">
								<FilterToggleButton
									label="All"
									isActive={fileFilters.type === 'all'}
									onClick={() => updateFileFilters({ type: 'all' })}
								/>
								<FilterToggleButton
									label="Chapters"
									isActive={fileFilters.type === 'chapter'}
									onClick={() => updateFileFilters({ type: 'chapter' })}
								/>
								<FilterToggleButton
									label="Notes"
									isActive={fileFilters.type === 'note'}
									onClick={() => updateFileFilters({ type: 'note' })}
								/>
							</div>
								<div className="grid grid-cols-2 gap-2">
									<Select
										value={fileFilters.status}
										onValueChange={(value) => updateFileFilters({ status: value as 'all' | SceneStatus })}
									>
										<SelectTrigger className="h-9 md:h-8 w-full bg-background text-xs">
											<SelectValue placeholder="Any draft stage" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">Any draft stage</SelectItem>
											{Object.entries(SCENE_STATUS_LABELS).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
									<Select
										value={fileFilters.pov || 'all'}
										onValueChange={(value) => updateFileFilters({ pov: value === 'all' ? '' : value })}
									>
										<SelectTrigger className="h-9 md:h-8 w-full bg-background text-xs">
											<SelectValue placeholder="Any POV" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">Any POV</SelectItem>
										{availablePovs.map((pov) => (
											<SelectItem key={pov} value={pov}>
												{pov}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
								<Select
									value={fileFilters.location || 'all'}
								onValueChange={(value) =>
									updateFileFilters({ location: value === 'all' ? '' : value })
								}
							>
									<SelectTrigger className="h-9 md:h-8 w-full bg-background text-xs">
										<SelectValue placeholder="Any place" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Any place</SelectItem>
									{availableLocations.map((location) => (
										<SelectItem key={location} value={location}>
											{location}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className="flex items-center justify-between gap-2 pt-1">
								<Button
									variant="ghost"
									size="sm"
									onClick={resetFileFilters}
									disabled={!hasActiveFilters}
									className="h-8 px-2 text-[11px]"
								>
									Clear Filters
								</Button>
								{isMobile && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											setSavedViewName('')
											setIsSaveViewOpen(true)
										}}
										disabled={!hasActiveFilters}
										className="h-8 px-3 text-[11px]"
									>
										Save Filter
									</Button>
								)}
							</div>
						</CollapsibleContent>
				</Collapsible>
					{activeFilterCount > 0 && (
					<div className="rounded-lg border border-sidebar-border bg-sidebar-accent/20 px-3 py-2">
						<div className="flex items-start justify-between gap-2 text-[11px] text-muted-foreground">
							<div className="min-w-0">
									<div className="truncate">
										{activeFileViewId
											? activeSavedView
												? `${activeSavedView.title} active`
												: 'Saved filter active'
											: 'Filtered list active'}
									</div>
								{activeFilterSummary && (
									<div className="mt-1 truncate">
										{activeFilterSummary}
									</div>
								)}
								</div>
								<div className="shrink-0 text-right">
									<div>{filteredFiles.length} of {files.length}</div>
									<div>shown</div>
								</div>
							</div>
							<div className="mt-2 flex items-center justify-between gap-2 border-t border-sidebar-border/60 pt-2">
								<div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
									{activeFileViewId ? 'Saved filter' : 'Custom filter'}
								</div>
								{!isFiltersOpen && (
									<Button
										variant="ghost"
										size="sm"
										onClick={resetFileFilters}
										disabled={!hasActiveFilters}
										className="h-7 px-2 text-[11px]"
									>
										Clear
									</Button>
								)}
							</div>
						</div>
				)}
				{errorMessage && (
					<NoticeBanner
						variant="error"
						message={errorMessage}
						onDismiss={() => setErrorMessage(null)}
					/>
				)}
			</div>
			<ScrollArea className="flex-1">
					<div className="p-2.5 flex flex-col gap-1.5">
						{savedViews.length > 0 && (
							<Collapsible
								open={isSavedViewsOpen}
								onOpenChange={setSavedViewsExpanded}
								className="mb-2.5 rounded-xl border border-sidebar-border bg-sidebar p-2"
							>
								<CollapsibleTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="flex h-8 w-full items-center justify-between px-2 text-left hover:bg-sidebar-accent/50"
									>
										<span className="flex items-center gap-2">
											<span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
												Saved Filters
											</span>
											<span className="rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">
												{savedViews.length}
											</span>
										</span>
										<ChevronDown
											className={cn(
												'h-3.5 w-3.5 text-muted-foreground transition-transform',
												isSavedViewsOpen && 'rotate-180',
											)}
										/>
									</Button>
								</CollapsibleTrigger>
								<CollapsibleContent className="mt-2 space-y-1">
									{savedViews.map((view) => {
										const isActiveView = activeFileViewId === view.id
										return (
											<div
												key={view.id}
												className={cn(
													'group/view flex items-start justify-between gap-2 rounded-xl px-2.5 py-2 transition-colors',
													isActiveView
														? 'bg-sidebar-accent text-sidebar-primary'
														: 'hover:bg-sidebar-accent/50',
												)}
											>
												<button
													type="button"
													onClick={() => applySavedFileView(view.id, view.filters)}
													className="min-w-0 flex-1 text-left"
												>
													<div className="truncate text-[11px] font-semibold">{view.title}</div>
													<div className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
														{getProjectFileFilterSummary(view.filters)}
													</div>
												</button>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6 shrink-0 opacity-100 md:opacity-0 md:group-hover/view:opacity-100"
											>
												<MoreVertical className="w-3 h-3" />
											</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={() => applySavedFileView(view.id, view.filters)}>
															Open Filter
														</DropdownMenuItem>
														<DropdownMenuItem
															className="text-destructive focus:text-destructive"
															onClick={() => setViewToDelete(view)}
														>
															<Trash2 className="w-4 h-4 mr-2" /> Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										)
									})}
								</CollapsibleContent>
							</Collapsible>
						)}
					{filteredFiles.length === 0 && (
						<div className="rounded-xl border border-dashed border-sidebar-border bg-sidebar px-4 py-8 text-center">
										<div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-sidebar-accent/70 text-muted-foreground shadow-sm">
											<FileText className="h-5 w-5" />
										</div>
										<div className="text-sm font-medium text-sidebar-foreground">
											{files.length === 0 ? 'No chapters or notes yet' : 'Nothing matches this filter'}
										</div>
										<div className="mt-2 text-xs leading-relaxed text-muted-foreground">
											{files.length === 0
												? 'Add a chapter or note to start shaping your story.'
												: 'Try a different search, place, POV, or draft stage.'}
										</div>
									</div>
					)}
					{filteredFiles.map(file => {
						const isActive = primaryFileId === file.id || (isSplitView && secondaryFileId === file.id);
						const metadataBadges = getProjectFileMetadataBadges(file, isMobile ? 2 : 3).filter((badge) => badge.key !== 'status')
						const metadataSummary =
							metadataBadges.length > 0
								? metadataBadges.map((badge) => badge.label).join(' • ')
								: file.type === 'note'
									? 'Note'
									: 'Chapter'
						return (
							<div
								key={file.id}
								onClick={() => openFile(file.id)}
								className={`group flex items-start justify-between gap-2 rounded-xl px-2.5 py-2.5 text-sm cursor-pointer transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
							>
								<div className="flex items-start gap-2.5 overflow-hidden min-w-0">
									{file.type === 'chapter' ? <FileText className="mt-0.5 h-3.5 w-3.5 opacity-70 shrink-0" /> : <StickyNote className="mt-0.5 h-3.5 w-3.5 opacity-70 shrink-0" />}
									<div className="min-w-0">
										<div className="truncate text-[13px] font-medium leading-tight">{file.title}</div>
										<div className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed text-muted-foreground">
											{metadataSummary}
										</div>
									</div>
								</div>
								<div className="flex items-start gap-1 shrink-0 pl-2">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												onClick={(event) => event.stopPropagation()}
												onPointerDown={(event) => event.stopPropagation()}
												className={cn(
													'h-5.5 rounded-full px-2 text-[10px] font-medium transition-opacity md:h-6',
													file.metadata?.status || isActive
														? 'opacity-100'
														: 'opacity-100 md:opacity-0 md:group-hover:opacity-100',
													file.metadata?.status === 'draft' && 'bg-slate-500/10 text-slate-600 hover:bg-slate-500/15 dark:text-slate-300',
													file.metadata?.status === 'revising' && 'bg-amber-500/12 text-amber-700 hover:bg-amber-500/18 dark:text-amber-300',
													file.metadata?.status === 'final' && 'bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/18 dark:text-emerald-300',
													!file.metadata?.status && 'text-muted-foreground hover:text-foreground',
												)}
												aria-label={file.metadata?.status ? `Change draft stage from ${SCENE_STATUS_LABELS[file.metadata.status]}` : 'Set draft stage'}
											>
												{file.metadata?.status ? SCENE_STATUS_LABELS[file.metadata.status] : 'Set stage'}
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
											<DropdownMenuLabel>Draft Stage</DropdownMenuLabel>
											<DropdownMenuSeparator />
											<DropdownMenuRadioGroup
												value={file.metadata?.status ?? 'none'}
												onValueChange={(value) =>
													handleQuickStatusChange(file, value as SceneStatus | 'none')
												}
											>
												<DropdownMenuRadioItem value="draft">Draft</DropdownMenuRadioItem>
												<DropdownMenuRadioItem value="revising">Revising</DropdownMenuRadioItem>
												<DropdownMenuRadioItem value="final">Final</DropdownMenuRadioItem>
												<DropdownMenuRadioItem value="none">No draft stage</DropdownMenuRadioItem>
											</DropdownMenuRadioGroup>
										</DropdownMenuContent>
									</DropdownMenu>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												onClick={(event) => event.stopPropagation()}
												className="h-6 w-6 opacity-100 text-muted-foreground hover:text-foreground shrink-0 md:opacity-0 md:group-hover:opacity-100"
											>
												<MoreVertical className="w-3 h-3" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={(event) => { event.stopPropagation(); openEditDialog(file) }}>
												<Pencil className="w-4 h-4 mr-2" /> Edit Details
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-destructive focus:text-destructive"
												onClick={(event) => {
													event.stopPropagation()
													setFileToDelete(file)
												}}
											>
												<Trash2 className="w-4 h-4 mr-2" /> Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						)
					})}
				</div>
			</ScrollArea>
			<FileDetailsDialog
				key={`${fileDialogMode}-${fileDialogTarget?.id ?? 'new'}-${fileDialogSessionKey}`}
				open={isFileDialogOpen}
				onOpenChange={(open) => {
					setIsFileDialogOpen(open)
					if (!open) {
						setFileDialogTarget(null)
					}
				}}
				mode={fileDialogMode}
				initialValue={fileDialogInitialValue}
				onSave={handleSaveFileDetails}
			/>
			<Dialog open={isSaveViewOpen} onOpenChange={setIsSaveViewOpen}>
				<DialogContent className="bg-card border-border sm:max-w-[420px]">
								<DialogHeader>
									<DialogTitle>Save This Filter</DialogTitle>
									<DialogDescription>
										Name this filter so you can reopen it from the contents sidebar or Quick Find.
									</DialogDescription>
								</DialogHeader>
					<div className="space-y-3 py-2">
						<Input
							value={savedViewName}
							onChange={(event) => setSavedViewName(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									handleSaveCurrentView()
								}
							}}
							placeholder="Rook revisions"
							autoFocus
							className="bg-background"
						/>
						<div className="rounded-lg border border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
							{getProjectFileFilterSummary(fileFilters)}
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => setIsSaveViewOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handleSaveCurrentView}
							disabled={!savedViewName.trim()}
						>
							Save Filter
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<ConfirmActionDialog
				open={!!fileToDelete}
				onOpenChange={(open) => {
					if (!open) {
						setFileToDelete(null)
					}
				}}
				title={fileToDelete ? `Delete ${fileToDelete.type === 'note' ? 'Note' : 'Chapter'}` : 'Delete Chapter or Note'}
				description={
					fileToDelete
						? `Delete "${fileToDelete.title}" and its saved versions from this device?`
						: 'Delete this chapter or note and its saved versions from this device?'
				}
				confirmLabel="Delete"
				onConfirm={confirmDeleteFile}
			/>
			<ConfirmActionDialog
				open={!!viewToDelete}
				onOpenChange={(open) => {
					if (!open) {
						setViewToDelete(null)
					}
				}}
				title="Delete Saved Filter"
				description={
					viewToDelete
						? `Delete the saved filter "${viewToDelete.title}"?`
						: 'Delete this saved filter?'
				}
				confirmLabel="Delete Filter"
				onConfirm={handleDeleteView}
			/>
		</div>
	)
}

function getUniqueMetadataValues(
	files: ProjectFile[],
	key: 'pov' | 'location',
): string[] {
	const uniqueValues = new Set<string>()
	for (const file of files) {
		const value = file.metadata?.[key]?.trim()
		if (value) {
			uniqueValues.add(value)
		}
	}

	return Array.from(uniqueValues).sort((left, right) => left.localeCompare(right))
}

function getActiveFilterCount(filters: ProjectFileFilters): number {
	return [
		Boolean(filters.query.trim()),
		filters.type !== 'all',
		filters.status !== 'all',
		Boolean(filters.pov),
		Boolean(filters.location),
	].filter(Boolean).length
}

function FilterToggleButton({
	label,
	isActive,
	onClick,
}: {
	label: string
	isActive: boolean
	onClick: () => void
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			onClick={onClick}
			className={cn(
				'h-7 px-2 text-[11px]',
				isActive ? 'bg-sidebar-accent text-sidebar-primary' : 'text-muted-foreground hover:text-foreground',
			)}
		>
			{label}
		</Button>
	)
}
