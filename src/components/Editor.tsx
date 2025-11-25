import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Collaboration from '@tiptap/extension-collaboration'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import FloatingMenuExtension from '@tiptap/extension-floating-menu'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'

import { EntityHighlighter } from './editor/EntityExtension'
import { CodexOverlay } from './CodexHoverCard'

import { useStore } from '@/lib/store'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import {useEffect, useState} from 'react';
import {
	Bold, Italic, Strikethrough, Heading1, List,
	Quote, Code, Loader2
} from 'lucide-react';
import clsx from 'clsx'
import {BubbleMenu, FloatingMenu} from '@tiptap/react/menus';

export function Editor({ ydoc, docId }: { ydoc: Y.Doc, docId: string }) {
	const { setEditor, setCollabStatus, setWordCount } = useStore()
	const [isSynced, setIsSynced] = useState(false)

	// 1. PHRASE 1: CONNECT TO DB
	useEffect(() => {
		setIsSynced(false) // Reset on doc change

		const provider = new IndexeddbPersistence(`draftless-doc-${docId}`, ydoc)

		const handleSync = () => {
			setIsSynced(true)
			setCollabStatus('connected')
		}

		if (provider.synced) {
			handleSync()
		} else {
			provider.on('synced', handleSync)
		}

		provider.on('connection-error', () => setCollabStatus('offline'))

		return () => {
			void provider.destroy()
		}
	}, [ydoc, docId, setCollabStatus])

	// 2. PHRASE 2: INIT EDITOR (Only after DB is synced)
	const editor = useEditor({
		// Only run this hook if we are synced!
		// Note: React hooks rules say this should run every render,
		// but since we key the component in App.tsx, this effectively resets correctly.
		// However, to be safe, we can conditionally render the EditorContent below.
		extensions: [
			StarterKit.configure({ undoRedo: false }),
			Placeholder.configure({
				placeholder: "Tell your story...",
				emptyEditorClass: 'is-editor-empty before:text-muted-foreground before:content-[attr(data-placeholder)] before:float-left before:pointer-events-none'
			}),
			Collaboration.configure({ document: ydoc }),
			BubbleMenuExtension,
			FloatingMenuExtension,
			Typography,
			CharacterCount,
			EntityHighlighter(ydoc),
		],
		editorProps: {
			attributes: {
				class: 'prose prose-lg prose-gray dark:prose-invert max-w-none focus:outline-none min-h-[60vh] text-foreground leading-relaxed selection:bg-primary/20 selection:text-primary',
			},
		},
		onUpdate: ({ editor }) => {
			setWordCount(editor.storage.characterCount.words())
		},
	}, [ydoc, isSynced]) // Re-init if doc or sync state changes

	// 3. SYNC TO STORE
	useEffect(() => {
		if (editor && isSynced && !editor.isDestroyed) {
			setEditor(editor)
			setWordCount(editor.storage.characterCount.words())
		}
		return () => setEditor(null)
	}, [editor, isSynced, setEditor, setWordCount])

	// LOADING VIEW
	if (!isSynced || !editor) {
		return (
			<div className="flex h-[50vh] items-center justify-center text-muted-foreground animate-pulse">
				<Loader2 className="w-6 h-6 mr-2 animate-spin" />
				Loading chapter...
			</div>
		)
	}

	return (
		<div className="relative w-full max-w-3xl mx-auto mb-24">
			<CodexOverlay ydoc={ydoc} />

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