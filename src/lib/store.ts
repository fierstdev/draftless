import { create } from 'zustand'
import { Editor } from '@tiptap/react'
import { type DocumentMeta } from './storage'

interface AppState {
	// Navigation (The Project/Book)
	currentDoc: DocumentMeta | null
	setCurrentDoc: (doc: DocumentMeta | null) => void

	// Active File State (The "Chapter")
	activeFileId: string | null
	setActiveFileId: (id: string | null) => void
	openFile: (id: string) => void // Helper alias

	// Editor State
	editor: Editor | null
	setEditor: (editor: Editor | null) => void

	// Status & Stats
	collabStatus: 'loading' | 'connected' | 'offline'
	setCollabStatus: (status: 'loading' | 'connected' | 'offline') => void
	wordCount: number
	setWordCount: (count: number) => void

	// Split View State
	isSplitView: boolean
	toggleSplitView: () => void
	activePane: 'primary' | 'secondary'
	setActivePane: (pane: 'primary' | 'secondary') => void
	primaryFileId: string | null
	secondaryFileId: string | null
}

export const useStore = create<AppState>((set, get) => ({
	currentDoc: null,
	// When switching projects, reset all view state
	setCurrentDoc: (doc) => set({
		currentDoc: doc,
		activeFileId: null,
		primaryFileId: null,
		secondaryFileId: null,
		isSplitView: false,
		activePane: 'primary'
	}),

	// File Navigation
	activeFileId: null,
	setActiveFileId: (id) => set({ activeFileId: id }),

	// Opens a file in whichever pane is currently focused
	openFile: (id) => {
		const { activePane, isSplitView } = get()

		// Simple mode (No split)
		if (!isSplitView) {
			set({ activeFileId: id, primaryFileId: id })
			return
		}

		// Split View logic
		if (activePane === 'primary') {
			set({ primaryFileId: id, activeFileId: id })
		} else {
			set({ secondaryFileId: id, activeFileId: id })
		}
	},

	// Editor Instance
	editor: null,
	setEditor: (editor) => set({ editor }),

	collabStatus: 'loading',
	setCollabStatus: (collabStatus) => set({ collabStatus }),

	wordCount: 0,
	setWordCount: (wordCount) => set({ wordCount }),

	// Split View Defaults
	isSplitView: false,
	toggleSplitView: () => {
		const { isSplitView, primaryFileId } = get()
		if (!isSplitView) {
			set({ isSplitView: true, secondaryFileId: primaryFileId, activePane: 'secondary' })
		} else {
			set({ isSplitView: false, activePane: 'primary' })
		}
	},
	activePane: 'primary',
	setActivePane: (pane) => set({ activePane: pane }),
	primaryFileId: null,
	secondaryFileId: null,
}))
