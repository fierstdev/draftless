import { useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { FileText, CheckCircle, Loader2, FileCode, Book } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { ProjectManager } from '@/lib/project'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { getFileDbName, waitForProviderSync } from '@/lib/persistence'
import { downloadBlob, sanitizeFilename } from '@/lib/download'
import { processContent, type ExportMode } from '@/lib/content-processor'
import { cn } from '@/lib/utils'

// Headless Editor Imports
import { Editor, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import Typography from '@tiptap/extension-typography'
import { SuggestionAdd, SuggestionDel, CommentMark } from '@/components/editor/ReviewExtension'

// Helper to load doc from IDB by spinning up a temporary headless editor
const loadChapterJSON = async (docId: string): Promise<JSONContent> => {
	return new Promise<JSONContent>((resolve, reject) => {
		const doc = new Y.Doc()
		const provider = new IndexeddbPersistence(getFileDbName(docId), doc)

		const hydrate = async () => {
			// SPIN UP HEADLESS EDITOR
			// This ensures we parse the Yjs XML correctly into Tiptap JSON
			const editor = new Editor({
				extensions: [
					StarterKit,
					Typography,
					SuggestionAdd,
					SuggestionDel,
					CommentMark,
					Collaboration.configure({ document: doc })
				],
			})

			// Wait a tick for Tiptap to hydrate from Yjs
			setTimeout(() => {
				const json = editor.getJSON()

				// Cleanup
				editor.destroy()
				provider.destroy()
				doc.destroy()

				resolve(json)
			}, 50)
		}

		void waitForProviderSync(provider).then(hydrate).catch((error) => {
			void provider.destroy()
			doc.destroy()
			reject(error)
		})
	})
}

const compileFormats = ['docx', 'html', 'epub'] as const
type CompileFormat = typeof compileFormats[number]

function isCompileFormat(value: string): value is CompileFormat {
	return compileFormats.includes(value as CompileFormat)
}

function isExportMode(value: string): value is ExportMode {
	return ['final', 'original', 'review'].includes(value)
}

export function CompileDialog({
	projectDoc,
	storyTitle,
	compact = false,
	triggerClassName,
}: {
	projectDoc: Y.Doc
	storyTitle: string
	compact?: boolean
	triggerClassName?: string
}) {
	const [isOpen, setIsOpen] = useState(false)
	const [format, setFormat] = useState<CompileFormat>('docx')
	const [mode, setMode] = useState<ExportMode>('final')
	const [status, setStatus] = useState<'idle' | 'compiling' | 'done'>('idle')
	const [progress, setProgress] = useState(0)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

	const handleCompile = async () => {
		setErrorMessage(null)
		setNoticeMessage(null)
		setStatus('compiling')
		setProgress(10)

		const pm = new ProjectManager(projectDoc)
		const files = pm.getAll().filter(f => f.type === 'chapter')
		const safeStoryTitle = sanitizeFilename(storyTitle, 'manuscript')

		if (files.length === 0) {
			setErrorMessage("Add at least one chapter before exporting your manuscript.")
			setStatus('idle')
			setProgress(0)
			return
		}

		let fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Manuscript</title>
        <style>
          body { font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 12pt; color: #000; }
          h1 { page-break-before: always; font-size: 24pt; margin-top: 2em; margin-bottom: 1em; }
          p { margin-bottom: 1em; text-indent: 1.5em; }
          /* Fix for marks not styling correctly in Word */
          .suggestion-add { background-color: #dcfce7; color: #166534; }
          .suggestion-del { background-color: #fee2e2; color: #991b1b; text-decoration: line-through; }
        </style>
      </head>
      <body>
    `

		const step = 80 / files.length

		for (const file of files) {
			try {
				const json = await loadChapterJSON(file.id)
				// Process the content (scrub comments, handle tracks)
				const cleanHtml = processContent(json, mode)

				fullHtml += `<h1 class="chapter-title">${file.title}</h1>`
				fullHtml += cleanHtml
			} catch (e) {
				console.error(`Failed to load chapter ${file.title}`, e)
				fullHtml += `<h1>${file.title}</h1><p>[Error loading chapter content]</p>`
			}
			setProgress(p => p + step)
		}

		fullHtml += "</body></html>"
		setProgress(100)

		// --- DOWNLOAD ---
		let didDownload = false

		try {
			if (format === 'docx') {
				// Simple DOCX export using Word-compatible HTML
				const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>";
				const docBlob = new Blob(['\ufeff', header + fullHtml], { type: 'application/msword' });
				downloadBlob(docBlob, `${safeStoryTitle}_${mode}.doc`)
				didDownload = true
			}
			else if (format === 'html') {
				const blob = new Blob([fullHtml], { type: 'text/html' })
				downloadBlob(blob, `${safeStoryTitle}_${mode}.html`)
				didDownload = true
			}
			else if (format === 'epub') {
				setNoticeMessage("EPUB is not packaged directly yet. Draftless exported an HTML version instead.")
				const blob = new Blob([fullHtml], { type: 'text/html' })
				downloadBlob(blob, `${safeStoryTitle}_${mode}.html`)
				didDownload = true
			}
		} catch (e) {
			console.error(e)
			setErrorMessage("Export failed while preparing your manuscript. Please try again.")
		}

		if (!didDownload) {
			setStatus('idle')
			setProgress(0)
			return
		}

		setStatus('done')
		setTimeout(() => {
			setIsOpen(false)
			setStatus('idle')
			setProgress(0)
			setErrorMessage(null)
			setNoticeMessage(null)
		}, 2000)
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				setIsOpen(open)
				if (!open) {
					setErrorMessage(null)
					setNoticeMessage(null)
					setStatus('idle')
					setProgress(0)
				}
			}}
		>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					title="Export manuscript"
					className={cn(
						"gap-2 border-primary/20 text-primary hover:bg-primary/5",
						compact ? "h-9 w-9 px-0" : "",
						triggerClassName,
					)}
				>
					<Book className="w-4 h-4" />
					<span className={compact ? "sr-only" : ""}>Manuscript</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px] bg-card text-card-foreground border-border">
				<DialogHeader>
					<DialogTitle>Export Manuscript</DialogTitle>
					<DialogDescription>
						Build a reader-ready manuscript from your chapters.
					</DialogDescription>
				</DialogHeader>

				{errorMessage && (
					<div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
						{errorMessage}
					</div>
				)}
				{noticeMessage && !errorMessage && (
					<div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
						{noticeMessage}
					</div>
				)}

				{status === 'idle' ? (
						<div className="grid gap-6 py-4">
							<div className="space-y-3">
								<Label className="text-xs font-semibold text-muted-foreground uppercase">Export Format</Label>
							<RadioGroup
								defaultValue="docx"
								onValueChange={(value) => {
									if (isCompileFormat(value)) {
										setFormat(value)
									}
								}}
								className="grid grid-cols-3 gap-4"
							>
								<FormatOption id="docx" value="docx" label="Word (.doc)" icon={FileText} color="text-blue-600" />
									<FormatOption id="html" value="html" label="Web Page (.html)" icon={FileCode} color="text-orange-600" />
									<FormatOption id="epub" value="epub" label="Ebook (.html)" icon={Book} color="text-green-600" />
								</RadioGroup>
								{format === 'epub' && (
									<p className="text-xs text-muted-foreground">
										EPUB currently exports HTML so you can convert it in another tool.
									</p>
								)}
							</div>

							<div className="space-y-3">
								<Label className="text-xs font-semibold text-muted-foreground uppercase">Which Draft Should Readers See?</Label>
							<RadioGroup
								defaultValue="final"
								onValueChange={(value) => {
									if (isExportMode(value)) {
										setMode(value)
									}
								}}
								className="space-y-2"
							>
									<div className="flex items-center space-x-2">
										<RadioGroupItem value="final" id="final" />
										<Label htmlFor="final" className="font-normal">
											<strong>Clean Draft</strong> (Apply edits and hide comments)
										</Label>
									</div>
									<div className="flex items-center space-x-2">
										<RadioGroupItem value="review" id="review" />
										<Label htmlFor="review" className="font-normal">
											<strong>Review Draft</strong> (Show tracked changes and comments)
										</Label>
									</div>
									<div className="flex items-center space-x-2">
										<RadioGroupItem value="original" id="original" />
										<Label htmlFor="original" className="font-normal">
											<strong>Before Edits</strong> (Hide all suggested changes)
										</Label>
									</div>
								</RadioGroup>
						</div>
					</div>
				) : (
					<div className="py-12 flex flex-col items-center justify-center space-y-6">
							{status === 'compiling' ? (
								<>
									<Loader2 className="w-12 h-12 animate-spin text-primary" />
									<p className="text-sm text-muted-foreground">Preparing your manuscript...</p>
								</>
							) : (
								<>
									<CheckCircle className="w-12 h-12 text-green-500" />
									<p className="text-sm text-muted-foreground">Manuscript ready!</p>
								</>
							)}
						<Progress value={progress} className="w-full h-2" />
					</div>
				)}

					<DialogFooter>
						{status === 'idle' && (
							<Button onClick={handleCompile} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Export Manuscript</Button>
						)}
					</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

interface FormatOptionProps {
	id: string
	value: CompileFormat
	label: string
	icon: ComponentType<SVGProps<SVGSVGElement>>
	color: string
}

function FormatOption({ id, value, label, icon: Icon, color }: FormatOptionProps) {
	return (
		<div className="flex items-center space-x-2 p-3 border rounded-md cursor-pointer hover:bg-muted/50 relative">
			<RadioGroupItem value={value} id={id} className="absolute right-2 top-2" />
			<Label htmlFor={id} className="flex flex-col items-center gap-2 cursor-pointer w-full pt-2">
				<Icon className={`w-6 h-6 ${color}`} />
				<span className="text-xs font-medium">{label}</span>
			</Label>
		</div>
	)
}
