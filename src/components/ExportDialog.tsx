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

interface ExportDialogProps {
	editor: Editor | null
}

export function ExportDialog({ editor }: ExportDialogProps) {
	const [copied, setCopied] = useState(false)

	if (!editor) return null

	const handleCopy = (content: string) => {
		navigator.clipboard.writeText(content)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleDownload = (content: string, filename: string, type: string) => {
		const blob = new Blob([content], { type })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	// Tiptap to Markdown (Basic)
	const getMarkdown = () => {
		let text = editor.getText()
		return text
	}

	const getHTML = () => editor.getHTML()
	const getJSON = () => JSON.stringify(editor.getJSON(), null, 2)

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-2">
					<Download className="w-4 h-4" />
					<span className="hidden sm:inline">Export</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px] bg-card text-card-foreground border-border">
				<DialogHeader>
					<DialogTitle>Export Document</DialogTitle>
					<DialogDescription>
						Download your story or copy it to your clipboard.
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
							<Button onClick={() => handleDownload(getMarkdown(), 'story.md', 'text/markdown')}>
								<Download className="w-4 h-4 mr-2" /> Download .md
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
							<Button onClick={() => handleDownload(getHTML(), 'story.html', 'text/html')}>
								<Download className="w-4 h-4 mr-2" /> Download .html
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
							<Button onClick={() => handleDownload(getJSON(), 'backup.json', 'application/json')}>
								<Download className="w-4 h-4 mr-2" /> Backup
							</Button>
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
