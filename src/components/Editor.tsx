import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Collaboration from '@tiptap/extension-collaboration'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'
import { TextSelection } from '@tiptap/pm/state'

import { EntityHighlighter } from './editor/EntityExtension'
import { JumpHighlightExtension, jumpHighlightKey } from './editor/JumpHighlightExtension'
import { SuggestionAdd, SuggestionDel, CommentMark } from './editor/ReviewExtension'
import { CodexEntityDialog } from './CodexEntityDialog'
import { CodexOverlay } from './CodexHoverCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/use-mobile'
import { findAllTextOccurrenceRanges, findTextOccurrenceRange, type TextOccurrenceRange } from '@/lib/editor-jump'
import { EMPTY_ENTITY_FORM, type CodexEntityFormState } from '@/lib/codex-form'
import { getProjectFileMetadataBadges, getProjectFileMetadataSummary, ProjectManager } from '@/lib/project'
import { useStore } from '@/lib/store'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import {
	Bold, Italic, Strikethrough, Heading2, List, ListOrdered, Quote, Code, BookOpen, Search, ChevronUp, ChevronDown, Replace, X, Undo2, Redo2, BetweenHorizonalEnd, Pilcrow, Focus, Minimize2, MoreHorizontal, Type
} from 'lucide-react';
import clsx from 'clsx'

interface EditorProps {
	ydoc: Y.Doc
	docId: string
	projectDoc: Y.Doc
	isActivePane: boolean
	onFocus: () => void  
	className?: string
}

export function Editor({ ydoc, docId, projectDoc, isActivePane, onFocus, className }: EditorProps) {
	const isMobile = useIsMobile()
	const setEditor = useStore((state) => state.setEditor)
	const setCollabStatus = useStore((state) => state.setCollabStatus)
	const setWordCount = useStore((state) => state.setWordCount)
	const setSidebarTab = useStore((state) => state.setSidebarTab)
	const isFocusMode = useStore((state) => state.isFocusMode)
	const toggleFocusMode = useStore((state) => state.toggleFocusMode)
	const pendingJumpTarget = useStore((state) => state.pendingJumpTarget)
	const clearPendingJumpTarget = useStore((state) => state.clearPendingJumpTarget)
	const highlightTimeoutRef = useRef<number | null>(null)
	const findScrollFrameRef = useRef<number | null>(null)
	const editorScrollRegionRef = useRef<HTMLDivElement | null>(null)
	const findInputRef = useRef<HTMLInputElement | null>(null)
	const toolbarSelectionRef = useRef<{ from: number; to: number } | null>(null)
	const [isCodexDialogOpen, setIsCodexDialogOpen] = useState(false)
	const [codexDialogSession, setCodexDialogSession] = useState(0)
	const [codexDialogSeed, setCodexDialogSeed] = useState<CodexEntityFormState>(EMPTY_ENTITY_FORM)
	const [isFindBarOpen, setIsFindBarOpen] = useState(false)
	const [showReplaceControls, setShowReplaceControls] = useState(false)
	const [findQuery, setFindQuery] = useState('')
	const [replaceQuery, setReplaceQuery] = useState('')
	const [findMatches, setFindMatches] = useState<TextOccurrenceRange[]>([])
	const [activeFindMatchIndex, setActiveFindMatchIndex] = useState(0)
	const [isMobileFormatDrawerOpen, setIsMobileFormatDrawerOpen] = useState(false)
	const [isMobileMoreDrawerOpen, setIsMobileMoreDrawerOpen] = useState(false)
	// 1. Persistence
	useEffect(() => {
		const provider = new IndexeddbPersistence(`draftless-doc-${docId}`, ydoc)

		const updateStatus = () => {
			if (isActivePane) setCollabStatus(provider.synced ? 'connected' : 'offline')
		}

		if (provider.synced) updateStatus()
		provider.on('synced', updateStatus)
		provider.on('connection-error', () => {
			if (isActivePane) setCollabStatus('offline')
		})

		return () => {
			void provider.destroy()
		}
	}, [ydoc, docId, isActivePane, setCollabStatus])

	// 2. Tiptap Config
	const editor = useEditor({
		extensions: [
			StarterKit.configure({ undoRedo: false }),
			Placeholder.configure({
				placeholder: "Start writing...",
				emptyEditorClass: 'is-editor-empty before:text-muted-foreground before:content-[attr(data-placeholder)] before:float-left before:pointer-events-none'
			}),
			Collaboration.configure({ document: ydoc }),
			Typography,
			CharacterCount,
			EntityHighlighter(projectDoc),
			JumpHighlightExtension,
			SuggestionAdd,
			SuggestionDel,
			CommentMark,
		],
		editorProps: {
			attributes: {
				class: 'draftless-editor max-w-none focus:outline-none min-h-[60vh] text-foreground selection:bg-primary/20 selection:text-primary',
			},
		},
		onFocus: () => {
			onFocus() // Tell App we are active
		},
		onUpdate: ({ editor }) => {
			// Only update global word count if active pane
			if (isActivePane) {
				setWordCount(editor.storage.characterCount.words())
			}
		},
	}, [ydoc, projectDoc])

	const scrollFindMatchIntoView = useCallback((match: TextOccurrenceRange) => {
		if (!editor || editor.isDestroyed) return

		const scrollRegion = editorScrollRegionRef.current
		if (!scrollRegion) return

		if (findScrollFrameRef.current !== null) {
			window.cancelAnimationFrame(findScrollFrameRef.current)
		}

		findScrollFrameRef.current = window.requestAnimationFrame(() => {
			findScrollFrameRef.current = null

			try {
				const startCoords = editor.view.coordsAtPos(match.from)
				const endCoords = editor.view.coordsAtPos(Math.max(match.to - 1, match.from))
				const scrollRegionRect = scrollRegion.getBoundingClientRect()
				const matchTop = Math.min(startCoords.top, endCoords.top)
				const matchBottom = Math.max(startCoords.bottom, endCoords.bottom)
				const padding = 28
				const isAboveViewport = matchTop < scrollRegionRect.top + padding
				const isBelowViewport = matchBottom > scrollRegionRect.bottom - padding

				if (isAboveViewport || isBelowViewport) {
					const targetTop =
						scrollRegion.scrollTop +
						(matchTop - scrollRegionRect.top) -
						scrollRegion.clientHeight * 0.35

					scrollRegion.scrollTo({
						top: Math.max(targetTop, 0),
						behavior: 'smooth',
					})
				}
			} catch (error) {
				console.error('Failed to scroll to active find match', error)
			}
		})
	}, [editor])

	// 3. Sync to Global Store (Only if Active Pane)
	useEffect(() => {
		if (isActivePane && editor && !editor.isDestroyed) {
			setEditor(editor)
			setWordCount(editor.storage.characterCount.words())
		}
	}, [isActivePane, editor, setEditor, setWordCount])

	useEffect(() => {
		if (!editor || editor.isDestroyed) return

		const syncToolbarSelection = () => {
			const { from, to } = editor.state.selection
			toolbarSelectionRef.current = { from, to }
		}

		syncToolbarSelection()
		editor.on('selectionUpdate', syncToolbarSelection)
		editor.on('transaction', syncToolbarSelection)

		return () => {
			editor.off('selectionUpdate', syncToolbarSelection)
			editor.off('transaction', syncToolbarSelection)
		}
	}, [editor])

	useEffect(() => {
		return () => {
			if (highlightTimeoutRef.current !== null) {
				window.clearTimeout(highlightTimeoutRef.current)
			}
			if (findScrollFrameRef.current !== null) {
				window.cancelAnimationFrame(findScrollFrameRef.current)
			}
		}
	}, [])

	useEffect(() => {
		if (!editor || editor.isDestroyed || !pendingJumpTarget || pendingJumpTarget.fileId !== docId) {
			return
		}

		let isDisposed = false

		const clearHighlight = () => {
			if (!editor.isDestroyed) {
				editor.view.dispatch(editor.state.tr.setMeta(jumpHighlightKey, { clear: true }))
			}
		}

		const clearHighlightTimeout = () => {
			if (highlightTimeoutRef.current !== null) {
				window.clearTimeout(highlightTimeoutRef.current)
				highlightTimeoutRef.current = null
			}
		}

		const attemptJump = (): boolean => {
			const range = findTextOccurrenceRange(editor.state.doc, {
				text: pendingJumpTarget.matchText,
				occurrenceInFile: pendingJumpTarget.occurrenceInFile,
			})
			if (!range) return false

			clearPendingJumpTarget()
			clearHighlightTimeout()

			editor.view.dispatch(
				editor.state.tr
					.setSelection(TextSelection.create(editor.state.doc, range.to))
					.scrollIntoView()
					.setMeta(jumpHighlightKey, { from: range.from, to: range.to }),
			)
			editor.commands.focus(range.to)

			highlightTimeoutRef.current = window.setTimeout(() => {
				if (!isDisposed) {
					clearHighlight()
				}
			}, 1800)

			return true
		}

		if (attemptJump()) {
			return () => {
				isDisposed = true
			}
		}

		const handleUpdate = () => {
			if (attemptJump()) {
				editor.off('update', handleUpdate)
			}
		}

		const failSafeTimeout = window.setTimeout(() => {
			editor.off('update', handleUpdate)
			clearPendingJumpTarget()
		}, 2500)

		editor.on('update', handleUpdate)

		return () => {
			isDisposed = true
			window.clearTimeout(failSafeTimeout)
			editor.off('update', handleUpdate)
		}
	}, [clearPendingJumpTarget, docId, editor, pendingJumpTarget])

	useEffect(() => {
		if (!editor || editor.isDestroyed) return

		const updateFindMatches = () => {
			const trimmedQuery = findQuery.trim()
			if (!trimmedQuery) {
				setFindMatches([])
				return
			}

			setFindMatches(findAllTextOccurrenceRanges(editor.state.doc, trimmedQuery))
		}

		updateFindMatches()
		editor.on('update', updateFindMatches)

		return () => {
			editor.off('update', updateFindMatches)
		}
	}, [editor, findQuery])

	useEffect(() => {
		if (findMatches.length === 0) {
			setActiveFindMatchIndex(0)
			return
		}

		setActiveFindMatchIndex((currentIndex) => Math.min(currentIndex, findMatches.length - 1))
	}, [findMatches.length])

	useEffect(() => {
		if (!editor || editor.isDestroyed) return

		if (!isFindBarOpen || !findQuery.trim() || findMatches.length === 0) {
			editor.view.dispatch(editor.state.tr.setMeta(jumpHighlightKey, { clear: true }))
			return
		}

		const activeMatch = findMatches[activeFindMatchIndex] ?? findMatches[0]
		if (!activeMatch) return

		editor.view.dispatch(
			editor.state.tr
				.setSelection(TextSelection.create(editor.state.doc, activeMatch.to))
				.setMeta(jumpHighlightKey, { from: activeMatch.from, to: activeMatch.to }),
		)
		scrollFindMatchIntoView(activeMatch)
	}, [activeFindMatchIndex, editor, findMatches, findQuery, isFindBarOpen, scrollFindMatchIntoView])

	useEffect(() => {
		if (!isFindBarOpen) return

		const focusTimeout = window.setTimeout(() => {
			findInputRef.current?.focus()
			findInputRef.current?.select()
		}, 0)

		return () => {
			window.clearTimeout(focusTimeout)
		}
	}, [isFindBarOpen])

	useEffect(() => {
		if (!editor || editor.isDestroyed) return

		const openFindPanelFromShortcut = (revealReplace: boolean) => {
			const nextSelectedText = getSelectedEditorText(editor)
			if (!isFindBarOpen && nextSelectedText) {
				setFindQuery(nextSelectedText)
			}

			setIsFindBarOpen(true)
			if (revealReplace) {
				setShowReplaceControls(true)
			}
			setActiveFindMatchIndex(0)
		}

		const closeFindPanelFromShortcut = () => {
			setIsFindBarOpen(false)
			setShowReplaceControls(false)
			editor.view.dispatch(editor.state.tr.setMeta(jumpHighlightKey, { clear: true }))
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			const hasModifier = event.metaKey || event.ctrlKey
			if (hasModifier && event.key.toLowerCase() === 'f') {
				event.preventDefault()
				openFindPanelFromShortcut(event.shiftKey || event.altKey)
				return
			}

			if (event.key === 'Escape' && isFindBarOpen) {
				event.preventDefault()
				closeFindPanelFromShortcut()
				editor.commands.focus()
			}
		}

		const editorElement = editor.view.dom
		editorElement.addEventListener('keydown', handleKeyDown)

		return () => {
			editorElement.removeEventListener('keydown', handleKeyDown)
		}
	}, [editor, isFindBarOpen])

	useEffect(() => {
		if (!isMobile) {
			setIsMobileFormatDrawerOpen(false)
			setIsMobileMoreDrawerOpen(false)
		}
	}, [isMobile])

	if (!editor) return null

	const activeFile = new ProjectManager(projectDoc).getAll().find((file) => file.id === docId) ?? null
	const metadataBadges = activeFile ? getProjectFileMetadataBadges(activeFile, 4) : []
	const metadataSummary = activeFile
		? getProjectFileMetadataSummary(activeFile, { includeType: true })
		: 'Chapter'
	const currentWordCount = editor.storage.characterCount.words()
	const selectedText = getSelectedEditorText(editor)
	const trimmedFindQuery = findQuery.trim()
	const activeFindMatch = findMatches[activeFindMatchIndex] ?? null
	const findSummaryLabel = !trimmedFindQuery
		? 'Type to search this chapter or note'
		: findMatches.length === 0
			? 'No matches yet'
			: `${activeFindMatchIndex + 1} of ${findMatches.length} matches`

	const openCodexDialogFromSelection = () => {
		const nextSelectedText = getSelectedEditorText(editor)
		if (!nextSelectedText) return

		setCodexDialogSeed({
			name: nextSelectedText,
			type: 'character',
			description: '',
			aliasesText: '',
		})
		setCodexDialogSession((current) => current + 1)
		setIsCodexDialogOpen(true)
	}

	const handleCodexDialogOpenChange = (open: boolean) => {
		setIsCodexDialogOpen(open)
		if (!open) {
			setCodexDialogSeed(EMPTY_ENTITY_FORM)
		}
	}

	const openFindBar = (options: { revealReplace?: boolean } = {}) => {
		const nextSelectedText = getSelectedEditorText(editor)
		if (!isFindBarOpen && nextSelectedText) {
			setFindQuery(nextSelectedText)
		}

		setIsFindBarOpen(true)
		setShowReplaceControls(options.revealReplace ?? showReplaceControls)
		setActiveFindMatchIndex(0)
	}

	const closeFindBar = () => {
		setIsFindBarOpen(false)
		setShowReplaceControls(false)
		editor.view.dispatch(editor.state.tr.setMeta(jumpHighlightKey, { clear: true }))
	}

	const moveToFindMatch = (direction: 1 | -1) => {
		if (findMatches.length === 0) return

		setActiveFindMatchIndex((currentIndex) => {
			const nextIndex = currentIndex + direction
			if (nextIndex < 0) return findMatches.length - 1
			if (nextIndex >= findMatches.length) return 0
			return nextIndex
		})
	}

	const replaceActiveFindMatch = () => {
		if (!activeFindMatch) return

		editor.commands.focus()
		editor.commands.insertContentAt(activeFindMatch, replaceQuery)
	}

	const replaceAllFindMatches = () => {
		if (findMatches.length === 0) return

		editor.commands.focus()
		for (const match of [...findMatches].reverse()) {
			editor.commands.insertContentAt(match, replaceQuery)
		}
	}

	const getToolbarSelection = () =>
		toolbarSelectionRef.current ?? {
			from: editor.state.selection.from,
			to: editor.state.selection.to,
		}

	const toggleNodeWithToolbarSelection = (
		command: (selection: { from: number; to: number }) => boolean,
	) => {
		const selection = getToolbarSelection()

		const result = command(selection)
		editor.commands.focus(selection.to)
		return result
	}

	const applySelectionFormatting = (
		command: (selection: { from: number; to: number }) => boolean,
	) => () => {
		toggleNodeWithToolbarSelection(command)
	}

	const runUndo = () => {
		editor.chain().focus().undo().run()
	}

	const runRedo = () => {
		editor.chain().focus().redo().run()
	}

	const mobileFormatActions: MobileEditorAction[] = [
		{
			key: 'paragraph',
			label: 'Paragraph',
			icon: <Pilcrow size={16} />,
			isActive: editor.isActive('paragraph'),
			onPress: applySelectionFormatting((selection) =>
				editor.chain().setTextSelection(selection).setParagraph().run(),
			),
		},
		{
			key: 'heading',
			label: 'Heading',
			icon: <Heading2 size={16} />,
			isActive: editor.isActive('heading', { level: 2 }),
			onPress: applySelectionFormatting((selection) =>
				editor.chain().setTextSelection(selection).toggleHeading({ level: 2 }).run(),
			),
		},
		{
			key: 'bullets',
			label: 'Bulleted List',
			icon: <List size={16} />,
			isActive: editor.isActive('bulletList'),
			onPress: applySelectionFormatting((selection) =>
				editor.chain().setTextSelection(selection).toggleBulletList().run(),
			),
		},
		{
			key: 'numbers',
			label: 'Numbered List',
			icon: <ListOrdered size={16} />,
			isActive: editor.isActive('orderedList'),
			onPress: applySelectionFormatting((selection) =>
				editor.chain().setTextSelection(selection).toggleOrderedList().run(),
			),
		},
		{
			key: 'quote',
			label: 'Block Quote',
			icon: <Quote size={16} />,
			isActive: editor.isActive('blockquote'),
			onPress: applySelectionFormatting((selection) =>
				editor.chain().setTextSelection(selection).toggleBlockquote().run(),
			),
		},
		{
			key: 'code-block',
			label: 'Code Block',
			icon: <BetweenHorizonalEnd size={16} />,
			isActive: editor.isActive('codeBlock'),
			onPress: applySelectionFormatting((selection) =>
				editor.chain().setTextSelection(selection).toggleCodeBlock().run(),
			),
		},
		{
			key: 'bold',
			label: 'Bold',
			icon: <Bold size={16} />,
			isActive: editor.isActive('bold'),
			onPress: applySelectionFormatting((selection) =>
				editor.chain().setTextSelection(selection).toggleBold().run(),
			),
		},
		{
			key: 'italic',
			label: 'Italic',
			icon: <Italic size={16} />,
			isActive: editor.isActive('italic'),
			onPress: applySelectionFormatting((selection) =>
				editor.chain().setTextSelection(selection).toggleItalic().run(),
			),
		},
		{
			key: 'strike',
			label: 'Strike',
			icon: <Strikethrough size={16} />,
			isActive: editor.isActive('strike'),
			onPress: applySelectionFormatting((selection) =>
				editor.chain().setTextSelection(selection).toggleStrike().run(),
			),
		},
		{
			key: 'inline-code',
			label: 'Inline Code',
			icon: <Code size={16} />,
			isActive: editor.isActive('code'),
			onPress: applySelectionFormatting((selection) =>
				editor.chain().setTextSelection(selection).toggleCode().run(),
			),
		},
	]

	const mobileUtilityActions: MobileEditorAction[] = [
		{
			key: 'find',
			label: 'Find in Draft',
			icon: <Search size={16} />,
			isActive: isFindBarOpen,
			onPress: () => openFindBar(),
		},
		{
			key: 'replace',
			label: 'Find and Replace',
			icon: <Replace size={16} />,
			isActive: isFindBarOpen && showReplaceControls,
			onPress: () => openFindBar({ revealReplace: true }),
		},
		{
			key: 'focus',
			label: isFocusMode ? 'Leave Focus Mode' : 'Enter Focus Mode',
			icon: isFocusMode ? <Minimize2 size={16} /> : <Focus size={16} />,
			isActive: isFocusMode,
			onPress: toggleFocusMode,
		},
		{
			key: 'codex',
			label: 'Add to Codex',
			icon: <BookOpen size={16} />,
			disabled: !selectedText,
			onPress: openCodexDialogFromSelection,
		},
	]

	return (
		<div className={clsx("relative mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden", className)}>
			<CodexOverlay editor={editor} projectDoc={projectDoc} />

			<CodexEntityDialog
				key={`selection-${codexDialogSession}`}
				open={isCodexDialogOpen}
				onOpenChange={handleCodexDialogOpenChange}
				projectDoc={projectDoc}
				initialValue={codexDialogSeed}
				title="Add to Codex"
				description={
					codexDialogSeed.name
						? `Start a codex entry from "${truncateForDescription(codexDialogSeed.name)}" and choose whether it belongs in characters, locations, items, or lore.`
						: 'Turn the selected text into a codex entry and choose the right codex type.'
				}
				onSaved={() => {
					setSidebarTab('codex')
				}}
			/>

			{isMobile && (
				<>
					<Drawer open={isMobileFormatDrawerOpen} onOpenChange={setIsMobileFormatDrawerOpen} fadeFromIndex={1} snapPoints={[0.78]}>
						<DrawerContent className="mx-auto flex h-[min(78vh,calc(100dvh-1rem))] w-full max-w-[760px] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background text-foreground">
							<DrawerHeader className="border-b border-border px-4 pb-4 text-left">
								<div className="flex items-start justify-between gap-4">
									<div>
										<DrawerTitle className="text-base">Format Draft</DrawerTitle>
										<DrawerDescription className="mt-1">
											Choose a style for the current paragraph or the text you selected.
										</DrawerDescription>
									</div>
									<DrawerClose asChild>
										<Button type="button" variant="ghost" size="icon-sm" className="mt-0.5 rounded-full">
											<X className="h-4 w-4" />
										</Button>
									</DrawerClose>
								</div>
							</DrawerHeader>

							<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
								<div className="grid grid-cols-2 gap-3">
									{mobileFormatActions.map((action) => (
										<MobileDrawerActionButton
											key={action.key}
											label={action.label}
											icon={action.icon}
											isActive={action.isActive}
											disabled={action.disabled}
											onPress={() => {
												action.onPress()
												setIsMobileFormatDrawerOpen(false)
											}}
										/>
									))}
								</div>
							</div>
						</DrawerContent>
					</Drawer>

					<Drawer open={isMobileMoreDrawerOpen} onOpenChange={setIsMobileMoreDrawerOpen} fadeFromIndex={1} snapPoints={[0.72]}>
						<DrawerContent className="mx-auto flex h-[min(72vh,calc(100dvh-1rem))] w-full max-w-[760px] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background text-foreground">
							<DrawerHeader className="border-b border-border px-4 pb-4 text-left">
								<div className="flex items-start justify-between gap-4">
									<div>
										<DrawerTitle className="text-base">Editor Actions</DrawerTitle>
										<DrawerDescription className="mt-1">
											Keep writing, search the chapter, or open a calmer workspace.
										</DrawerDescription>
									</div>
									<DrawerClose asChild>
										<Button type="button" variant="ghost" size="icon-sm" className="mt-0.5 rounded-full">
											<X className="h-4 w-4" />
										</Button>
									</DrawerClose>
								</div>
							</DrawerHeader>

							<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
								<div className="flex flex-col gap-2">
								{mobileUtilityActions.map((action) => (
									<MobileDrawerActionButton
										key={action.key}
										label={action.label}
										icon={action.icon}
										isActive={action.isActive}
										disabled={action.disabled}
										onPress={() => {
											action.onPress()
											setIsMobileMoreDrawerOpen(false)
										}}
										fullWidth
									/>
								))}
								</div>
							</div>
						</DrawerContent>
					</Drawer>
				</>
			)}

			<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="mb-4 shrink-0">
				<div className="rounded-xl border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
					{isMobile ? (
						<div className="flex items-center gap-1.5">
							<div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border/70 bg-background/80 p-0.5">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={runUndo}
									title="Undo"
									disabled={!editor.can().undo()}
									className="size-8 rounded-md"
								>
									<Undo2 size={16} />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={runRedo}
									title="Redo"
									disabled={!editor.can().redo()}
									className="size-8 rounded-md"
								>
									<Redo2 size={16} />
								</Button>
							</div>

							<Button
								type="button"
								variant={isMobileFormatDrawerOpen ? 'secondary' : 'outline'}
								onClick={() => setIsMobileFormatDrawerOpen(true)}
								title="Open formatting options"
								className="h-8 flex-1 gap-1.5 rounded-lg px-2.5 text-xs font-medium"
							>
								<Type size={14} />
								<span>Format</span>
							</Button>

							<Button
								type="button"
								variant={isMobileMoreDrawerOpen || isFindBarOpen || isFocusMode ? 'secondary' : 'outline'}
								onClick={() => setIsMobileMoreDrawerOpen(true)}
								title="Open editor actions"
								className="h-8 flex-1 gap-1.5 rounded-lg px-2.5 text-xs font-medium"
							>
								<MoreHorizontal size={14} />
								<span>More</span>
							</Button>
						</div>
					) : (
						<div className="flex flex-wrap items-center gap-2">
							<div className="flex items-center gap-1 rounded-lg border border-border/70 bg-background/80 p-1">
								<ToolbarButton
									onPress={() => editor.commands.undo()}
									isActive={false}
									title="Undo"
									disabled={!editor.can().undo()}
								>
									<Undo2 size={15} />
								</ToolbarButton>
								<ToolbarButton
									onPress={() => editor.commands.redo()}
									isActive={false}
									title="Redo"
									disabled={!editor.can().redo()}
								>
									<Redo2 size={15} />
								</ToolbarButton>
							</div>

							<div className="flex items-center gap-1 rounded-lg border border-border/70 bg-background/80 p-1">
								<ToolbarButton onPress={applySelectionFormatting((selection) => editor.chain().setTextSelection(selection).toggleBold().run())} isActive={editor.isActive('bold')} title="Bold">
									<Bold size={15} />
								</ToolbarButton>
								<ToolbarButton onPress={applySelectionFormatting((selection) => editor.chain().setTextSelection(selection).toggleItalic().run())} isActive={editor.isActive('italic')} title="Italic">
									<Italic size={15} />
								</ToolbarButton>
								<ToolbarButton onPress={applySelectionFormatting((selection) => editor.chain().setTextSelection(selection).toggleStrike().run())} isActive={editor.isActive('strike')} title="Strikethrough">
									<Strikethrough size={15} />
								</ToolbarButton>
								<ToolbarButton onPress={applySelectionFormatting((selection) => editor.chain().setTextSelection(selection).toggleCode().run())} isActive={editor.isActive('code')} title="Inline Code">
									<Code size={15} />
								</ToolbarButton>
							</div>

							<div className="flex items-center gap-1 rounded-lg border border-border/70 bg-background/80 p-1">
								<ToolbarButton onPress={applySelectionFormatting((selection) => editor.chain().setTextSelection(selection).setParagraph().run())} isActive={editor.isActive('paragraph')} title="Paragraph">
									<Pilcrow size={15} />
								</ToolbarButton>
								<ToolbarButton onPress={applySelectionFormatting((selection) => editor.chain().setTextSelection(selection).toggleHeading({ level: 2 }).run())} isActive={editor.isActive('heading', { level: 2 })} title="Heading">
									<Heading2 size={15} />
								</ToolbarButton>
								<ToolbarButton onPress={applySelectionFormatting((selection) => editor.chain().setTextSelection(selection).toggleBulletList().run())} isActive={editor.isActive('bulletList')} title="Bulleted List">
									<List size={15} />
								</ToolbarButton>
								<ToolbarButton onPress={applySelectionFormatting((selection) => editor.chain().setTextSelection(selection).toggleOrderedList().run())} isActive={editor.isActive('orderedList')} title="Numbered List">
									<ListOrdered size={15} />
								</ToolbarButton>
								<ToolbarButton onPress={applySelectionFormatting((selection) => editor.chain().setTextSelection(selection).toggleBlockquote().run())} isActive={editor.isActive('blockquote')} title="Block Quote">
									<Quote size={15} />
								</ToolbarButton>
								<ToolbarButton onPress={applySelectionFormatting((selection) => editor.chain().setTextSelection(selection).toggleCodeBlock().run())} isActive={editor.isActive('codeBlock')} title="Code Block">
									<BetweenHorizonalEnd size={15} />
								</ToolbarButton>
							</div>

							<div className="ml-auto flex items-center gap-2">
								<ToolbarButton
									onPress={toggleFocusMode}
									isActive={isFocusMode}
									title={isFocusMode ? 'Leave focus mode' : 'Enter focus mode'}
									className="gap-2 px-2.5 text-xs font-medium"
								>
									{isFocusMode ? <Minimize2 size={15} /> : <Focus size={15} />}
									<span className="hidden sm:inline">{isFocusMode ? 'Leave Focus' : 'Focus Mode'}</span>
								</ToolbarButton>
								<ToolbarButton
									onPress={openCodexDialogFromSelection}
									isActive={false}
									title="Add this selection to the Codex"
									disabled={!selectedText}
									className="gap-2 px-2.5 text-xs font-medium"
								>
									<BookOpen size={15} />
									<span className="hidden sm:inline">Add to Codex</span>
								</ToolbarButton>
								<ToolbarButton
									onPress={() => openFindBar()}
									isActive={isFindBarOpen}
									title="Find in this draft"
									className="gap-2 px-2.5 text-xs font-medium"
								>
									<Search size={15} />
									<span className="hidden sm:inline">Find</span>
								</ToolbarButton>
							</div>
						</div>
					)}
				</div>
			</div>

			<div className={`min-h-0 flex-1 overflow-hidden ${isFocusMode ? '' : 'xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_320px] 2xl:gap-8'}`}>
				<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
					{isFindBarOpen ? (
						<div className="shrink-0 border-b border-border/70 bg-card/90 px-5 py-4 sm:px-8">
							<div className="flex flex-col gap-2">
								<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
									<div className="relative flex-1">
										<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											ref={findInputRef}
											value={findQuery}
											onChange={(event) => {
												setFindQuery(event.target.value)
												setActiveFindMatchIndex(0)
											}}
											onKeyDown={(event) => {
												if (event.key === 'Enter') {
													event.preventDefault()
													moveToFindMatch(event.shiftKey ? -1 : 1)
												}

												if (event.key === 'Escape') {
													event.preventDefault()
													closeFindBar()
													editor.commands.focus()
												}
											}}
											placeholder="Find in this chapter or note"
											className="pl-9"
										/>
									</div>

									<div className="flex flex-wrap items-center gap-2 sm:justify-end">
										<span className="text-xs font-medium text-muted-foreground">
											{findSummaryLabel}
										</span>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setShowReplaceControls((current) => !current)}
											className="h-8 gap-2 px-2.5 text-xs"
										>
											<Replace className="h-3.5 w-3.5" />
											{showReplaceControls ? 'Hide Replace' : 'Replace'}
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => moveToFindMatch(-1)}
											disabled={findMatches.length === 0}
											className="h-8 w-8"
											title="Previous match"
										>
											<ChevronUp className="h-4 w-4" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => moveToFindMatch(1)}
											disabled={findMatches.length === 0}
											className="h-8 w-8"
											title="Next match"
										>
											<ChevronDown className="h-4 w-4" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => {
												closeFindBar()
												editor.commands.focus()
											}}
											className="h-8 w-8"
											title="Close find"
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								</div>

								{showReplaceControls && (
									<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
										<Input
											value={replaceQuery}
											onChange={(event) => setReplaceQuery(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === 'Enter') {
													event.preventDefault()
													replaceActiveFindMatch()
												}
											}}
											placeholder="Replace with"
											className="flex-1"
										/>
										<div className="flex flex-wrap items-center gap-2">
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onClick={replaceActiveFindMatch}
												disabled={!activeFindMatch}
											>
												Replace
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={replaceAllFindMatches}
												disabled={findMatches.length === 0}
											>
												Replace All
											</Button>
										</div>
									</div>
								)}
							</div>
						</div>
					) : null}

					<div
						ref={editorScrollRegionRef}
						className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
					>
						<div className={`px-6 py-5 sm:px-12 sm:py-8 lg:py-10 ${isFocusMode ? 'lg:px-20 xl:px-24 2xl:px-32' : 'lg:px-14 xl:px-16'}`}>
							<EditorContent editor={editor} />
						</div>
					</div>
				</div>

				{!isFocusMode && (
				<aside className="mt-4 hidden xl:mt-0 xl:flex xl:min-h-0 xl:flex-col xl:gap-4 xl:pb-2">
					<div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
						<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							This Draft
						</p>
						<h3 className="mt-2 text-base font-semibold text-foreground">
							{activeFile?.title ?? 'Current draft'}
						</h3>
						<p className="mt-1 text-sm text-muted-foreground">{metadataSummary}</p>
						{metadataBadges.length > 0 && (
							<div className="mt-3 flex flex-wrap gap-2">
								{metadataBadges.map((badge) => (
									<Badge key={badge.key} variant="secondary">
										{badge.label}
									</Badge>
								))}
							</div>
						)}
						<div className="mt-4 grid grid-cols-2 gap-2">
							<div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
								<span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
									Words
								</span>
								<span className="mt-1 block text-sm font-semibold text-foreground">
									{currentWordCount}
								</span>
							</div>
							<div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
								<span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
									Selection
								</span>
								<span className="mt-1 block text-sm font-semibold text-foreground">
									{selectedText ? `${selectedText.split(/\s+/).length} words` : 'None'}
								</span>
							</div>
						</div>
					</div>

					<div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
						<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							Story Context
						</p>
						<div className="mt-3 space-y-3 text-sm">
							{activeFile?.metadata?.goal && (
								<div>
									<p className="font-medium text-foreground">Scene Goal</p>
									<p className="mt-1 text-muted-foreground">{activeFile.metadata.goal}</p>
								</div>
							)}
							{activeFile?.metadata?.timeline && (
								<div>
									<p className="font-medium text-foreground">Timeline</p>
									<p className="mt-1 text-muted-foreground">{activeFile.metadata.timeline}</p>
								</div>
							)}
							{!activeFile?.metadata?.goal && !activeFile?.metadata?.timeline && (
								<p className="text-muted-foreground">
									Add POV, location, timeline, or a scene goal from Contents to turn this gutter into a quick-reference space while you write.
								</p>
							)}
						</div>
					</div>
				</aside>
				)}
			</div>
			</div>
		</div>
	)
}

interface EditorToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	isActive: boolean
	children: ReactNode
	onPress?: () => void
}

interface MobileEditorAction {
	key: string
	label: string
	icon: ReactNode
	onPress: () => void
	isActive?: boolean
	disabled?: boolean
}

const ToolbarButton = ({ onPress, isActive, children, className, ...props }: EditorToolbarButtonProps) => (
	<button
		type="button"
		onPointerDown={(event) => {
			event.preventDefault()
			event.stopPropagation()
			if (!props.disabled) {
				onPress?.()
			}
		}}
		{...props}
		className={clsx(
			"inline-flex items-center justify-center rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40",
			isActive && "bg-primary/10 text-primary",
			className,
		)}
	>
		{children}
	</button>
)

interface MobileDrawerActionButtonProps {
	label: string
	icon: ReactNode
	onPress: () => void
	isActive?: boolean
	disabled?: boolean
	fullWidth?: boolean
}

const MobileDrawerActionButton = ({
	label,
	icon,
	onPress,
	isActive = false,
	disabled = false,
	fullWidth = false,
}: MobileDrawerActionButtonProps) => (
	<button
		type="button"
		onClick={onPress}
		disabled={disabled}
		className={clsx(
			'flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-45',
			isActive && 'border-primary/40 bg-primary/10 text-primary',
			fullWidth ? 'w-full justify-start' : 'w-full',
		)}
	>
		<span
			className={clsx(
				'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground',
				isActive && 'border-primary/30 bg-primary/10 text-primary',
			)}
		>
			{icon}
		</span>
		<span className="leading-tight">{label}</span>
	</button>
)

function getSelectedEditorText(editor: NonNullable<ReturnType<typeof useEditor>>): string {
	const { from, to, empty } = editor.state.selection
	if (empty) return ''

	return editor.state.doc
		.textBetween(from, to, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function truncateForDescription(value: string, maxLength = 48): string {
	if (value.length <= maxLength) return value
	return `${value.slice(0, maxLength - 1)}…`
}
