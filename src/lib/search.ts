import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import Typography from '@tiptap/extension-typography'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { type CodexEntity, CodexManager, getEntitySearchText, getEntityTerms } from './codex'
import { getFileDbName, waitForProviderSync } from './persistence'
import {
	getProjectFileFilterSummary,
	getProjectFileSearchText,
	projectFileMatchesFilters,
	type ProjectFile,
	type ProjectFileFilters,
	type ProjectFileMetadata,
	type ProjectFileView,
	ProjectFileViewManager,
	ProjectManager,
} from './project'

export type SearchScope = 'all' | 'actions' | 'files' | 'entities' | 'text'
type TextSearchMode = 'substring' | 'whole-word'

export interface ParsedSearchQuery {
	raw: string
	scope: SearchScope
	query: string
}

export interface SearchFileMatch {
	kind: 'file'
	id: string
	title: string
	fileType: ProjectFile['type']
	metadata?: ProjectFileMetadata
	order: number
	updatedAt: number
	score: number
}

export interface SearchEntityMatch {
	kind: 'entity'
	id: string
	name: string
	entityType: CodexEntity['type']
	description: string
	color: string
	aliases: string[]
	score: number
}

export interface SearchTextMatch {
	kind: 'text'
	id: string
	fileId: string
	fileTitle: string
	fileType: ProjectFile['type']
	fileOrder: number
	occurrenceInFile: number
	matchIndex: number
	matchText: string
	snippet: string
}

export interface SearchSavedViewMatch {
	kind: 'saved-view'
	id: string
	viewId: string
	title: string
	filters: ProjectFileFilters
	summary: string
	matchCount: number
	score: number
}

export type ProjectSearchResult =
	| SearchFileMatch
	| SearchEntityMatch
	| SearchTextMatch
	| SearchSavedViewMatch

export function parseSearchQuery(rawQuery: string): ParsedSearchQuery {
	const trimmed = rawQuery.trimStart()

	if (trimmed.startsWith('>')) {
		return { raw: rawQuery, scope: 'actions', query: trimmed.slice(1).trim() }
	}

	if (trimmed.startsWith('#')) {
		return { raw: rawQuery, scope: 'files', query: trimmed.slice(1).trim() }
	}

	if (trimmed.startsWith('@')) {
		return { raw: rawQuery, scope: 'entities', query: trimmed.slice(1).trim() }
	}

	return { raw: rawQuery, scope: 'all', query: rawQuery.trim() }
}

export function searchProjectFiles(projectDoc: Y.Doc, query: string, limit = 12): SearchFileMatch[] {
	const files = new ProjectManager(projectDoc)
		.getAll()
		.filter((file) => file.type !== 'folder')

	if (!query.trim()) {
		return files
			.slice(0, limit)
			.map((file) => ({
				kind: 'file',
				id: file.id,
				title: file.title,
				fileType: file.type,
				metadata: file.metadata,
				order: file.order,
				updatedAt: file.updatedAt,
				score: 0,
			}))
	}

	return files
		.map((file) => ({
			file,
			score: fuzzyScore(query, getProjectFileSearchText(file)),
		}))
		.filter((entry): entry is { file: ProjectFile; score: number } => entry.score !== null)
		.sort((left, right) => right.score - left.score || left.file.order - right.file.order)
		.slice(0, limit)
		.map(({ file, score }) => ({
			kind: 'file',
			id: file.id,
			title: file.title,
			fileType: file.type,
			metadata: file.metadata,
			order: file.order,
			updatedAt: file.updatedAt,
			score,
		}))
}

export function searchCodexEntities(projectDoc: Y.Doc, query: string, limit = 10): SearchEntityMatch[] {
	const entities = new CodexManager(projectDoc).getAll()

	if (!query.trim()) {
		return entities.slice(0, limit).map((entity) => ({
			kind: 'entity',
			id: entity.id,
			name: entity.name,
			entityType: entity.type,
			description: entity.description,
			color: entity.color,
			aliases: entity.aliases,
			score: 0,
		}))
	}

	return entities
		.map((entity) => ({
			entity,
			score: fuzzyScore(query, getEntitySearchText(entity)),
		}))
		.filter((entry): entry is { entity: CodexEntity; score: number } => entry.score !== null)
		.sort((left, right) => right.score - left.score || left.entity.name.localeCompare(right.entity.name))
		.slice(0, limit)
		.map(({ entity, score }) => ({
			kind: 'entity',
			id: entity.id,
			name: entity.name,
			entityType: entity.type,
			description: entity.description,
			color: entity.color,
			aliases: entity.aliases,
			score,
		}))
}

export function searchProjectFileViews(
	projectDoc: Y.Doc,
	query: string,
	limit = 8,
): SearchSavedViewMatch[] {
	const views = new ProjectFileViewManager(projectDoc).getAll()
	const files = new ProjectManager(projectDoc)
		.getAll()
		.filter((file) => file.type !== 'folder')

	if (!query.trim()) {
		return views.slice(0, limit).map((view) => mapSavedViewMatch(view, files, 0))
	}

	return views
		.map((view) => ({
			view,
			score: fuzzyScore(query, getSavedViewSearchText(view)),
		}))
		.filter((entry): entry is { view: ProjectFileView; score: number } => entry.score !== null)
		.sort((left, right) => right.score - left.score || left.view.order - right.view.order)
		.slice(0, limit)
		.map(({ view, score }) => mapSavedViewMatch(view, files, score))
}

export async function findProjectTextMatches(
	projectDoc: Y.Doc,
	query: string,
	options: {
		limit?: number
		cache?: Map<string, string>
		mode?: TextSearchMode
	} = {},
): Promise<SearchTextMatch[]> {
	const trimmedQuery = query.trim()
	if (!trimmedQuery) return []

	const files = new ProjectManager(projectDoc)
		.getAll()
		.filter((file) => file.type !== 'folder')

	const results: SearchTextMatch[] = []
	const limit = options.limit ?? 24
	const mode = options.mode ?? 'substring'

	for (const file of files) {
		const text = await loadFileText(file.id, options.cache)
		const matches = collectTextMatches(text, trimmedQuery, mode)

		for (const [occurrenceInFile, match] of matches.entries()) {
			results.push({
				kind: 'text',
				id: `${file.id}:${match.index}:${match.matchText}`,
				fileId: file.id,
				fileTitle: file.title,
				fileType: file.type,
				fileOrder: file.order,
				occurrenceInFile,
				matchIndex: match.index,
				matchText: match.matchText,
				snippet: buildSnippet(text, match.index, match.index + match.matchText.length),
			})

			if (results.length >= limit) {
				return results
			}
		}
	}

	return results
}

export async function findEntityMentions(
	projectDoc: Y.Doc,
	entity: CodexEntity,
	cache?: Map<string, string>,
): Promise<SearchTextMatch[]> {
	const terms = getEntityTerms(entity).sort((left, right) => right.length - left.length)
	const matches = await Promise.all(
		terms.map((term) =>
			findProjectTextMatches(projectDoc, term, {
				cache,
				mode: 'whole-word',
				limit: 100,
			}),
		),
	)

	const flattenedMatches = matches
		.flat()
		.sort(
			(left, right) =>
				left.fileOrder - right.fileOrder ||
				left.matchIndex - right.matchIndex ||
				right.matchText.length - left.matchText.length,
		)

	const dedupedMatches: SearchTextMatch[] = []

	for (const match of flattenedMatches) {
		const overlapsExistingMatch = dedupedMatches.some((existingMatch) => {
			if (existingMatch.fileId !== match.fileId) return false

			const existingEnd = existingMatch.matchIndex + existingMatch.matchText.length
			const nextEnd = match.matchIndex + match.matchText.length
			return match.matchIndex < existingEnd && nextEnd > existingMatch.matchIndex
		})

		if (!overlapsExistingMatch) {
			dedupedMatches.push(match)
		}
	}

	const occurrencesByTerm = new Map<string, number>()
	return dedupedMatches.slice(0, 100).map((match) => {
		const occurrenceKey = `${match.fileId}:${normalizeText(match.matchText)}`
		const occurrenceInFile = occurrencesByTerm.get(occurrenceKey) ?? 0
		occurrencesByTerm.set(occurrenceKey, occurrenceInFile + 1)

		return {
			...match,
			occurrenceInFile,
		}
	})
}

function normalizeText(value: string): string {
	return value.toLowerCase().trim()
}

function getSavedViewSearchText(view: ProjectFileView): string {
	return [view.title, getProjectFileFilterSummary(view.filters), Object.values(view.filters).join(' ')]
		.filter(Boolean)
		.join(' ')
}

function mapSavedViewMatch(
	view: ProjectFileView,
	files: ProjectFile[],
	score: number,
): SearchSavedViewMatch {
	const matchCount = files.filter((file) =>
		projectFileMatchesFilters(file, view.filters, getProjectFileSearchText(file)),
	).length

	return {
		kind: 'saved-view',
		id: `saved-view:${view.id}`,
		viewId: view.id,
		title: view.title,
		filters: view.filters,
		summary: getProjectFileFilterSummary(view.filters),
		matchCount,
		score,
	}
}

function fuzzyScore(query: string, candidate: string): number | null {
	const normalizedQuery = normalizeText(query)
	const normalizedCandidate = normalizeText(candidate)

	if (!normalizedQuery) return 0
	if (!normalizedCandidate) return null

	if (normalizedCandidate.includes(normalizedQuery)) {
		return 1000 - normalizedCandidate.indexOf(normalizedQuery) * 4 - (normalizedCandidate.length - normalizedQuery.length)
	}

	const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean)
	if (queryTokens.length > 1 && queryTokens.every((token) => normalizedCandidate.includes(token))) {
		return 700 - queryTokens.reduce((score, token) => score + normalizedCandidate.indexOf(token), 0)
	}

	let score = 0
	let searchIndex = 0

	for (const character of normalizedQuery) {
		const nextIndex = normalizedCandidate.indexOf(character, searchIndex)
		if (nextIndex === -1) {
			return null
		}

		score += nextIndex === searchIndex ? 10 : 4
		if (nextIndex === 0 || /[\s/_-]/.test(normalizedCandidate[nextIndex - 1] ?? '')) {
			score += 8
		}

		searchIndex = nextIndex + 1
	}

	return score - (normalizedCandidate.length - normalizedQuery.length)
}

function collectTextMatches(text: string, query: string, mode: TextSearchMode): Array<{ index: number; matchText: string }> {
	const safeQuery = escapeRegExp(query.trim())
	if (!safeQuery) return []

	const regex =
		mode === 'whole-word'
			? new RegExp(`\\b${safeQuery}\\b`, 'gi')
			: new RegExp(safeQuery, 'gi')

	const matches: Array<{ index: number; matchText: string }> = []
	for (const match of text.matchAll(regex)) {
		const index = match.index ?? -1
		if (index < 0) continue
		matches.push({ index, matchText: match[0] })
	}

	return matches
}

function buildSnippet(text: string, start: number, end: number, context = 64): string {
	const snippetStart = Math.max(0, start - context)
	const snippetEnd = Math.min(text.length, end + context)
	const prefix = snippetStart > 0 ? '…' : ''
	const suffix = snippetEnd < text.length ? '…' : ''
	const compact = text
		.slice(snippetStart, snippetEnd)
		.replace(/\s+/g, ' ')
		.trim()

	return `${prefix}${compact}${suffix}`
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function loadFileText(fileId: string, cache?: Map<string, string>): Promise<string> {
	const cached = cache?.get(fileId)
	if (cached !== undefined) {
		return cached
	}

	const text = await new Promise<string>((resolve, reject) => {
		const doc = new Y.Doc()
		const provider = new IndexeddbPersistence(getFileDbName(fileId), doc)
		let editor: Editor | null = null

		const cleanup = async () => {
			editor?.destroy()
			await provider.destroy()
			doc.destroy()
		}

		void waitForProviderSync(provider)
			.then(() => {
				editor = new Editor({
					extensions: [
						StarterKit,
						Typography,
						Collaboration.configure({ document: doc }),
					],
				})

				setTimeout(() => {
					try {
						resolve(editor?.getText() ?? '')
					} catch (error) {
						reject(error)
					} finally {
						void cleanup()
					}
				}, 50)
			})
			.catch((error) => {
				void cleanup()
				reject(error)
			})
	})

	cache?.set(fileId, text)
	return text
}
