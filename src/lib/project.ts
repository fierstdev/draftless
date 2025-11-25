import * as Y from 'yjs'

export type FileType = 'chapter' | 'note' | 'folder'

export interface ProjectFile {
	id: string
	title: string
	type: FileType
	order: number // For sorting
	updatedAt: number
}

export class ProjectManager {
	private map: Y.Map<any>

	constructor(ydoc: Y.Doc) {
		this.map = ydoc.getMap('draftless-project-files')
	}

	create(title: string, type: FileType = 'chapter') {
		const id = crypto.randomUUID()
		const file: ProjectFile = {
			id,
			title,
			type,
			order: this.getAll().length, // Append to end
			updatedAt: Date.now()
		}
		this.map.set(id, file)
		return id
	}

	update(id: string, updates: Partial<ProjectFile>) {
		const current = this.map.get(id)
		if (current) {
			this.map.set(id, { ...current, ...updates, updatedAt: Date.now() })
		}
	}

	delete(id: string) {
		this.map.delete(id)
	}

	getAll(): ProjectFile[] {
		const files = Array.from(this.map.values()) as ProjectFile[]
		return files.sort((a, b) => a.order - b.order)
	}
}