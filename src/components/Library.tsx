import { useEffect, useState } from "react"
import { library, type DocumentMeta } from "@/lib/storage"
import { useStore } from "@/lib/store"
import {
	Plus,
	Book,
	MoreVertical,
	Trash2,
	Calendar,
	Loader2,
	Pencil,
	Sparkles,
	GitBranch,
	BrainCircuit,
	ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from "date-fns"
import { DEMO_PROJECT_TITLE, seedShowcaseDemoProject } from '@/lib/demo-project'
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'
import { NoticeBanner } from '@/components/NoticeBanner'

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
import {SettingsDialog} from '@/components/SettingsDialog.tsx';

export function Library() {
	const [docs, setDocs] = useState<DocumentMeta[]>([])
	const [loading, setLoading] = useState(true)
	const [creatingDemo, setCreatingDemo] = useState(false)

	const [newTitle, setNewTitle] = useState("")
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [renameTitle, setRenameTitle] = useState("")
	const [docToRename, setDocToRename] = useState<DocumentMeta | null>(null)
	const [docToDelete, setDocToDelete] = useState<DocumentMeta | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const setCurrentDoc = useStore((state) => state.setCurrentDoc)

	const loadLibrary = async () => {
		setLoading(true)
		const list = await library.list()
		setDocs(list)
		setLoading(false)
	}

	useEffect(() => {
		let isMounted = true

		void library.list()
			.then((list) => {
				if (!isMounted) return
				setDocs(list)
				setLoading(false)
			})
			.catch(() => {
				if (!isMounted) return
				setLoading(false)
			})

		return () => {
			isMounted = false
		}
	}, [])

	const handleCreate = async () => {
		if (!newTitle.trim()) return
		const newDoc = await library.create(newTitle)
		setDocs((currentDocs) => [newDoc, ...currentDocs])
		setNewTitle("")
		setIsDialogOpen(false)
		setCurrentDoc(newDoc)
	}

	// --- DEMO GENERATOR ---
	const createDemoProject = async () => {
		setCreatingDemo(true)
		setErrorMessage(null)
		let createdDemoId: string | null = null

		try {
			const existingDemo = docs.find((doc) => doc.title === DEMO_PROJECT_TITLE)
			if (existingDemo) {
				setCurrentDoc(existingDemo)
				return
			}

			const docMeta = await library.create(DEMO_PROJECT_TITLE)
			createdDemoId = docMeta.id
			const wordCount = await seedShowcaseDemoProject(docMeta.id)
			await library.update(docMeta.id, { wordCount })

			await loadLibrary()
			setCurrentDoc({ ...docMeta, wordCount })
		} catch (error) {
			console.error(error)
			if (createdDemoId) {
				await library.delete(createdDemoId).catch(() => undefined)
			}
			setErrorMessage("Demo creation failed. Please try again.")
		} finally {
			setCreatingDemo(false)
		}
	}

	const handleRename = async () => {
		if (!docToRename || !renameTitle.trim()) return
		await library.update(docToRename.id, { title: renameTitle })
		await loadLibrary()
		setDocToRename(null)
		setRenameTitle("")
	}

	const handleDelete = (e: React.MouseEvent, doc: DocumentMeta) => {
		e.stopPropagation()
		setDocToDelete(doc)
	}

	const confirmDelete = async () => {
		if (!docToDelete) return
		try {
			setErrorMessage(null)
			await library.delete(docToDelete.id)
			await loadLibrary()
			setDocToDelete(null)
		} catch (error) {
			console.error(error)
			setErrorMessage("Couldn't delete this story yet. Close any open Draftless tabs for it and try again.")
			setDocToDelete(null)
		}
	}

	return (
		<div className="min-h-screen bg-background px-4 py-5 sm:p-8 animate-in fade-in duration-500 flex flex-col">
			<div className="max-w-6xl mx-auto space-y-6 sm:space-y-10 lg:space-y-12 w-full flex-1 flex flex-col">

				{/* TOP BAR */}
				<div className="space-y-4 sm:flex sm:items-center sm:justify-between sm:space-y-0">
					<div className="flex items-center gap-3 min-w-0">

							<img
								src="/mask-icon.png"
								alt="Draftless logo"
								className="size-12 sm:size-14 rounded-xl shrink-0" />

						<div className="min-w-0">
							<h1 className="truncate text-xl sm:text-2xl font-bold tracking-tight text-foreground">Draftless</h1>
							<p className="text-muted-foreground text-sm leading-relaxed">A writing studio for brave drafts</p>
						</div>
					</div>

					<div className="shrink-0 sm:hidden">
						<SettingsDialog />
					</div>

					<div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-3">
						<div className="hidden sm:block">
							<SettingsDialog />
						</div>
						{docs.length > 0 && (
							<Button
								variant="outline"
								onClick={createDemoProject}
								disabled={creatingDemo}
								className="w-full sm:w-auto justify-center"
							>
								{creatingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-purple-500" />}
								Open Demo Story
							</Button>
						)}
						<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
							<DialogTrigger asChild>
								<Button className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg justify-center">
									<Plus className="w-4 h-4" /> New Story
								</Button>
							</DialogTrigger>
							<DialogContent className="bg-card border-border sm:max-w-[425px]">
								<DialogHeader>
									<DialogTitle>Start a New Story</DialogTitle>
								</DialogHeader>
								<div className="py-4">
									<Input
										placeholder="Story title"
										value={newTitle}
										onChange={(e) => setNewTitle(e.target.value)}
										onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
										autoFocus
										className="bg-background"
									/>
								</div>
								<DialogFooter>
									<Button onClick={handleCreate} disabled={!newTitle.trim()}>Start Story</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				{errorMessage && (
					<NoticeBanner
						variant="error"
						message={errorMessage}
						onDismiss={() => setErrorMessage(null)}
					/>
				)}

				{/* MAIN CONTENT */}
				{loading ? (
					<div className="flex-1 flex items-center justify-center">
						<Loader2 className="w-10 h-10 animate-spin text-primary/50" />
					</div>
				) : docs.length === 0 ? (
					/* EMPTY STATE ONBOARDING */
					<div className="flex-1 flex items-center">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center py-4 sm:py-8 lg:py-12">
							<div className="space-y-5">
								<h2 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
									Write without fear.<br/>
									<span className="text-primary">Find your way back anytime.</span>
								</h2>
								<p className="max-w-md text-base sm:text-lg text-muted-foreground leading-relaxed">
									Draftless gives you room to explore. Try alternate scenes, compare saved versions,
									keep your story notes close at hand, and ask AI for help when two drafts pull in different directions.
								</p>
								<div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-4">
									<Button size="lg" onClick={() => setIsDialogOpen(true)}
									        className="text-base px-6 sm:px-8 h-11 sm:h-12 shadow-xl shadow-primary/20">
										Start Writing
									</Button>
									<Button size="lg" variant="outline" onClick={createDemoProject}
									        disabled={creatingDemo}
									        className="text-base px-6 sm:px-8 h-11 sm:h-12 border-primary/20 hover:bg-primary/5">
										{creatingDemo ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> :
											<Sparkles className="w-5 h-5 mr-2 text-purple-600"/>}
										Try the Demo
									</Button>
								</div>
							</div>

							{/* Feature Grid */}
								<div className="grid gap-3 sm:gap-4">
									<FeatureCard
										icon={GitBranch}
										title="Time Machine"
										desc="Save alternate passes, revisit earlier versions, and follow your best ideas without losing anything."
										color="text-blue-500"
									/>
									<FeatureCard
										icon={BrainCircuit}
										title="Semantic Weaver"
										desc="Ask AI to blend two scene drafts into a fresh new pass when your story splits."
										color="text-purple-500"
									/>
									<FeatureCard
										icon={Book}
										title="Smart Codex"
										desc="Keep characters, places, objects, and lore within reach while you write."
										color="text-emerald-500"
									/>
							</div>
						</div>
						</div>
						) : (
						/* LIBRARY GRID */
						<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
							{docs.map((doc) => (
								<Card
									key={doc.id}
									className="group cursor-pointer bg-card border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 rounded-2xl"
									onClick={() => setCurrentDoc(doc)}
								>
									<CardHeader className="pb-3 p-4 sm:p-5">
										<div className="flex justify-between items-start">
											<div
												className="mb-3 rounded-xl bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:p-2.5">
												<Book className="h-5 w-5 sm:h-6 sm:w-6"/>
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon"
													        className="h-8 w-8 -mr-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
														<MoreVertical className="w-4 h-4"/>
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="bg-popover border-border">
													<DropdownMenuItem onClick={(e) => {
														e.stopPropagation();
														setDocToRename(doc);
														setRenameTitle(doc.title);
													}}>
														<Pencil className="w-4 h-4 mr-2"/> Rename
													</DropdownMenuItem>
													<DropdownMenuItem
														className="text-destructive focus:text-destructive focus:bg-destructive/10"
														onClick={(e) => handleDelete(e, doc)}
													>
														<Trash2 className="w-4 h-4 mr-2"/> Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
										<CardTitle className="leading-tight text-base sm:text-lg">{doc.title}</CardTitle>
										<CardDescription className="line-clamp-1 text-xs font-medium pt-1">
											{doc.wordCount || 0} words
										</CardDescription>
									</CardHeader>
									<CardFooter
										className="border-t border-border/50 bg-muted/20 px-4 sm:px-5 py-3 text-[10px] text-muted-foreground flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 opacity-70"/>
	                        {formatDistanceToNow(doc.updatedAt, {addSuffix: true})}
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

						<ConfirmActionDialog
							open={!!docToDelete}
							onOpenChange={(open) => {
								if (!open) {
									setDocToDelete(null)
								}
							}}
							title="Delete Story"
							description={
								docToDelete
									? `Delete "${docToDelete.title}" permanently? This also removes its chapters, notes, and saved versions on this device.`
									: 'Delete this story permanently?'
							}
							confirmLabel="Delete Story"
							onConfirm={confirmDelete}
						/>

						{/* FOOTER */}
						<footer className="w-full py-3 sm:py-4 border-t border-border/40 text-center shrink-0">
							<div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
								<span>Built by</span>

								<a
									href="https://fierst.dev"
									target="_blank"
									rel="noreferrer"
									className="font-semibold text-foreground hover:text-primary hover:underline transition-all flex items-center gap-1"
								>
									<img
										src="/fierstdev-logo.svg"
										alt="FierstDev logo"
										className="size-5 rounded-full"
									/>
									Fierst <ExternalLink className="w-3 h-3 opacity-50"/>
								</a>
							</div>
						</footer>

					</div>
					</div>
					)
				}

				function FeatureCard({icon: Icon, title, desc, color}) {
	return (
		<div className="flex gap-3 sm:gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors">
			<div className={`p-2.5 sm:p-3 rounded-lg bg-background h-fit border border-border/50 shadow-sm ${color}`}>
				<Icon className="w-5 h-5 sm:w-6 sm:h-6" />
			</div>
			<div>
				<h3 className="font-semibold text-foreground text-sm sm:text-base">{title}</h3>
				<p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
			</div>
		</div>
	)
}
