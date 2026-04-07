import * as Y from 'yjs'

export type FileType = 'chapter' | 'note' | 'folder'
export type EditableFileType = Exclude<FileType, 'folder'>
export type SceneStatus = 'draft' | 'revising' | 'final'
export type ProjectFileTypeFilter = 'all' | EditableFileType

export interface ProjectFileFilters {
	query: string
	type: ProjectFileTypeFilter
	status: 'all' | SceneStatus
	pov: string
	location: string
}

export interface ProjectFileView {
	id: string
	title: string
	order: number
	createdAt: number
	updatedAt: number
	filters: ProjectFileFilters
}

export interface ProjectFileMetadata {
	status?: SceneStatus
	pov?: string
	location?: string
	timeline?: string
	goal?: string
}

export interface ProjectFile {
	id: string
	title: string
	type: FileType
	order: number // For sorting
	updatedAt: number
	metadata?: ProjectFileMetadata
}

export const SCENE_STATUS_LABELS: Record<SceneStatus, string> = {
	draft: 'Draft',
	revising: 'Revising',
	final: 'Final',
}

export const DEFAULT_PROJECT_FILE_FILTERS: ProjectFileFilters = {
	query: '',
	type: 'all',
	status: 'all',
	pov: '',
	location: '',
}

export function normalizeProjectFileMetadata(
	metadata: Partial<ProjectFileMetadata> | undefined,
): ProjectFileMetadata | undefined {
	if (!metadata) return undefined

	const normalized: ProjectFileMetadata = {
		status: metadata.status,
		pov: normalizeOptionalText(metadata.pov),
		location: normalizeOptionalText(metadata.location),
		timeline: normalizeOptionalText(metadata.timeline),
		goal: normalizeOptionalText(metadata.goal),
	}

	if (
		!normalized.status &&
		!normalized.pov &&
		!normalized.location &&
		!normalized.timeline &&
		!normalized.goal
	) {
		return undefined
	}

	return normalized
}

export function getProjectFileSearchText(file: Pick<ProjectFile, 'title' | 'type' | 'metadata'>): string {
	return [
		file.title,
		file.type,
		file.metadata?.status ? SCENE_STATUS_LABELS[file.metadata.status] : '',
		file.metadata?.pov ?? '',
		file.metadata?.location ?? '',
		file.metadata?.timeline ?? '',
		file.metadata?.goal ?? '',
	]
		.filter(Boolean)
		.join(' ')
}

export function normalizeProjectFileFilters(
	filters: Partial<ProjectFileFilters> | undefined,
): ProjectFileFilters {
	return {
		query: filters?.query?.trim() ?? '',
		type: filters?.type === 'chapter' || filters?.type === 'note' ? filters.type : 'all',
		status:
			filters?.status === 'draft' || filters?.status === 'revising' || filters?.status === 'final'
				? filters.status
				: 'all',
		pov: normalizeOptionalText(filters?.pov) ?? '',
		location: normalizeOptionalText(filters?.location) ?? '',
	}
}

export function hasActiveProjectFileFilters(filters: ProjectFileFilters): boolean {
	return Boolean(
		filters.query.trim() ||
		filters.type !== 'all' ||
		filters.status !== 'all' ||
		filters.pov ||
		filters.location,
	)
}

export function projectFileMatchesFilters(
	file: ProjectFile,
	filters: ProjectFileFilters,
	searchText = getProjectFileSearchText(file),
): boolean {
	if (file.type === 'folder') return false
	if (filters.type !== 'all' && file.type !== filters.type) return false
	if (filters.status !== 'all' && file.metadata?.status !== filters.status) return false
	if (filters.pov && normalizeOptionalText(file.metadata?.pov)?.toLowerCase() !== filters.pov.toLowerCase()) {
		return false
	}
	if (
		filters.location &&
		normalizeOptionalText(file.metadata?.location)?.toLowerCase() !== filters.location.toLowerCase()
	) {
		return false
	}
	if (!filters.query.trim()) return true
	return searchText.toLowerCase().includes(filters.query.trim().toLowerCase())
}

export function getProjectFileFilterSummary(
	filters: ProjectFileFilters,
	options: { includeQuery?: boolean } = {},
): string {
	const parts: string[] = []

	if (filters.type !== 'all') {
		parts.push(filters.type === 'note' ? 'Notes' : 'Chapters')
	}

	if (filters.status !== 'all') {
		parts.push(SCENE_STATUS_LABELS[filters.status])
	}

	if (filters.pov) {
		parts.push(`POV ${filters.pov}`)
	}

	if (filters.location) {
		parts.push(filters.location)
	}

	if (options.includeQuery !== false && filters.query.trim()) {
		parts.push(`Search "${filters.query.trim()}"`)
	}

	return parts.join(' • ')
}

export function areProjectFileFiltersEqual(
	left: ProjectFileFilters,
	right: ProjectFileFilters,
): boolean {
	return (
		left.query === right.query &&
		left.type === right.type &&
		left.status === right.status &&
		left.pov === right.pov &&
		left.location === right.location
	)
}

export function getProjectFileMetadataSummary(
	file: Pick<ProjectFile, 'type' | 'metadata'>,
	options: { includeType?: boolean } = {},
): string {
	const parts: string[] = []

	if (options.includeType ?? true) {
		parts.push(file.type === 'note' ? 'Note' : 'Chapter')
	}

	if (file.metadata?.status) {
		parts.push(SCENE_STATUS_LABELS[file.metadata.status])
	}

	if (file.metadata?.pov) {
		parts.push(`POV ${file.metadata.pov}`)
	}

	if (file.metadata?.location) {
		parts.push(file.metadata.location)
	}

	if (file.metadata?.timeline) {
		parts.push(file.metadata.timeline)
	}

	return parts.join(' • ')
}

export function getProjectFileMetadataBadges(
	file: Pick<ProjectFile, 'metadata'>,
	limit = 3,
): Array<{ key: string; label: string }> {
	const badges: Array<{ key: string; label: string }> = []

	if (file.metadata?.status) {
		badges.push({ key: 'status', label: SCENE_STATUS_LABELS[file.metadata.status] })
	}

	if (file.metadata?.pov) {
		badges.push({ key: 'pov', label: `POV ${file.metadata.pov}` })
	}

	if (file.metadata?.location) {
		badges.push({ key: 'location', label: file.metadata.location })
	}

	if (file.metadata?.timeline) {
		badges.push({ key: 'timeline', label: file.metadata.timeline })
	}

	return badges.slice(0, limit)
}

export class ProjectManager {
	private map: Y.Map<ProjectFile>

	constructor(ydoc: Y.Doc) {
		this.map = ydoc.getMap<ProjectFile>('draftless-project-files')
	}

	create(
		title: string,
		type: EditableFileType = 'chapter',
		metadata?: Partial<ProjectFileMetadata>,
	) {
		const id = crypto.randomUUID()
		const file: ProjectFile = {
			id,
			title,
			type,
			order: this.getAll().length, // Append to end
			updatedAt: Date.now(),
			metadata: normalizeProjectFileMetadata(metadata),
		}
		this.map.set(id, file)
		return id
	}

	update(id: string, updates: Partial<ProjectFile>) {
		const current = this.map.get(id)
		if (current) {
			const nextFile: ProjectFile = { ...current, ...updates, updatedAt: Date.now() }
			if (Object.prototype.hasOwnProperty.call(updates, 'metadata')) {
				nextFile.metadata = normalizeProjectFileMetadata({
					...current.metadata,
					...updates.metadata,
				})
			}
			this.map.set(id, nextFile)
		}
	}

	delete(id: string) {
		this.map.delete(id)
	}

	getAll(): ProjectFile[] {
		const files = Array.from(this.map.values())
		return files.sort((a, b) => a.order - b.order)
	}
}

export class ProjectFileViewManager {
	private map: Y.Map<ProjectFileView>

	constructor(ydoc: Y.Doc) {
		this.map = ydoc.getMap<ProjectFileView>('draftless-project-file-views')
	}

	create(title: string, filters: Partial<ProjectFileFilters>) {
		const id = crypto.randomUUID()
		const view: ProjectFileView = {
			id,
			title: title.trim() || 'Saved Filter',
			order: this.getNextOrder(),
			createdAt: Date.now(),
			updatedAt: Date.now(),
			filters: normalizeProjectFileFilters(filters),
		}
		this.map.set(id, view)
		return id
	}

	update(id: string, updates: Partial<Omit<ProjectFileView, 'id' | 'order' | 'createdAt'>>) {
		const current = this.map.get(id)
		if (!current) return

		this.map.set(id, {
			...current,
			...updates,
			title: updates.title?.trim() || current.title,
			filters: updates.filters ? normalizeProjectFileFilters(updates.filters) : current.filters,
			updatedAt: Date.now(),
		})
	}

	delete(id: string) {
		this.map.delete(id)
	}

	getAll(): ProjectFileView[] {
		return Array.from(this.map.values()).sort((left, right) => left.order - right.order)
	}

	private getNextOrder(): number {
		return this.getAll().reduce((highestOrder, view) => Math.max(highestOrder, view.order), -1) + 1
	}
}

function normalizeOptionalText(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
}
