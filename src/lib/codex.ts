import * as Y from 'yjs'

export type EntityType = 'character' | 'location' | 'item' | 'lore'

export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
	character: '#3b82f6',
	location: '#10b981',
	item: '#f59e0b',
	lore: '#8b5cf6',
}

export interface CodexEntity {
	id: string
	name: string
	type: EntityType
	description: string
	color: string
	aliases: string[]
}

type StoredCodexEntity = Omit<CodexEntity, 'aliases'> & { aliases?: string[] }

export class CodexManager {
	private map: Y.Map<StoredCodexEntity>

	constructor(ydoc: Y.Doc) {
		this.map = ydoc.getMap<StoredCodexEntity>('draftless-codex')
	}

	add(entity: Omit<StoredCodexEntity, 'id'>) {
		const id = crypto.randomUUID()
		this.map.set(id, normalizeEntity({ ...entity, id }))
		return id
	}

	update(id: string, updates: Partial<StoredCodexEntity>) {
		const current = this.map.get(id)
		if (current) {
			this.map.set(id, normalizeEntity({ ...current, ...updates, id }))
		}
	}

	delete(id: string) {
		this.map.delete(id)
	}

	getAll(): CodexEntity[] {
		return Array.from(this.map.values()).map((entity) => normalizeEntity(entity))
	}

	// Scan text to find known entities
	scan(text: string): CodexEntity[] {
		const entities = this.getAll()
		const normalizedText = text.toLowerCase()
		return entities.filter((entity) =>
			getEntityTerms(entity).some((term) => normalizedText.includes(term.toLowerCase())),
		)
	}
}

export function getEntityTerms(entity: Pick<CodexEntity, 'name' | 'aliases'>): string[] {
	return dedupeTerms([entity.name, ...entity.aliases])
}

export function getEntitySearchText(entity: Pick<CodexEntity, 'name' | 'type' | 'description' | 'aliases'>): string {
	return `${getEntityTerms(entity).join(' ')} ${entity.type} ${entity.description}`.trim()
}

export function getEntityColor(type: EntityType): string {
	return ENTITY_TYPE_COLORS[type] ?? '#64748b'
}

function normalizeEntity(entity: StoredCodexEntity): CodexEntity {
	return {
		...entity,
		aliases: sanitizeAliases(entity.aliases, entity.name),
	}
}

function sanitizeAliases(aliases: string[] | undefined, name: string): string[] {
	return dedupeTerms(aliases ?? []).filter((alias) => alias.toLowerCase() !== name.trim().toLowerCase())
}

function dedupeTerms(terms: string[]): string[] {
	const seen = new Set<string>()
	const uniqueTerms: string[] = []

	for (const rawTerm of terms) {
		const normalizedTerm = rawTerm.trim()
		const dedupeKey = normalizedTerm.toLowerCase()
		if (!normalizedTerm || seen.has(dedupeKey)) continue

		seen.add(dedupeKey)
		uniqueTerms.push(normalizedTerm)
	}

	return uniqueTerms
}
