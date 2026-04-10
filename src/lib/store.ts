import { create } from 'zustand'
import { Editor } from '@tiptap/react'
import {
	DEFAULT_PROJECT_FILE_FILTERS,
	normalizeProjectFileFilters,
	type ProjectFileFilters,
} from './project'
import { type DocumentMeta } from './storage'

export interface EditorJumpTarget {
	id: string
	fileId: string
	matchText: string
	occurrenceInFile: number
}

interface AppState {
	// Navigation (The Project/Book)
	currentDoc: DocumentMeta | null
	setCurrentDoc: (doc: DocumentMeta | null) => void

	// Sidebar Navigation
	sidebarTab: 'files' | 'history' | 'codex'
	setSidebarTab: (tab: 'files' | 'history' | 'codex') => void
	fileFilters: ProjectFileFilters
	updateFileFilters: (updates: Partial<ProjectFileFilters>) => void
	resetFileFilters: () => void
	activeFileViewId: string | null
	applySavedFileView: (viewId: string, filters: ProjectFileFilters) => void

	// Active File State (The "Chapter")
	activeFileId: string | null
	setActiveFileId: (id: string | null) => void
	openFile: (id: string) => void // Helper alias
	closeFile: (id: string) => void

	// Editor State
	editor: Editor | null
	setEditor: (editor: Editor | null) => void
	pendingJumpTarget: EditorJumpTarget | null
	setPendingJumpTarget: (target: EditorJumpTarget | null) => void
	clearPendingJumpTarget: () => void
	isFocusMode: boolean
	setFocusMode: (enabled: boolean) => void
	toggleFocusMode: () => void

	// Status & Stats
	collabStatus: 'loading' | 'connected' | 'offline'
	setCollabStatus: (status: 'loading' | 'connected' | 'offline') => void
	wordCount: number
	setWordCount: (count: number) => void

	// Split View State
	isSplitView: boolean
	setSplitView: (open: boolean) => void
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
		sidebarTab: 'files',
		activeFileId: null,
		primaryFileId: null,
		secondaryFileId: null,
		isSplitView: false,
		activePane: 'primary',
		editor: null,
		pendingJumpTarget: null,
		wordCount: 0,
		collabStatus: 'loading',
		fileFilters: DEFAULT_PROJECT_FILE_FILTERS,
		activeFileViewId: null,
		isFocusMode: false,
	}),

	sidebarTab: 'files',
	setSidebarTab: (sidebarTab) => set({ sidebarTab }),
	fileFilters: DEFAULT_PROJECT_FILE_FILTERS,
	updateFileFilters: (updates) =>
		set((state) => ({
			fileFilters: normalizeProjectFileFilters({ ...state.fileFilters, ...updates }),
			activeFileViewId: null,
		})),
	resetFileFilters: () =>
		set({
			fileFilters: DEFAULT_PROJECT_FILE_FILTERS,
			activeFileViewId: null,
		}),
	activeFileViewId: null,
	applySavedFileView: (viewId, filters) =>
		set({
			fileFilters: normalizeProjectFileFilters(filters),
			activeFileViewId: viewId,
			sidebarTab: 'files',
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
	closeFile: (id) =>
		set((state) => {
			const nextPrimary = state.primaryFileId === id ? null : state.primaryFileId
			const nextSecondary = state.secondaryFileId === id ? null : state.secondaryFileId
			const shouldDisableSplit = state.isSplitView && (!nextPrimary || !nextSecondary)
			const promotedPrimary = !nextPrimary && state.isSplitView ? nextSecondary : nextPrimary

			return {
				activeFileId: state.activeFileId === id ? promotedPrimary ?? null : state.activeFileId,
				primaryFileId: promotedPrimary ?? null,
				secondaryFileId: shouldDisableSplit ? null : nextSecondary,
				isSplitView: shouldDisableSplit ? false : state.isSplitView,
				activePane: shouldDisableSplit ? 'primary' : state.activePane,
				editor: state.activeFileId === id ? null : state.editor,
				pendingJumpTarget:
					state.pendingJumpTarget?.fileId === id ? null : state.pendingJumpTarget,
				wordCount: state.activeFileId === id ? 0 : state.wordCount,
			}
		}),

	// Editor Instance
	editor: null,
	setEditor: (editor) => set({ editor }),
	pendingJumpTarget: null,
	setPendingJumpTarget: (pendingJumpTarget) => set({ pendingJumpTarget }),
	clearPendingJumpTarget: () => set({ pendingJumpTarget: null }),
	isFocusMode: false,
	setFocusMode: (isFocusMode) => set({ isFocusMode }),
	toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),

	collabStatus: 'loading',
	setCollabStatus: (collabStatus) => set({ collabStatus }),

	wordCount: 0,
	setWordCount: (wordCount) => set({ wordCount }),

	// Split View Defaults
	isSplitView: false,
	setSplitView: (open) =>
		set((state) => {
			if (open) {
				return {
					isSplitView: true,
					secondaryFileId: state.secondaryFileId ?? state.primaryFileId,
					activePane: state.primaryFileId ? 'secondary' : state.activePane,
				}
			}

			return {
				isSplitView: false,
				activePane: 'primary',
			}
		}),
	toggleSplitView: () => {
		const { isSplitView, setSplitView } = get()
		setSplitView(!isSplitView)
	},
	activePane: 'primary',
	setActivePane: (pane) => set({ activePane: pane }),
	primaryFileId: null,
	secondaryFileId: null,
}))
