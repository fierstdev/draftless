import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2, Cloud, CloudOff, Columns, Maximize } from "lucide-react"
import { useStore } from "@/lib/store"
import { CompileDialog } from "@/components/CompileDialog"
import * as Y from 'yjs'

interface AppHeaderProps {
	projectDoc: Y.Doc
}

export function AppHeader({ projectDoc }: AppHeaderProps) {
	const currentDoc = useStore((state) => state.currentDoc)
	const setCurrentDoc = useStore((state) => state.setCurrentDoc)
	const isSplitView = useStore((state) => state.isSplitView)
	const toggleSplitView = useStore((state) => state.toggleSplitView)
	const collabStatus = useStore((state) => state.collabStatus)
	const wordCount = useStore((state) => state.wordCount)

	if (!currentDoc) return null

	return (
		<header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4 sticky top-0 z-10">
			{/* LEFT: Navigation */}
			<div className="flex items-center gap-2">
				<SidebarTrigger className="-ml-1" />
				<Separator orientation="vertical" className="mr-2 h-4" />
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<Button variant="ghost" size="sm" className="px-2 h-auto font-normal text-muted-foreground hover:text-foreground" onClick={() => setCurrentDoc(null)}>
								<ChevronLeft className="w-4 h-4 mr-1" /> Library
							</Button>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<span className="font-semibold text-foreground">{currentDoc.title}</span>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			{/* RIGHT: Actions */}
			<div className="flex items-center gap-3">
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleSplitView}
					className={isSplitView ? "bg-accent text-accent-foreground" : "text-muted-foreground"}
					title={isSplitView ? "Close Split View" : "Split View"}
				>
					{isSplitView ? <Maximize className="w-4 h-4" /> : <Columns className="w-4 h-4" />}
				</Button>

				<div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
					{collabStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
					{collabStatus === 'connected' && <Cloud className="w-3.5 h-3.5 text-primary" />}
					{collabStatus === 'offline' && <CloudOff className="w-3.5 h-3.5 text-destructive" />}
					<span className="text-muted-foreground hidden sm:inline-block">
                    {collabStatus === 'loading' ? 'Connecting...' : collabStatus === 'connected' ? 'Saved' : 'Offline'}
                </span>
				</div>

				<div className="hidden sm:flex items-center px-3 py-1.5 bg-muted/50 rounded-full border border-border/50 text-xs font-medium text-muted-foreground">
					{wordCount} words
				</div>

				<CompileDialog projectDoc={projectDoc} />
			</div>
		</header>
	)
}