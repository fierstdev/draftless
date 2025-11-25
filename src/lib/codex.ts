import * as Y from 'yjs'

export type EntityType = 'character' | 'location' | 'item' | 'lore'

export interface CodexEntity {
	id: string
	name: string
	type: EntityType
	description: string
	color: string // For the highlight underline
}

export class CodexManager {
	private map: Y.Map<any>

	constructor(ydoc: Y.Doc) {
		this.map = ydoc.getMap('draftless-codex')
	}

	add(entity: Omit<CodexEntity, 'id'>) {
		const id = crypto.randomUUID()
		this.map.set(id, { ...entity, id })
		return id
	}

	update(id: string, updates: Partial<CodexEntity>) {
		const current = this.map.get(id)
		if (current) {
			this.map.set(id, { ...current, ...updates })
		}
	}

	delete(id: string) {
		this.map.delete(id)
	}

	getAll(): CodexEntity[] {
		return Array.from(this.map.values()) as CodexEntity[]
	}

	// Scan text to find known entities
	scan(text: string): CodexEntity[] {
		const entities = this.getAll()
		return entities.filter(e => text.toLowerCase().includes(e.name.toLowerCase()))
	}
}