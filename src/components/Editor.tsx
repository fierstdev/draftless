import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Collaboration from '@tiptap/extension-collaboration'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import FloatingMenuExtension from '@tiptap/extension-floating-menu'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'

import { EntityHighlighter } from './editor/EntityExtension'
import { SuggestionAdd, SuggestionDel, CommentMark } from './editor/ReviewExtension'
import { CodexOverlay } from './CodexHoverCard'

import { useStore } from '@/lib/store'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { useEffect } from 'react';
import {
	Bold, Italic, Strikethrough, Heading1, List, Quote, Code
} from 'lucide-react';
import clsx from 'clsx'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';

interface EditorProps {
	ydoc: Y.Doc
	docId: string
	projectDoc: Y.Doc
	isActivePane: boolean // Are we the focused pane?
	onFocus: () => void   // Notify parent when clicked
	className?: string
}

export function Editor({ ydoc, docId, projectDoc, isActivePane, onFocus }: EditorProps) {
	const { setEditor, setCollabStatus, setWordCount } = useStore()
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
			// Only update global word count if we are the active pane
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

	if (!editor) return null

	return (
		<div className="relative w-full max-w-3xl mx-auto mb-24">
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
				</div>
			</BubbleMenu>

			<div className="bg-card min-h-[800px] shadow-sm border border-border rounded-xl px-12 py-16 sm:px-16 sm:py-20 md:px-20">
				<EditorContent editor={editor} />
			</div>
		</div>
	)
}

const MenuButton = ({ onClick, isActive, children }: any) => (
	<button
		onClick={onClick}
		className={clsx(
			"p-1.5 rounded-md transition-colors hover:bg-muted text-muted-foreground",
			isActive && "bg-primary/10 text-primary"
		)}
	>
		{children}
	</button>
)

const BubbleButton = ({ onClick, isActive, children }: any) => (
	<button
		onClick={onClick}
		className={clsx(
			"p-1.5 rounded-md transition-colors hover:bg-background/20 text-background/70",
			isActive && "bg-background text-foreground"
		)}
	>
		{children}
	</button>
)