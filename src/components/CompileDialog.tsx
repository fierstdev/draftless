import { useState } from 'react'
import { Download, FileText, CheckCircle, Loader2, FileCode, Book } from 'lucide-react'
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
import { processContent, type ExportMode } from '@/lib/content-processor'

// Headless Editor Imports
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import Typography from '@tiptap/extension-typography'
import { SuggestionAdd, SuggestionDel, CommentMark } from '@/components/editor/ReviewExtension'

// Helper to load doc from IDB by spinning up a temporary headless editor
const loadChapterJSON = async (docId: string): Promise<any> => {
	return new Promise((resolve) => {
		const doc = new Y.Doc()
		const provider = new IndexeddbPersistence(`draftless-doc-${docId}`, doc)

		provider.on('synced', () => {
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
		})
	})
}

export function CompileDialog({ projectDoc }: { projectDoc: Y.Doc }) {
	const [isOpen, setIsOpen] = useState(false)
	const [format, setFormat] = useState<'docx' | 'html' | 'epub'>('docx')
	const [mode, setMode] = useState<ExportMode>('final')
	const [status, setStatus] = useState<'idle' | 'compiling' | 'done'>('idle')
	const [progress, setProgress] = useState(0)

	const handleCompile = async () => {
		setStatus('compiling')
		setProgress(10)

		const pm = new ProjectManager(projectDoc)
		const files = pm.getAll().filter(f => f.type === 'chapter')

		if (files.length === 0) {
			alert("No chapters to compile.")
			setStatus('idle')
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
		try {
			if (format === 'docx') {
				// Simple DOCX export using Word-compatible HTML
				const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>";
				const docBlob = new Blob(['\ufeff', header + fullHtml], { type: 'application/msword' });
				downloadBlob(docBlob, `Manuscript_${mode}.doc`)
			}
			else if (format === 'html') {
				const blob = new Blob([fullHtml], { type: 'text/html' })
				downloadBlob(blob, `Manuscript_${mode}.html`)
			}
			else if (format === 'epub') {
				// For MVP, we export HTML and advise converting
				alert("Note: Direct EPUB generation is complex in-browser. Exporting as HTML Package (Importable to Calibre/Kindle).")
				const blob = new Blob([fullHtml], { type: 'text/html' })
				downloadBlob(blob, `Manuscript_${mode}.html`)
			}
		} catch (e) {
			console.error(e)
			alert("Compile failed. See console.")
		}

		setStatus('done')
		setTimeout(() => {
			setIsOpen(false)
			setStatus('idle')
			setProgress(0)
		}, 2000)
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
					<Download className="w-4 h-4" /> Compile
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px] bg-card text-card-foreground border-border">
				<DialogHeader>
					<DialogTitle>Compile Manuscript</DialogTitle>
					<DialogDescription>
						Export your project for publication or review.
					</DialogDescription>
				</DialogHeader>

				{status === 'idle' ? (
					<div className="grid gap-6 py-4">
						<div className="space-y-3">
							<Label className="text-xs font-semibold text-muted-foreground uppercase">Format</Label>
							<RadioGroup defaultValue="docx" onValueChange={(v) => setFormat(v as any)} className="grid grid-cols-3 gap-4">
								<FormatOption id="docx" value="docx" label="Word (.doc)" icon={FileText} color="text-blue-600" />
								<FormatOption id="html" value="html" label="Web (.html)" icon={FileCode} color="text-orange-600" />
								<FormatOption id="epub" value="epub" label="Ebook" icon={Book} color="text-green-600" />
							</RadioGroup>
						</div>

						<div className="space-y-3">
							<Label className="text-xs font-semibold text-muted-foreground uppercase">Content Filtering</Label>
							<RadioGroup defaultValue="final" onValueChange={(v) => setMode(v as any)} className="space-y-2">
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="final" id="final" />
									<Label htmlFor="final" className="font-normal">
										<strong>Final Draft</strong> (Apply edits, remove comments)
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="review" id="review" />
									<Label htmlFor="review" className="font-normal">
										<strong>Review Copy</strong> (Show track changes & comments)
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="original" id="original" />
									<Label htmlFor="original" className="font-normal">
										<strong>Original</strong> (Reject all edits)
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
								<p className="text-sm text-muted-foreground">Stitching chapters & scrubbing data...</p>
							</>
						) : (
							<>
								<CheckCircle className="w-12 h-12 text-green-500" />
								<p className="text-sm text-muted-foreground">Export Complete!</p>
							</>
						)}
						<Progress value={progress} className="w-full h-2" />
					</div>
				)}

				<DialogFooter>
					{status === 'idle' && (
						<Button onClick={handleCompile} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Start Compile</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

function FormatOption({ id, value, label, icon: Icon, color }: any) {
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

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}