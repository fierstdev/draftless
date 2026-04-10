import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2, Cloud, CloudOff, Columns, Maximize } from "lucide-react"
import { useStore } from "@/lib/store"
import { CompileDialog } from "@/components/CompileDialog"
import { ExportDialog } from "@/components/ExportDialog"
import { SearchPalette } from "@/components/SearchPalette"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { ProjectManager } from "@/lib/project"
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
	const editor = useStore((state) => state.editor)
	const activeFileId = useStore((state) => state.activeFileId)
	const isMobile = useIsMobile()
	const isCompactDesktop = useMediaQuery('(max-width: 1400px)')
	const isTightDesktop = useMediaQuery('(max-width: 1240px)')

	if (!currentDoc) return null

	const activeFileTitle = activeFileId
		? new ProjectManager(projectDoc).getAll().find((file) => file.id === activeFileId)?.title ?? currentDoc.title
		: currentDoc.title

	return (
		<header
			className={cn(
				"sticky top-0 z-10 shrink-0 border-b border-border bg-background",
				isMobile
					? "space-y-2 px-3 py-3"
					: "flex h-16 items-center justify-between gap-2 px-4",
			)}
		>
			{isMobile ? (
				<>
					<div className="flex min-w-0 items-center gap-2">
						<SidebarTrigger className="size-8 shrink-0 -ml-0.5" />
						<Button
							variant="ghost"
							size="sm"
							className="h-8 shrink-0 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
							onClick={() => setCurrentDoc(null)}
						>
							<ChevronLeft className="mr-1 h-4 w-4" />
							Stories
						</Button>
						<div className="min-w-0 flex-1">
							<div className="truncate text-sm font-semibold text-foreground">{currentDoc.title}</div>
						</div>
						<div
							className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"
							title={collabStatus === 'loading' ? 'Opening...' : collabStatus === 'connected' ? 'Saved' : 'Working offline'}
						>
							{collabStatus === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
							{collabStatus === 'connected' && <Cloud className="h-3.5 w-3.5 text-primary" />}
							{collabStatus === 'offline' && <CloudOff className="h-3.5 w-3.5 text-destructive" />}
							<span>{collabStatus === 'loading' ? 'Opening' : collabStatus === 'connected' ? 'Saved' : 'Offline'}</span>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<SearchPalette
							key={currentDoc.id}
							projectDoc={projectDoc}
							triggerClassName="h-8 flex-1 px-2.5 text-xs"
						/>
						<ExportDialog
							editor={editor}
							filenameBase={activeFileTitle}
							compact
							triggerClassName="h-8 w-8 shrink-0 px-0"
						/>
						<CompileDialog
							projectDoc={projectDoc}
							storyTitle={currentDoc.title}
							compact
							triggerClassName="h-8 w-8 shrink-0 px-0"
						/>
					</div>
				</>
			) : (
				<>
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<Breadcrumb className="min-w-0">
							<BreadcrumbList>
								<BreadcrumbItem>
									<Button variant="ghost" size="sm" className="h-auto shrink-0 px-2 font-normal text-muted-foreground hover:text-foreground" onClick={() => setCurrentDoc(null)}>
										<ChevronLeft className="w-4 h-4 mr-1" /> Stories
									</Button>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<span className="block max-w-[240px] truncate font-semibold text-foreground lg:max-w-[320px] xl:max-w-[420px] 2xl:max-w-[520px]">
										{currentDoc.title}
									</span>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					<div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2 xl:gap-3">
						<SearchPalette
							key={currentDoc.id}
							projectDoc={projectDoc}
							triggerClassName={cn(
								"min-w-0 shrink",
								isTightDesktop
									? "w-[200px]"
									: isCompactDesktop
										? "w-[228px]"
										: "w-[260px] xl:w-[300px]",
							)}
						/>

						<Button
							variant="ghost"
							size="icon"
							onClick={toggleSplitView}
							className={isSplitView ? "bg-accent text-accent-foreground" : "text-muted-foreground"}
							title={isSplitView ? "Close side-by-side view" : "Open side-by-side view"}
						>
							{isSplitView ? <Maximize className="w-4 h-4" /> : <Columns className="w-4 h-4" />}
						</Button>

						<div
							className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-2.5 py-1.5 text-xs font-medium"
							title={`${collabStatus === 'loading' ? 'Opening…' : collabStatus === 'connected' ? 'Saved' : 'Working offline'} • ${wordCount} words`}
						>
							{collabStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
							{collabStatus === 'connected' && <Cloud className="w-3.5 h-3.5 text-primary" />}
							{collabStatus === 'offline' && <CloudOff className="w-3.5 h-3.5 text-destructive" />}
							<span className="text-muted-foreground">
								{collabStatus === 'loading' ? 'Opening...' : collabStatus === 'connected' ? 'Saved' : 'Offline'}
							</span>
							{!isTightDesktop && (
								<>
									<span className="h-3 w-px bg-border/70" />
									<span className="text-muted-foreground">{wordCount} words</span>
								</>
							)}
						</div>

						<ExportDialog
							editor={editor}
							filenameBase={activeFileTitle}
							compact={isCompactDesktop}
						/>
						<CompileDialog
							projectDoc={projectDoc}
							storyTitle={currentDoc.title}
							compact={isCompactDesktop}
						/>
					</div>
				</>
			)}
		</header>
	)
}
