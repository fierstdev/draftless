import { useEffect, useState } from 'react'
import { Editor } from "./components/Editor"
import { AppSidebar } from "./components/Sidebar"
import { ExportDialog } from "./components/ExportDialog" // Ensure this is imported
import { ThemeProvider } from "@/lib/theme-provider"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useStore } from "@/lib/store"
import { library } from "@/lib/storage"
import { Library } from "./components/Library"
import * as Y from 'yjs'
import { ChevronLeft, Loader2, Cloud, CloudOff } from 'lucide-react'
import { Button } from './components/ui/button'
import {ProjectManager} from '@/lib/project.ts';
import {IndexeddbPersistence} from 'y-indexeddb';

function App() {
    // projectDoc: Holds the Codex and File List
    const [projectDoc, setProjectDoc] = useState<Y.Doc | null>(null)
    // chapterDoc: Holds the actual text content of the active chapter
    const [chapterDoc, setChapterDoc] = useState<Y.Doc | null>(null)

    const currentDoc = useStore((state) => state.currentDoc)
    const setCurrentDoc = useStore((state) => state.setCurrentDoc)
    const activeFileId = useStore((state) => state.activeFileId)
    const setActiveFileId = useStore((state) => state.setActiveFileId)

    const editor = useStore((state) => state.editor)
    const wordCount = useStore((state) => state.wordCount)
    const collabStatus = useStore((state) => state.collabStatus)

    // 1. PROJECT INIT (Runs when opening a Story from Library)
    useEffect(() => {
        if (currentDoc) {
            const doc = new Y.Doc()

            // Persist the PROJECT METADATA (Files, Codex)
            const provider = new IndexeddbPersistence(`draftless-project-${currentDoc.id}`, doc)

            setProjectDoc(doc)

            // Initialize Default Chapter if empty
            provider.on('synced', () => {
                const pm = new ProjectManager(doc)
                const files = pm.getAll()
                if (files.length === 0) {
                    const firstChapterId = pm.create("Chapter 1")
                    setActiveFileId(firstChapterId)
                } else if (!activeFileId) {
                    setActiveFileId(files[0].id)
                }
            })

            // Auto-save word count metadata
            const interval = setInterval(() => {
                const count = useStore.getState().wordCount
                if (count > 0) library.update(currentDoc.id, { wordCount: count })
            }, 5000)

            return () => {
                provider.destroy()
                doc.destroy()
                clearInterval(interval)
            }
        } else {
            setProjectDoc(null)
            setChapterDoc(null)
        }
    }, [currentDoc?.id])

    // 2. CHAPTER INIT (Runs when clicking a file in Sidebar)
    useEffect(() => {
        if (activeFileId) {
            // Create a FRESH doc for just this chapter content
            const doc = new Y.Doc()
            setChapterDoc(doc)
        } else {
            setChapterDoc(null)
        }
    }, [activeFileId])

    return (
        <ThemeProvider defaultTheme="system" storageKey="draftless-theme">

            {!currentDoc || !projectDoc ? (
                <Library />
            ) : (
                <SidebarProvider style={{ "--sidebar-width": "24rem" } as React.CSSProperties}>
                    <AppSidebar projectDoc={projectDoc} activeFileId={activeFileId || ''} />

                    <SidebarInset>
                        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4 sticky top-0 z-10">
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

                            <div className="flex items-center gap-3">
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

                                <ExportDialog editor={editor} />
                            </div>
                        </header>

                        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 bg-background/50">
                            <div className="mx-auto w-full max-w-4xl py-8">
                                {activeFileId && chapterDoc ? (
                                    <Editor key={activeFileId} ydoc={chapterDoc} docId={activeFileId} />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">Select a chapter to begin writing...</div>
                                )}
                            </div>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            )}
        </ThemeProvider>
    )
}

export default App