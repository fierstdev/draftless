import { create } from 'zustand'
import { Editor } from '@tiptap/react'
import { type DocumentMeta } from './storage'

interface AppState {
	// The High-Level "Book" (Project)
	currentDoc: DocumentMeta | null
	setCurrentDoc: (doc: DocumentMeta | null) => void

	// The Specific "Chapter" (File) being edited
	activeFileId: string | null
	setActiveFileId: (id: string | null) => void

	// Editor State
	editor: Editor | null
	setEditor: (editor: Editor | null) => void

	collabStatus: 'loading' | 'connected' | 'offline'
	setCollabStatus: (status: 'loading' | 'connected' | 'offline') => void

	wordCount: number
	setWordCount: (count: number) => void
}

export const useStore = create<AppState>((set) => ({
	activeFileId: null,
	setActiveFileId: (id) => set({ activeFileId: id }),

	currentDoc: null,
	setCurrentDoc: (doc) => set({ currentDoc: doc }),

	editor: null,
	setEditor: (editor) => set({ editor }),

	collabStatus: 'loading',
	setCollabStatus: (collabStatus) => set({ collabStatus }),

	wordCount: 0,
	setWordCount: (wordCount) => set({ wordCount }),
}))