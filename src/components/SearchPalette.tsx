import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { ComponentType, SVGProps } from 'react'
import {
	Bookmark,
	BookOpen,
	ChevronRight,
	Command,
	FileText,
	FolderSearch,
	History,
	Loader2,
	NotebookPen,
	PanelLeftOpen,
	Search,
	Sparkles,
	SplitSquareHorizontal,
	X,
} from 'lucide-react'
import { EntityMentionsDialog } from '@/components/EntityMentionsDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type CodexEntity, CodexManager } from '@/lib/codex'
import {
	getProjectFileMetadataBadges,
	getProjectFileMetadataSummary,
	getProjectFileFilterSummary,
	ProjectManager,
	type SceneStatus,
} from '@/lib/project'
import {
	findProjectTextMatches,
	parseSearchQuery,
	searchCodexEntities,
	searchProjectFiles,
	searchProjectFileViews,
	type SearchEntityMatch,
	type SearchFileMatch,
	type SearchSavedViewMatch,
	type SearchTextMatch,
} from '@/lib/search'
import { useStore } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import * as Y from 'yjs'

interface SearchPaletteProps {
	projectDoc: Y.Doc
	triggerClassName?: string
}

type PaletteAction = {
	kind: 'action'
	id: string
	title: string
	subtitle: string
	keywords: string
	icon: ComponentType<SVGProps<SVGSVGElement>>
	run: () => void
}

type PaletteItem =
	| PaletteAction
	| SearchFileMatch
	| SearchEntityMatch
	| SearchTextMatch
	| SearchSavedViewMatch

type PaletteSection = {
	id: string
	title: string
	items: PaletteItem[]
}

const isMacPlatform =
	typeof navigator !== 'undefined' && /(Mac|iPhone|iPad|iPod)/i.test(navigator.platform)

export function SearchPalette({ projectDoc, triggerClassName }: SearchPaletteProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [textResults, setTextResults] = useState<SearchTextMatch[] | null>([])
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [mentionsEntity, setMentionsEntity] = useState<CodexEntity | null>(null)
	const inputRef = useRef<HTMLInputElement | null>(null)
	const textCacheRef = useRef(new Map<string, string>())

	const deferredQuery = useDeferredValue(query)
	const parsedQuery = useMemo(() => parseSearchQuery(deferredQuery), [deferredQuery])

	const currentDoc = useStore((state) => state.currentDoc)
	const isSplitView = useStore((state) => state.isSplitView)
	const openFile = useStore((state) => state.openFile)
	const setPendingJumpTarget = useStore((state) => state.setPendingJumpTarget)
	const setCurrentDoc = useStore((state) => state.setCurrentDoc)
	const setSidebarTab = useStore((state) => state.setSidebarTab)
	const toggleSplitView = useStore((state) => state.toggleSplitView)
	const applySavedFileView = useStore((state) => state.applySavedFileView)
	const isMobile = useIsMobile()

	const resetPalette = useCallback(() => {
		setQuery('')
		setTextResults([])
		setSelectedIndex(0)
	}, [])

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen)
			if (nextOpen) {
				setSelectedIndex(0)
			} else {
				resetPalette()
			}
		},
		[resetPalette],
	)

	const actions = useMemo<PaletteAction[]>(() => {
		const projectManager = new ProjectManager(projectDoc)

			const nextActions: PaletteAction[] = [
				{
					kind: 'action',
					id: 'new-chapter',
					title: 'New Chapter',
					subtitle: 'Start a fresh chapter and open it right away',
					keywords: 'create chapter new draft scene',
					icon: NotebookPen,
				run: () => {
					const fileId = projectManager.create('Untitled Chapter', 'chapter')
					setSidebarTab('files')
					openFile(fileId)
				},
			},
				{
					kind: 'action',
					id: 'new-note',
					title: 'New Note',
					subtitle: 'Capture research, scraps, or scene ideas in a note',
					keywords: 'create note research scratchpad ideas',
				icon: FileText,
				run: () => {
					const fileId = projectManager.create('Untitled Note', 'note')
					setSidebarTab('files')
					openFile(fileId)
				},
			},
				{
					kind: 'action',
					id: 'open-contents',
					title: 'Open Contents',
					subtitle: 'Jump back to your chapters, notes, and saved filters',
					keywords: 'sidebar contents chapters notes filters',
				icon: PanelLeftOpen,
				run: () => setSidebarTab('files'),
			},
				{
					kind: 'action',
					id: 'open-history',
					title: 'Open Versions',
					subtitle: 'Browse saved versions of the chapter or note you are working on',
					keywords: 'history versions timeline saved versions branches',
				icon: History,
				run: () => setSidebarTab('history'),
			},
				{
					kind: 'action',
					id: 'open-codex',
					title: 'Open Codex',
					subtitle: 'Browse the people, places, objects, and lore in your story',
					keywords: 'codex lore characters places items reference book',
				icon: BookOpen,
				run: () => setSidebarTab('codex'),
				},
				{
					kind: 'action',
					id: 'return-library',
					title: 'Back to Stories',
					subtitle: currentDoc
						? `Leave ${currentDoc.title} and go back to your stories`
						: 'Go back to your stories',
					keywords: 'stories home library back',
				icon: FolderSearch,
				run: () => setCurrentDoc(null),
			},
			]

			if (!isMobile) {
				nextActions.splice(5, 0, {
					kind: 'action',
					id: 'toggle-split-view',
					title: isSplitView ? 'Close Side-by-Side View' : 'Open Side-by-Side View',
					subtitle: isSplitView
						? 'Return to a single writing view'
						: 'Read two chapters or notes side by side',
					keywords: 'split view compare panes side by side chapter note',
					icon: SplitSquareHorizontal,
					run: () => toggleSplitView(),
				})
			}

			return nextActions
	}, [currentDoc, isMobile, isSplitView, openFile, projectDoc, setCurrentDoc, setSidebarTab, toggleSplitView])

	const entitiesById = useMemo(() => {
		const entityMap = new Map<string, CodexEntity>()
		for (const entity of new CodexManager(projectDoc).getAll()) {
			entityMap.set(entity.id, entity)
		}
		return entityMap
	}, [projectDoc])

	const actionResults = useMemo(() => {
		if (parsedQuery.scope !== 'all' && parsedQuery.scope !== 'actions') return []

		const normalizedQuery = parsedQuery.query.trim().toLowerCase()
		if (!normalizedQuery) {
			return actions
		}

		return actions.filter((action) =>
			`${action.title} ${action.subtitle} ${action.keywords}`.toLowerCase().includes(normalizedQuery),
		)
	}, [actions, parsedQuery])

	const fileResults = useMemo(() => {
		if (parsedQuery.scope !== 'all' && parsedQuery.scope !== 'files') return []
		return searchProjectFiles(projectDoc, parsedQuery.query, parsedQuery.query ? 8 : 6)
	}, [parsedQuery, projectDoc])

	const savedViewResults = useMemo(() => {
		if (parsedQuery.scope !== 'all' && parsedQuery.scope !== 'files') return []
		return searchProjectFileViews(projectDoc, parsedQuery.query, parsedQuery.query ? 6 : 4)
	}, [parsedQuery, projectDoc])

	const entityResults = useMemo(() => {
		if (parsedQuery.scope !== 'all' && parsedQuery.scope !== 'entities') return []
		return searchCodexEntities(projectDoc, parsedQuery.query, parsedQuery.query ? 8 : 6)
	}, [parsedQuery, projectDoc])

	const shouldSearchText =
		open && parsedQuery.scope === 'all' && parsedQuery.query.trim().length >= 2

	useEffect(() => {
		if (!shouldSearchText) return

		let isCancelled = false

		void findProjectTextMatches(projectDoc, parsedQuery.query, {
			cache: textCacheRef.current,
			limit: 18,
		})
			.then((results) => {
				if (!isCancelled) {
					setTextResults(results)
				}
			})
			.catch((error: unknown) => {
				console.error(error)
				if (!isCancelled) {
					setTextResults([])
				}
			})

		return () => {
			isCancelled = true
		}
	}, [parsedQuery.query, projectDoc, shouldSearchText])

	const isSearchingText = shouldSearchText && textResults === null

	const sections = useMemo<PaletteSection[]>(() => {
		const nextSections: PaletteSection[] = []

		if (actionResults.length > 0) {
			nextSections.push({ id: 'actions', title: 'Quick Actions', items: actionResults })
		}

		if (fileResults.length > 0) {
			nextSections.push({ id: 'files', title: 'Chapters & Notes', items: fileResults })
		}

		if (savedViewResults.length > 0) {
			nextSections.push({ id: 'views', title: 'Saved Filters', items: savedViewResults })
		}

		if (entityResults.length > 0) {
			nextSections.push({ id: 'entities', title: 'Codex', items: entityResults })
		}

		const previewTextResults = textResults ?? []
		if (shouldSearchText && previewTextResults.length > 0) {
			nextSections.push({ id: 'text', title: 'Passages', items: previewTextResults })
		}

		return nextSections
	}, [actionResults, entityResults, fileResults, savedViewResults, shouldSearchText, textResults])

	const items = useMemo(() => sections.flatMap((section) => section.items), [sections])
	const itemIndexByKey = useMemo(
		() =>
			new Map(
				items.map((item, index) => [getItemKey(item), index] as const),
			),
			[items],
		)
	const activeIndex = clampIndex(selectedIndex, items.length)
	const selectedItem = items[activeIndex] ?? null

	const handleSelect = useCallback(
		(item: PaletteItem) => {
			if (item.kind === 'action') {
				item.run()
				handleOpenChange(false)
				return
			}

			if (item.kind === 'file') {
				setSidebarTab('files')
				openFile(item.id)
				handleOpenChange(false)
				return
			}

			if (item.kind === 'entity') {
				const entity = entitiesById.get(item.id)
				if (entity) {
					setMentionsEntity(entity)
					handleOpenChange(false)
				}
				return
			}

			if (item.kind === 'saved-view') {
				applySavedFileView(item.viewId, item.filters)
				handleOpenChange(false)
				return
			}

			setSidebarTab('files')
			setPendingJumpTarget({
				id: item.id,
				fileId: item.fileId,
				matchText: item.matchText,
				occurrenceInFile: item.occurrenceInFile,
			})
			openFile(item.fileId)
			handleOpenChange(false)
		},
		[applySavedFileView, entitiesById, handleOpenChange, openFile, setPendingJumpTarget, setSidebarTab],
	)

	const handlePaletteKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLElement>) => {
			if (!open) return

			if (event.key === 'ArrowDown') {
				event.preventDefault()
				setSelectedIndex((current) => {
					const nextBase = clampIndex(current, items.length)
					return items.length === 0 ? 0 : Math.min(nextBase + 1, items.length - 1)
				})
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault()
				setSelectedIndex((current) => Math.max(clampIndex(current, items.length) - 1, 0))
			}

			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault()
				if (selectedItem) {
					handleSelect(selectedItem)
				}
			}
		},
		[handleSelect, items.length, open, selectedItem],
	)

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				handleOpenChange(!open)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [handleOpenChange, open])

	useEffect(() => {
		if (!open) return
		const timeout = window.setTimeout(() => inputRef.current?.focus(), 0)
		return () => window.clearTimeout(timeout)
	}, [open])

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => handleOpenChange(true)}
				aria-label="Open quick find"
				className={cn(
					"h-9 min-w-0 justify-between gap-2 border-border/70 bg-background/70 px-3 text-muted-foreground hover:text-foreground",
					triggerClassName,
				)}
			>
				<span className="flex items-center gap-2">
					<Search className="h-4 w-4" />
					<span className="inline sm:hidden">{isMobile ? 'Quick Find' : 'Find'}</span>
					<span className="hidden sm:inline lg:hidden">Quick Find</span>
					<span className="hidden lg:inline">Search Your Story</span>
				</span>
				<span className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground md:inline-flex">
					{isMacPlatform ? '⌘K' : 'Ctrl K'}
				</span>
			</Button>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent
					showCloseButton={false}
					overlayClassName={cn(
						"bg-black/50",
						isMobile && "bg-background/78 backdrop-blur-[2px]",
					)}
					onKeyDown={handlePaletteKeyDown}
					className={cn(
						"flex flex-col gap-0 overflow-hidden border-border bg-card p-0",
						isMobile
							? "left-3 right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] h-auto w-auto max-w-none translate-x-0 translate-y-0 rounded-[1.25rem] shadow-2xl"
							: "h-[74vh] w-[94vw] max-w-[980px] sm:max-w-[980px]",
					)}
				>
					<div className={cn("border-b border-border", isMobile ? "px-4 py-3" : "px-5 py-4")}>
							<DialogHeader className="text-left">
								<div className="flex items-start justify-between gap-3">
									<DialogTitle className={cn("flex items-center gap-2", isMobile ? "text-base" : "text-lg")}>
										<Command className="h-4 w-4 text-primary" />
										Quick Find
									</DialogTitle>
									{isMobile && (
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => handleOpenChange(false)}
											aria-label="Close quick find"
											className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
										>
											<X className="h-4 w-4" />
										</Button>
									)}
								</div>
								<DialogDescription className={cn(isMobile ? "text-xs leading-relaxed" : "")}>
									Search chapters, notes, codex entries, saved filters, and passages from your draft. Use <code>@</code> for Codex, <code>#</code> for chapters and filters, and <code>&gt;</code> for quick actions.
								</DialogDescription>
							</DialogHeader>
						<div className={cn(isMobile ? "mt-3" : "mt-4")}>
								<Input
									ref={inputRef}
									value={query}
									onChange={(event) => {
										const nextQuery = event.target.value
										const nextParsedQuery = parseSearchQuery(nextQuery)
										const nextShouldSearchText =
											nextParsedQuery.scope === 'all' && nextParsedQuery.query.trim().length >= 2

										setQuery(nextQuery)
										setTextResults(nextShouldSearchText ? null : [])
										setSelectedIndex(0)
									}}
									placeholder="Search chapters, notes, codex, saved filters, or your draft..."
									className={cn("border-border bg-muted/30", isMobile ? "h-10 text-sm" : "h-11 text-base")}
								/>
						</div>
					</div>

					<div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1.12fr)_336px]">
						<div className="min-h-0 border-b border-border md:border-b-0 md:border-r">
							<ScrollArea className="h-full">
								<div className={cn(isMobile ? "p-3.5" : "p-4")}>
									{sections.map((section) => (
										<div key={section.id} className={cn(isMobile ? "mb-4 last:mb-0" : "mb-5 last:mb-0")}>
											<div className="px-2 pb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
												{section.title}
											</div>
											<div className="space-y-1.5">
												{section.items.map((item) => {
													const index = itemIndexByKey.get(getItemKey(item)) ?? 0
													const isSelected = index === activeIndex

													return (
														<button
															key={getItemKey(item)}
															type="button"
															onMouseEnter={() => setSelectedIndex(index)}
															onClick={() => handleSelect(item)}
															className={`flex w-full items-start gap-3 rounded-2xl text-left transition-all ${
																isMobile ? 'px-3 py-3' : 'px-3.5 py-3.5'
															} ${
																isSelected ? 'bg-primary/8 text-foreground shadow-sm ring-1 ring-primary/20' : 'hover:bg-muted/40'
															}`}
														>
															<div className="mt-0.5 shrink-0">
																<ResultIcon item={item} />
															</div>
															<div className="min-w-0 flex-1">
																<div className={cn("truncate font-semibold", isMobile ? "text-[13px]" : "text-sm")}>{getItemTitle(item)}</div>
																<div className={cn("mt-1 line-clamp-2 text-muted-foreground", isMobile ? "text-[12px] leading-relaxed" : "text-sm")}>
																	{getItemSubtitle(item)}
																</div>
															</div>
															{item.kind === 'text' && (
																<ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
															)}
														</button>
													)
												})}
											</div>
										</div>
									))}

									{sections.length === 0 && (
										<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center">
											<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border">
												<Sparkles className="h-5 w-5 text-muted-foreground" />
											</div>
											<h3 className="text-sm font-semibold">No matches yet</h3>
											<p className="mt-2 max-w-sm text-sm text-muted-foreground">
												Try another word, or use <code>@</code>, <code>#</code>, or <code>&gt;</code> to narrow the search.
											</p>
										</div>
									)}

									{shouldSearchText && isSearchingText && (
										<div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground md:hidden">
											<Loader2 className="h-4 w-4 animate-spin" />
											Scanning your draft...
										</div>
									)}
								</div>
							</ScrollArea>
						</div>

						<div className="hidden min-h-0 md:block">
							<div className="flex h-full flex-col bg-muted/15">
								<div className="border-b border-border px-5 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
									Quick Look
								</div>
								<div className="flex-1 p-5">
									{selectedItem ? (
										<div className="space-y-5">
											<div className="flex items-center gap-3">
												<ResultIcon item={selectedItem} />
												<div>
													<div className="text-base font-semibold">{getItemTitle(selectedItem)}</div>
													<div className="mt-1 text-sm text-muted-foreground">{getItemSubtitle(selectedItem)}</div>
												</div>
											</div>

											{selectedItem.kind === 'entity' && (
												<div className="flex flex-wrap gap-2">
													<Badge
														variant="outline"
														className="capitalize"
														style={{ borderColor: selectedItem.color, color: selectedItem.color }}
													>
														{selectedItem.entityType}
													</Badge>
													{selectedItem.aliases.map((alias) => (
														<Badge key={alias} variant="secondary" className="max-w-full truncate">
															{alias}
														</Badge>
													))}
												</div>
											)}

											{selectedItem.kind === 'file' && (
												<div className="flex flex-wrap gap-2">
													<Badge variant="secondary" className="capitalize">
														{selectedItem.fileType}
													</Badge>
													{getProjectFileMetadataBadges(selectedItem, 4).map((badge) => (
														<FileMetadataBadge
															key={`${selectedItem.id}-${badge.key}`}
															label={badge.label}
															status={badge.key === 'status' ? selectedItem.metadata?.status : undefined}
														/>
													))}
												</div>
											)}

											{selectedItem.kind === 'saved-view' && (
												<div className="flex flex-wrap gap-2">
													<Badge variant="secondary">Saved Filter</Badge>
													{selectedItem.matchCount > 0 && (
														<Badge variant="outline">{selectedItem.matchCount} matches</Badge>
													)}
												</div>
											)}

											{selectedItem.kind === 'text' && (
												<Badge variant="secondary" className="capitalize">
													{selectedItem.fileType}
												</Badge>
											)}

											<div className="rounded-2xl border border-border bg-card/85 px-4 py-4 text-sm leading-relaxed text-muted-foreground shadow-sm">
												{renderPreview(selectedItem, parsedQuery.query)}
											</div>

											<div className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-3 text-xs text-muted-foreground">
												Press <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to open it.
											</div>
										</div>
									) : (
										<div className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
											Choose a result to preview it here.
										</div>
									)}

									{shouldSearchText && isSearchingText && (
										<div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
											<Loader2 className="h-4 w-4 animate-spin" />
											Scanning your draft...
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<EntityMentionsDialog
				key={mentionsEntity?.id ?? 'mentions-closed'}
				entity={mentionsEntity}
				projectDoc={projectDoc}
				open={!!mentionsEntity}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) {
						setMentionsEntity(null)
					}
				}}
			/>
		</>
	)
}

function ResultIcon({ item }: { item: PaletteItem }) {
	if (item.kind === 'action') {
		const Icon = item.icon
		return (
			<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
				<Icon className="h-4 w-4" />
			</div>
		)
	}

	if (item.kind === 'file') {
		return (
			<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
				{item.fileType === 'note' ? <NotebookPen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
			</div>
		)
	}

	if (item.kind === 'saved-view') {
		return (
			<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
				<Bookmark className="h-4 w-4" />
			</div>
		)
	}

	if (item.kind === 'entity') {
		return (
			<div
				className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground"
				style={{ backgroundColor: `${item.color}20` }}
			>
				<BookOpen className="h-4 w-4" style={{ color: item.color }} />
			</div>
		)
	}

	return (
		<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
			<Search className="h-4 w-4" />
		</div>
	)
}

function getItemKey(item: PaletteItem): string {
	return item.id
}

function getItemTitle(item: PaletteItem): string {
	if (item.kind === 'action') return item.title
	if (item.kind === 'file') return item.title
	if (item.kind === 'saved-view') return item.title
	if (item.kind === 'entity') return item.name
	return item.fileTitle
}

function getItemSubtitle(item: PaletteItem): string {
	if (item.kind === 'action') return item.subtitle
	if (item.kind === 'file') {
		return getProjectFileMetadataSummary(
			{
				type: item.fileType,
				metadata: item.metadata,
			},
			{ includeType: true },
		) || `${capitalize(item.fileType)} in story order`
	}
	if (item.kind === 'saved-view') {
		if (!item.summary) {
			return item.matchCount === 1 ? 'Matches 1 chapter or note' : `Matches ${item.matchCount} chapters or notes`
		}
		return item.matchCount === 1 ? `${item.summary} • 1 chapter or note` : `${item.summary} • ${item.matchCount} chapters or notes`
	}
	if (item.kind === 'entity') {
		if (item.description) return item.description
		if (item.aliases.length > 0) return `Also known as ${item.aliases.join(', ')}`
		return `Open references for this ${item.entityType}`
	}
	return item.snippet
}

function renderPreview(item: PaletteItem, query: string) {
	if (item.kind === 'action') {
		return item.subtitle
	}

	if (item.kind === 'file') {
		const summary = getProjectFileMetadataSummary(
			{
				type: item.fileType,
				metadata: item.metadata,
			},
			{ includeType: false },
		)
		if (!summary) {
			return `Open ${item.title} and keep writing from there.`
		}

		return `Open ${item.title}. ${summary}.`
	}

	if (item.kind === 'saved-view') {
		const summary = item.summary || getProjectFileFilterSummary(item.filters)
		if (!summary) {
			return item.matchCount === 1
				? 'Open this saved filter and show the 1 matching chapter or note.'
				: `Open this saved filter and show the ${item.matchCount} matching chapters or notes.`
		}

		return item.matchCount === 1
			? `Open this saved filter for ${summary}. It currently matches 1 chapter or note.`
			: `Open this saved filter for ${summary}. It currently matches ${item.matchCount} chapters or notes.`
	}

	if (item.kind === 'entity') {
		if (item.aliases.length > 0) {
			return `Open a story-wide reference view for this codex entry and its alternate names: ${item.aliases.join(', ')}.`
		}
		return 'Open a story-wide reference view for this codex entry and jump between references in reading order.'
	}

	return highlightInline(item.snippet, query)
}

function highlightInline(text: string, query: string) {
	if (!query.trim()) return text

	const pattern = new RegExp(`(${escapeRegExp(query)})`, 'ig')
	const parts = text.split(pattern)

	return parts.map((part, index) =>
		index % 2 === 1 ? (
			<mark key={`${part}-${index}`} className="rounded bg-primary/15 px-0.5 text-foreground">
				{part}
			</mark>
		) : (
			<span key={`${part}-${index}`}>{part}</span>
		),
	)
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1)
}

function clampIndex(index: number, itemCount: number): number {
	if (itemCount <= 0) return 0
	return Math.min(index, itemCount - 1)
}

function FileMetadataBadge({
	label,
	status,
}: {
	label: string
	status?: SceneStatus
}) {
	return (
		<Badge
			variant="secondary"
			className={
				status === 'draft'
					? 'bg-slate-500/10 text-slate-700 dark:text-slate-300'
					: status === 'revising'
						? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
						: status === 'final'
							? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
							: ''
			}
		>
			{label}
		</Badge>
	)
}
