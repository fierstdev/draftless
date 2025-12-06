import { useEffect, useState } from "react"
import { library, type DocumentMeta } from "@/lib/storage"
import { useStore } from "@/lib/store"
import { Plus, Book, MoreVertical, Trash2, Calendar, FileText, Loader2, Pencil, Sparkles, GitBranch, BrainCircuit } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import * as Y from "yjs"
import { IndexeddbPersistence } from "y-indexeddb"
import { openDB } from "idb"
import { CodexManager } from "@/lib/codex"
import { ProjectManager } from "@/lib/project"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import {Editor} from '@tiptap/react';
import {SettingsDialog} from '@/components/SettingsDialog.tsx';

export function Library() {
	const [docs, setDocs] = useState<DocumentMeta[]>([])
	const [loading, setLoading] = useState(true)
	const [creatingDemo, setCreatingDemo] = useState(false)

	const [newTitle, setNewTitle] = useState("")
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [renameTitle, setRenameTitle] = useState("")
	const [docToRename, setDocToRename] = useState<DocumentMeta | null>(null)

	const setCurrentDoc = useStore((state) => state.setCurrentDoc)

	const loadLibrary = async () => {
		setLoading(true)
		const list = await library.list()
		setDocs(list)
		setLoading(false)
	}

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		loadLibrary()
	}, [])

	const handleCreate = async () => {
		if (!newTitle.trim()) return
		const newDoc = await library.create(newTitle)
		setDocs([newDoc, ...docs])
		setNewTitle("")
		setIsDialogOpen(false)
		setCurrentDoc(newDoc)
	}

	// --- DEMO GENERATOR ---
	const createDemoProject = async () => {
		setCreatingDemo(true)
		const docMeta = await library.create("The Neon Protocol (Demo)")

		// 1. Init Project Structure
		const ydoc = new Y.Doc()
		const provider = new IndexeddbPersistence(`draftless-project-${docMeta.id}`, ydoc)
		await new Promise<void>(r => provider.on('synced', () => r()))

		const codex = new CodexManager(ydoc)
		codex.add({ name: "Rook", type: "character", description: "A washed-up hacker with a chrome arm.", color: "#3b82f6" })
		codex.add({ name: "Sector 4", type: "location", description: "The industrial district. Smells of ozone and rust.", color: "#10b981" })

		const pm = new ProjectManager(ydoc)
		const ch1 = pm.create("The Infiltration", "chapter")

		// 2. Init Chapter Content (Headless Editor)
		const ch1Doc = new Y.Doc()
		const ch1Provider = new IndexeddbPersistence(`draftless-doc-${ch1}`, ch1Doc)
		await new Promise<void>(r => ch1Provider.on('synced', () => r()))

		// Spin up headless editor to write valid Tiptap data
		const tempEditor = new Editor({
			extensions: [
				StarterKit,
				Collaboration.configure({ document: ch1Doc })
			]
		})

		// Write initial text
		const initialText = "The rain in Sector 4 never really touched the ground; it just turned into steam. Rook adjusted his cybernetic grip."
		tempEditor.commands.setContent(initialText)

		// Capture JSON for snapshot
		const baseJson = tempEditor.getJSON()

		// 3. Create History
		const db = await openDB(`draftless-snapshots-${ch1}`, 4, {
			upgrade(db) { db.createObjectStore('snapshots', { keyPath: 'id' }) }
		})

		const baseId = crypto.randomUUID()
		// Base Snapshot
		await db.put('snapshots', {
			id: baseId,
			timestamp: Date.now() - 3600000,
			description: "Initial Draft",
			content: baseJson,
			parentId: null
		})

		// Divergent Snapshot
		await db.put('snapshots', {
			id: crypto.randomUUID(),
			timestamp: Date.now(),
			description: "Stealth Approach",
			content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: "He bypassed the firewall silently. The guards didn't even blink." }] }] },
			parentId: baseId
		})

		// Cleanup
		tempEditor.destroy()
		await ch1Provider.destroy()
		await provider.destroy()

		await loadLibrary()
		setCreatingDemo(false)
	}

	const handleRename = async () => {
		if (!docToRename || !renameTitle.trim()) return
		await library.update(docToRename.id, { title: renameTitle })
		await loadLibrary()
		setDocToRename(null)
		setRenameTitle("")
	}

	const handleDelete = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		if (!confirm("Delete this story permanently? This cannot be undone.")) return
		await library.delete(id)
		await loadLibrary()
	}

	return (
		<div className="min-h-screen bg-background p-8 animate-in fade-in duration-500">
			<div className="max-w-6xl mx-auto space-y-12">

				{/* TOP BAR */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
							<FileText className="text-primary-foreground h-6 w-6" />
						</div>
						<div>
							<h1 className="text-2xl font-bold tracking-tight text-foreground">Draftless</h1>
							<p className="text-muted-foreground text-sm">Local-First Writing Studio</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<SettingsDialog />
						{docs.length > 0 && (
							<Button variant="outline" onClick={createDemoProject} disabled={creatingDemo}>
								{creatingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-purple-500" />}
								Load Demo
							</Button>
						)}
						<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
							<DialogTrigger asChild>
								<Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
									<Plus className="w-4 h-4" /> New Story
								</Button>
							</DialogTrigger>
							<DialogContent className="bg-card border-border sm:max-w-[425px]">
								<DialogHeader>
									<DialogTitle>Create New Story</DialogTitle>
								</DialogHeader>
								<div className="py-4">
									<Input
										placeholder="Story Title"
										value={newTitle}
										onChange={(e) => setNewTitle(e.target.value)}
										onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
										autoFocus
										className="bg-background"
									/>
								</div>
								<DialogFooter>
									<Button onClick={handleCreate} disabled={!newTitle.trim()}>Create</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				{/* MAIN CONTENT */}
				{loading ? (
					<div className="flex justify-center py-40">
						<Loader2 className="w-10 h-10 animate-spin text-primary/50" />
					</div>
				) : docs.length === 0 ? (
					/* EMPTY STATE ONBOARDING */
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12">
						<div className="space-y-6">
							<h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-4">
								Write without fear.<br/>
								<span className="text-primary">Edit with intelligence.</span>
							</h2>
							<p className="text-lg text-muted-foreground leading-relaxed max-w-md">
								DraftLess treats your prose like code. Branch your story to explore new ideas, merge conflicting drafts with AI, and keep your world bible synced automatically.
							</p>
							<div className="flex gap-4 pt-4">
								<Button size="lg" onClick={() => setIsDialogOpen(true)} className="text-base px-8 h-12 shadow-xl shadow-primary/20">
									Start Writing
								</Button>
								<Button size="lg" variant="outline" onClick={createDemoProject} disabled={creatingDemo} className="text-base px-8 h-12 border-primary/20 hover:bg-primary/5">
									{creatingDemo ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2 text-purple-600" />}
									Try the Demo
								</Button>
							</div>
						</div>

						{/* Feature Grid */}
						<div className="grid gap-4">
							<FeatureCard
								icon={GitBranch}
								title="Time Machine"
								desc="Branch your story like code. Create 'What If' scenarios and merge them back later."
								color="text-blue-500"
							/>
							<FeatureCard
								icon={BrainCircuit}
								title="Semantic Weaver"
								desc="Use AI to resolve plot holes when merging two conflicting drafts of a scene."
								color="text-purple-500"
							/>
							<FeatureCard
								icon={Book}
								title="Smart Codex"
								desc="Your world bible lives in the text. Hover over characters to see their details instantly."
								color="text-emerald-500"
							/>
						</div>
					</div>
				) : (
					/* LIBRARY GRID */
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
						{docs.map((doc) => (
							<Card
								key={doc.id}
								className="group cursor-pointer bg-card border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1"
								onClick={() => setCurrentDoc(doc)}
							>
								<CardHeader className="pb-3">
									<div className="flex justify-between items-start">
										<div className="p-2.5 bg-primary/10 rounded-xl text-primary mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
											<Book className="w-6 h-6" />
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
													<MoreVertical className="w-4 h-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="bg-popover border-border">
												<DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDocToRename(doc); setRenameTitle(doc.title); }}>
													<Pencil className="w-4 h-4 mr-2" /> Rename
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-destructive focus:text-destructive focus:bg-destructive/10"
													onClick={(e) => handleDelete(e, doc.id)}
												>
													<Trash2 className="w-4 h-4 mr-2" /> Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
									<CardTitle className="leading-tight text-lg">{doc.title}</CardTitle>
									<CardDescription className="line-clamp-1 text-xs font-medium pt-1">
										{doc.wordCount || 0} words
									</CardDescription>
								</CardHeader>
								<CardFooter className="text-[10px] text-muted-foreground border-t border-border/50 bg-muted/20 py-3 flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 opacity-70" />
	                        {formatDistanceToNow(doc.updatedAt, { addSuffix: true })}
                        </span>
								</CardFooter>
							</Card>
						))}
					</div>
				)}

				{/* RENAME DIALOG */}
				<Dialog open={!!docToRename} onOpenChange={(open) => !open && setDocToRename(null)}>
					<DialogContent className="bg-card border-border sm:max-w-[425px]">
						<DialogHeader><DialogTitle>Rename Story</DialogTitle></DialogHeader>
						<div className="py-4">
							<Input
								value={renameTitle}
								onChange={(e) => setRenameTitle(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleRename()}
								autoFocus
								className="bg-background"
							/>
						</div>
						<DialogFooter>
							<Button onClick={handleRename} disabled={!renameTitle.trim()}>Save Changes</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

			</div>
		</div>
	)
}

function FeatureCard({ icon: Icon, title, desc, color }) {
	return (
		<div className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors">
			<div className={`p-3 rounded-lg bg-background h-fit border border-border/50 shadow-sm ${color}`}>
				<Icon className="w-6 h-6" />
			</div>
			<div>
				<h3 className="font-semibold text-foreground">{title}</h3>
				<p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
			</div>
		</div>
	)
}