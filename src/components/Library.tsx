import { useEffect, useState } from "react"
import { library, type DocumentMeta } from "@/lib/storage"
import { useStore } from "@/lib/store"
import { Plus, Book, MoreVertical, Trash2, Calendar, FileText, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

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

export function Library() {
	const [docs, setDocs] = useState<DocumentMeta[]>([])
	const [loading, setLoading] = useState(true)
	const [newTitle, setNewTitle] = useState("")
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const setCurrentDoc = useStore((state) => state.setCurrentDoc)

	const loadLibrary = async () => {
		setLoading(true)
		const list = await library.list()
		setDocs(list)
		setLoading(false)
	}

	useEffect(() => {
		loadLibrary()
	}, [])

	const handleCreate = async () => {
		if (!newTitle.trim()) return
		const newDoc = await library.create(newTitle)
		setDocs([newDoc, ...docs])
		setNewTitle("")
		setIsDialogOpen(false)
		setCurrentDoc(newDoc) // Open immediately
	}

	const handleDelete = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		if (!confirm("Delete this story permanently? This cannot be undone.")) return
		await library.delete(id)
		await loadLibrary()
	}

	return (
		<div className="min-h-screen bg-background p-8 animate-in fade-in duration-500">
			<div className="max-w-5xl mx-auto space-y-8">

				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">Library</h1>
						<p className="text-muted-foreground">Your local collection of stories and drafts.</p>
					</div>

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
									placeholder="Story Title (e.g. The Martian)"
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

				{/* Content */}
				{loading ? (
					<div className="flex justify-center py-20">
						<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
						{docs.map((doc) => (
							<Card
								key={doc.id}
								className="group cursor-pointer bg-card border-border hover:border-primary/50 transition-all hover:shadow-md hover:-translate-y-1"
								onClick={() => setCurrentDoc(doc)}
							>
								<CardHeader className="pb-3">
									<div className="flex justify-between items-start">
										<div className="p-2 bg-primary/10 rounded-lg text-primary mb-2">
											<Book className="w-5 h-5" />
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
													<MoreVertical className="w-4 h-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="bg-popover border-border">
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
									<CardDescription className="line-clamp-1 text-xs font-medium">
										{doc.wordCount || 0} words
									</CardDescription>
								</CardHeader>
								<CardFooter className="text-[10px] text-muted-foreground border-t border-border bg-muted/30 py-3 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
	                    {formatDistanceToNow(doc.updatedAt, { addSuffix: true })}
                    </span>
								</CardFooter>
							</Card>
						))}

						{/* Empty State */}
						{docs.length === 0 && (
							<div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/5">
								<FileText className="w-10 h-10 mb-4 opacity-20" />
								<p>No stories yet. Create one to get started.</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}