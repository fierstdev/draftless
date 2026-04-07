import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Quote, Search } from 'lucide-react'
import { type CodexEntity } from '@/lib/codex'
import { findEntityMentions, type SearchTextMatch } from '@/lib/search'
import { useStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import * as Y from 'yjs'

const MENTION_SNIPPET_CONTEXT = 64

interface EntityMentionsDialogProps {
	entity: CodexEntity | null
	projectDoc: Y.Doc
	open: boolean
	onOpenChange: (open: boolean) => void
}

interface MentionPassage {
	id: string
	fileId: string
	fileTitle: string
	fileType: SearchTextMatch['fileType']
	matchIndex: number
	matchText: string
	occurrenceInFile: number
	snippet: string
	ordinals: number[]
	aliasMatches: string[]
}

export function EntityMentionsDialog({ entity, projectDoc, open, onOpenChange }: EntityMentionsDialogProps) {
	const openFile = useStore((state) => state.openFile)
	const setPendingJumpTarget = useStore((state) => state.setPendingJumpTarget)
	const setSidebarTab = useStore((state) => state.setSidebarTab)
	const textCacheRef = useRef(new Map<string, string>())
	const [mentions, setMentions] = useState<SearchTextMatch[] | null>(null)
	const [mentionTextCache, setMentionTextCache] = useState<Map<string, string>>(new Map())

	useEffect(() => {
		if (!open || !entity) return

		let isCancelled = false

		void findEntityMentions(projectDoc, entity, textCacheRef.current)
			.then((results) => {
				if (!isCancelled) {
					setMentions(results)
					setMentionTextCache(new Map(textCacheRef.current))
				}
			})
			.catch((error: unknown) => {
				console.error(error)
				if (!isCancelled) {
					setMentions([])
					setMentionTextCache(new Map())
				}
			})

			return () => {
				isCancelled = true
			}
		}, [entity, open, projectDoc])

	const title = entity?.name ?? 'Codex Entry'
	const isLoading = open && entity !== null && mentions === null
	const mentionList = useMemo(() => mentions ?? [], [mentions])
	const mentionPassages = useMemo(
		() =>
			entity
				? groupMentionPassages(mentionList, entity, mentionTextCache)
				: [],
		[entity, mentionList, mentionTextCache],
	)
	const resultsLabel = useMemo(() => {
		if (isLoading) return 'Searching your draft...'
		if (mentionList.length === 1) return '1 reference found'
		if (mentionPassages.length !== mentionList.length) {
			return `${mentionList.length} references across ${mentionPassages.length} passages`
		}
		return `${mentionList.length} references found`
	}, [isLoading, mentionList.length, mentionPassages.length])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[82vh] w-[94vw] max-w-[980px] flex-col overflow-hidden bg-card border-border p-0 sm:max-w-[980px]">
				<div className="flex min-h-0 flex-1 flex-col md:flex-row">
					<div className="shrink-0 border-b border-border bg-muted/20 p-6 md:w-[280px] md:border-b-0 md:border-r">
						<DialogHeader className="text-left">
							<DialogTitle className="text-xl tracking-tight">{title}</DialogTitle>
							<DialogDescription>{resultsLabel}</DialogDescription>
						</DialogHeader>

						{entity && (
							<div className="mt-5 space-y-4">
								<Badge
									variant="outline"
									className="w-fit capitalize"
									style={{ borderColor: entity.color, color: entity.color }}
								>
									{entity.type}
								</Badge>
								<p className="text-sm leading-relaxed text-muted-foreground">
									{entity.description}
								</p>
								{entity.aliases.length > 0 && (
									<div className="space-y-2">
										<div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
											Aliases
										</div>
										<div className="flex flex-wrap gap-2">
											{entity.aliases.map((alias) => (
												<Badge key={alias} variant="secondary" className="max-w-full truncate">
													{alias}
												</Badge>
											))}
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					<div className="flex min-h-0 min-w-0 flex-1 flex-col">
						<ScrollArea className="min-h-0 flex-1">
							<div className="space-y-3 p-4 md:p-6">
								{isLoading && (
									<div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
										<Loader2 className="h-4 w-4 animate-spin" />
										Scanning your draft for references...
									</div>
								)}

								{!isLoading && mentionList.length === 0 && (
									<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center">
										<Search className="mb-4 h-8 w-8 text-muted-foreground" />
										<h3 className="text-sm font-semibold">No references yet</h3>
										<p className="mt-2 max-w-sm text-sm text-muted-foreground">
											Draftless couldn&apos;t find this codex entry in your writing yet.
										</p>
									</div>
								)}

									{mentionPassages.map((mention) => (
									<button
										key={mention.id}
										type="button"
										onClick={() => {
											setSidebarTab('files')
											setPendingJumpTarget({
												id: mention.id,
												fileId: mention.fileId,
												matchText: mention.matchText,
												occurrenceInFile: mention.occurrenceInFile,
											})
											openFile(mention.fileId)
											onOpenChange(false)
										}}
										className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-muted/20 hover:shadow-md"
									>
											<div className="flex items-center justify-between gap-4">
												<div>
													<div className="text-sm font-semibold text-foreground">{mention.fileTitle}</div>
													<div className="mt-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
													{formatOccurrenceLabel(mention.ordinals)}
														{mention.aliasMatches.length > 0 && (
															<Badge variant="outline" className="h-5 px-2 normal-case tracking-normal">
																{mention.aliasMatches.length === 1
																	? `Matched alternate name: ${mention.aliasMatches[0]}`
																	: `Matched alternate names: ${mention.aliasMatches.join(', ')}`}
															</Badge>
														)}
													</div>
												</div>
												<Badge variant="secondary" className="capitalize">
												{mention.fileType}
											</Badge>
										</div>
										<div className="mt-4 flex gap-3 rounded-xl bg-muted/30 px-4 py-3">
											<Quote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
											<p className="text-sm leading-relaxed text-muted-foreground">
												{highlightSnippet(mention.snippet, entity ? getHighlightTerms(entity) : [])}
											</p>
										</div>
									</button>
								))}
							</div>
						</ScrollArea>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function highlightSnippet(snippet: string, queries: string[]) {
	const terms = [...new Set(queries.map((query) => query.trim()).filter(Boolean))]
	if (terms.length === 0) return snippet

	const pattern = new RegExp(
		`(${terms
			.sort((left, right) => right.length - left.length)
			.map((term) => escapeRegExp(term))
			.join('|')})`,
		'ig',
	)
	const parts = snippet.split(pattern)

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

function normalizeForCompare(value: string): string {
	return value.trim().toLowerCase()
}

function getHighlightTerms(entity: CodexEntity): string[] {
	return [entity.name, ...entity.aliases]
}

function groupMentionPassages(
	mentions: SearchTextMatch[],
	entity: CodexEntity,
	cache: Map<string, string>,
): MentionPassage[] {
	const passages: MentionPassage[] = []
	let currentPassage: {
		baseMention: SearchTextMatch
		ordinals: number[]
		aliasMatches: Set<string>
		snippetStart: number
		snippetEnd: number
	} | null = null

	for (const [index, mention] of mentions.entries()) {
		const snippetStart = Math.max(0, mention.matchIndex - MENTION_SNIPPET_CONTEXT)
		const snippetEnd = mention.matchIndex + mention.matchText.length + MENTION_SNIPPET_CONTEXT

		if (
			!currentPassage ||
			currentPassage.baseMention.fileId !== mention.fileId ||
			snippetStart > currentPassage.snippetEnd
		) {
			if (currentPassage) {
				passages.push(buildMentionPassage(currentPassage, cache))
			}

			currentPassage = {
				baseMention: mention,
				ordinals: [index + 1],
				aliasMatches: new Set<string>(),
				snippetStart,
				snippetEnd,
			}
		} else {
			currentPassage.ordinals.push(index + 1)
			currentPassage.snippetEnd = Math.max(currentPassage.snippetEnd, snippetEnd)
		}

		if (normalizeForCompare(mention.matchText) !== normalizeForCompare(entity.name)) {
			currentPassage.aliasMatches.add(mention.matchText)
		}
	}

	if (currentPassage) {
		passages.push(buildMentionPassage(currentPassage, cache))
	}

	return passages
}

function buildMentionPassage(
	passage: {
		baseMention: SearchTextMatch
		ordinals: number[]
		aliasMatches: Set<string>
		snippetStart: number
		snippetEnd: number
	},
	cache: Map<string, string>,
): MentionPassage {
	const fileText = cache.get(passage.baseMention.fileId)
	const snippet = fileText
		? buildMentionSnippet(fileText, passage.snippetStart, passage.snippetEnd)
		: passage.baseMention.snippet

	return {
		id: `${passage.baseMention.id}:${passage.ordinals[0]}-${passage.ordinals[passage.ordinals.length - 1]}`,
		fileId: passage.baseMention.fileId,
		fileTitle: passage.baseMention.fileTitle,
		fileType: passage.baseMention.fileType,
		matchIndex: passage.baseMention.matchIndex,
		matchText: passage.baseMention.matchText,
		occurrenceInFile: passage.baseMention.occurrenceInFile,
		snippet,
		ordinals: passage.ordinals,
		aliasMatches: Array.from(passage.aliasMatches),
	}
}

function buildMentionSnippet(text: string, start: number, end: number): string {
	const snippetStart = Math.max(0, start)
	const snippetEnd = Math.min(text.length, end)
	const prefix = snippetStart > 0 ? '…' : ''
	const suffix = snippetEnd < text.length ? '…' : ''
	const compact = text
		.slice(snippetStart, snippetEnd)
		.replace(/\s+/g, ' ')
		.trim()

	return `${prefix}${compact}${suffix}`
}

function formatOccurrenceLabel(ordinals: number[]): string {
	if (ordinals.length === 0) return 'Occurrence'
	if (ordinals.length === 1) return `Occurrence ${ordinals[0]}`
	return `Occurrences ${ordinals[0]}-${ordinals[ordinals.length - 1]}`
}
