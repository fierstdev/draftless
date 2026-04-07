import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Collaboration from '@tiptap/extension-collaboration'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import FloatingMenuExtension from '@tiptap/extension-floating-menu'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'
import { TextSelection } from '@tiptap/pm/state'

import { EntityHighlighter } from './editor/EntityExtension'
import { JumpHighlightExtension, jumpHighlightKey } from './editor/JumpHighlightExtension'
import { SuggestionAdd, SuggestionDel, CommentMark } from './editor/ReviewExtension'
import { CodexEntityDialog } from './CodexEntityDialog'
import { CodexOverlay } from './CodexHoverCard'

import { findTextOccurrenceRange } from '@/lib/editor-jump'
import { EMPTY_ENTITY_FORM, type CodexEntityFormState } from '@/lib/codex-form'
import { useStore } from '@/lib/store'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import {
	Bold, Italic, Strikethrough, Heading1, List, Quote, Code, BookOpen
} from 'lucide-react';
import clsx from 'clsx'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';

interface EditorProps {
	ydoc: Y.Doc
	docId: string
	projectDoc: Y.Doc
	isActivePane: boolean
	onFocus: () => void  
	className?: string
}

export function Editor({ ydoc, docId, projectDoc, isActivePane, onFocus }: EditorProps) {
	const setEditor = useStore((state) => state.setEditor)
	const setCollabStatus = useStore((state) => state.setCollabStatus)
	const setWordCount = useStore((state) => state.setWordCount)
	const setSidebarTab = useStore((state) => state.setSidebarTab)
	const pendingJumpTarget = useStore((state) => state.pendingJumpTarget)
	const clearPendingJumpTarget = useStore((state) => state.clearPendingJumpTarget)
	const highlightTimeoutRef = useRef<number | null>(null)
	const [isCodexDialogOpen, setIsCodexDialogOpen] = useState(false)
	const [codexDialogSession, setCodexDialogSession] = useState(0)
	const [codexDialogSeed, setCodexDialogSeed] = useState<CodexEntityFormState>(EMPTY_ENTITY_FORM)

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
			BubbleMenuExtension,
			FloatingMenuExtension,
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
				class: 'prose prose-lg prose-gray dark:prose-invert max-w-none focus:outline-none min-h-[60vh] text-foreground leading-relaxed selection:bg-primary/20 selection:text-primary',
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

	// 3. Sync to Global Store (Only if Active Pane)
	useEffect(() => {
		if (isActivePane && editor && !editor.isDestroyed) {
			setEditor(editor)
			setWordCount(editor.storage.characterCount.words())
		}
	}, [isActivePane, editor, setEditor, setWordCount])

	useEffect(() => {
		return () => {
			if (highlightTimeoutRef.current !== null) {
				window.clearTimeout(highlightTimeoutRef.current)
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

	if (!editor) return null

	const selectedText = getSelectedEditorText(editor)

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

	return (
		<div className="relative mx-auto mb-12 w-full max-w-3xl sm:mb-24">
			<CodexOverlay editor={editor} projectDoc={projectDoc} />

			<FloatingMenu editor={editor} pluginKey={"floating-menu"} className="flex gap-1">
				<div className="flex items-center gap-1 bg-popover shadow-lg shadow-black/5 border border-border p-1 rounded-lg">
					<MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })}>
						<Heading1 size={16} />
					</MenuButton>
					<MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
						<List size={16} />
					</MenuButton>
					<MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')}>
						<Quote size={16} />
					</MenuButton>
				</div>
			</FloatingMenu>

			<BubbleMenu editor={editor} pluginKey={"bubble-menu"} className="flex gap-1">
				<div className="flex items-center gap-1 bg-foreground text-background shadow-xl p-1.5 rounded-lg border border-foreground/20">
					<BubbleButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
						<Bold size={14} />
					</BubbleButton>
					<BubbleButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
						<Italic size={14} />
					</BubbleButton>
					<BubbleButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}>
						<Strikethrough size={14} />
					</BubbleButton>
					<div className="w-px h-4 bg-background/20 mx-1" />
					<BubbleButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')}>
						<Code size={14} />
					</BubbleButton>
					<div className="w-px h-4 bg-background/20 mx-1" />
					<BubbleButton onClick={openCodexDialogFromSelection} isActive={false} title="Add this selection to the Codex" disabled={!selectedText}>
						<BookOpen size={14} />
					</BubbleButton>
				</div>
			</BubbleMenu>

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

			<div className="min-h-[68vh] rounded-xl border border-border bg-card px-5 py-8 shadow-sm sm:min-h-[760px] sm:px-12 sm:py-14 md:px-20 md:py-20">
				<EditorContent editor={editor} />
			</div>
		</div>
	)
}

interface EditorToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	isActive: boolean
	children: ReactNode
}

const MenuButton = ({ onClick, isActive, children, ...props }: EditorToolbarButtonProps) => (
	<button
		type="button"
		onMouseDown={(event) => {
			event.preventDefault()
			onClick?.(event)
		}}
		{...props}
		className={clsx(
			"p-1.5 rounded-md transition-colors hover:bg-muted text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40",
			isActive && "bg-primary/10 text-primary"
		)}
	>
		{children}
	</button>
)

const BubbleButton = ({ onClick, isActive, children, ...props }: EditorToolbarButtonProps) => (
	<button
		type="button"
		onMouseDown={(event) => {
			event.preventDefault()
			onClick?.(event)
		}}
		{...props}
		className={clsx(
			"p-1.5 rounded-md transition-colors hover:bg-background/20 text-background/70 disabled:cursor-not-allowed disabled:opacity-40",
			isActive && "bg-background text-foreground"
		)}
	>
		{children}
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
