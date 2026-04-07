import { useState } from "react"
import { Download, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Editor } from "@tiptap/react"
import { downloadBlob, sanitizeFilename } from "@/lib/download"
import { cn } from "@/lib/utils"

interface ExportDialogProps {
	editor: Editor | null
	filenameBase?: string
	compact?: boolean
	triggerClassName?: string
}

export function ExportDialog({
	editor,
	filenameBase = 'document',
	compact = false,
	triggerClassName,
}: ExportDialogProps) {
	const [copied, setCopied] = useState(false)

	if (!editor) return null

	const handleCopy = (content: string) => {
		navigator.clipboard.writeText(content)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	// Tiptap to Markdown (Basic)
	const getMarkdown = () => {
		const text = editor.getText()
		return text
	}

	const getHTML = () => editor.getHTML()
	const getJSON = () => JSON.stringify(editor.getJSON(), null, 2)
	const safeFilenameBase = sanitizeFilename(filenameBase)

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					title="Export this chapter or note"
					className={cn("h-9 gap-2", compact ? "w-9 px-0" : "h-8", triggerClassName)}
				>
					<Download className="w-4 h-4" />
					<span className={compact ? "sr-only" : "hidden sm:inline"}>Export</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px] bg-card text-card-foreground border-border">
				<DialogHeader>
					<DialogTitle>Export Chapter or Note</DialogTitle>
					<DialogDescription>
						Download this chapter or note, or copy it to your clipboard.
					</DialogDescription>
				</DialogHeader>

				<Tabs defaultValue="markdown" className="w-full">
					<TabsList className="grid w-full grid-cols-3 bg-muted">
						<TabsTrigger value="markdown">Markdown</TabsTrigger>
						<TabsTrigger value="html">HTML</TabsTrigger>
						<TabsTrigger value="json">JSON</TabsTrigger>
					</TabsList>

					{/* MARKDOWN TAB */}
					<TabsContent value="markdown" className="space-y-4 mt-4">
						<div className="p-4 rounded-lg bg-muted/50 border border-border font-mono text-xs h-32 overflow-y-auto">
							{getMarkdown()}
						</div>
							<div className="flex gap-2 justify-end">
								<Button variant="secondary" onClick={() => handleCopy(getMarkdown())}>
									{copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
									Copy
								</Button>
								<Button onClick={() => downloadBlob(new Blob([getMarkdown()], { type: 'text/markdown' }), `${safeFilenameBase}.md`)}>
									<Download className="w-4 h-4 mr-2" /> Download Markdown
								</Button>
							</div>
					</TabsContent>

					{/* HTML TAB */}
					<TabsContent value="html" className="space-y-4 mt-4">
						<div className="p-4 rounded-lg bg-muted/50 border border-border font-mono text-xs h-32 overflow-y-auto">
							{getHTML()}
						</div>
							<div className="flex gap-2 justify-end">
								<Button variant="secondary" onClick={() => handleCopy(getHTML())}>
									<Copy className="w-4 h-4 mr-2" /> Copy
								</Button>
								<Button onClick={() => downloadBlob(new Blob([getHTML()], { type: 'text/html' }), `${safeFilenameBase}.html`)}>
									<Download className="w-4 h-4 mr-2" /> Download HTML
								</Button>
							</div>
					</TabsContent>

					{/* JSON TAB */}
					<TabsContent value="json" className="space-y-4 mt-4">
						<div className="p-4 rounded-lg bg-muted/50 border border-border font-mono text-xs h-32 overflow-y-auto">
							{getJSON().slice(0, 500)}...
						</div>
						<div className="flex gap-2 justify-end">
							<Button variant="secondary" onClick={() => handleCopy(getJSON())}>
								<Copy className="w-4 h-4 mr-2" /> Copy
							</Button>
							<Button onClick={() => downloadBlob(new Blob([getJSON()], { type: 'application/json' }), `${safeFilenameBase}.json`)}>
								<Download className="w-4 h-4 mr-2" /> Backup
							</Button>
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
