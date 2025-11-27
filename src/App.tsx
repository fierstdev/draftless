import React, {useEffect, useMemo} from 'react';
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
import {ChevronLeft, Loader2, Cloud, CloudOff, Maximize, Columns} from 'lucide-react';
import { Button } from './components/ui/button'
import {ProjectManager} from '@/lib/project.ts';
import {IndexeddbPersistence} from 'y-indexeddb';
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from '@/components/ui/resizable.tsx';

function App() {
    // Global Store
    const currentDoc = useStore((state) => state.currentDoc)
    const setCurrentDoc = useStore((state) => state.setCurrentDoc)
    const primaryFileId = useStore((state) => state.primaryFileId)
    const secondaryFileId = useStore((state) => state.secondaryFileId)
    const isSplitView = useStore((state) => state.isSplitView)
    const toggleSplitView = useStore((state) => state.toggleSplitView)
    const activePane = useStore((state) => state.activePane)
    const setActivePane = useStore((state) => state.setActivePane)
    const openFile = useStore((state) => state.openFile)
    const editor = useStore((state) => state.editor)
    const wordCount = useStore((state) => state.wordCount)
    const collabStatus = useStore((state) => state.collabStatus)

    // 1. MEMOIZED DOCS (Solves "setState in effect" error)
    // Create the docs via useMemo so they are derived synchronously without triggering re-renders.
    const projectDoc = useMemo(() => {
        return currentDoc ? new Y.Doc() : null
    }, [currentDoc?.id])

    const primaryDoc = useMemo(() => {
        return primaryFileId ? new Y.Doc() : null
    }, [primaryFileId])

    const secondaryDoc = useMemo(() => {
        return secondaryFileId ? new Y.Doc() : null
    }, [secondaryFileId])

    // Cleanup effects for the docs
    useEffect(() => { return () => projectDoc?.destroy() }, [projectDoc])
    useEffect(() => { return () => primaryDoc?.destroy() }, [primaryDoc])
    useEffect(() => { return () => secondaryDoc?.destroy() }, [secondaryDoc])

    // 2. PROJECT PERSISTENCE & INIT
    useEffect(() => {
        if (!currentDoc || !projectDoc) return

        const provider = new IndexeddbPersistence(`draftless-project-${currentDoc.id}`, projectDoc)

        provider.on('synced', () => {
            const pm = new ProjectManager(projectDoc)
            const files = pm.getAll()

            if (files.length === 0) {
                const firstChapterId = pm.create("Chapter 1")
                openFile(firstChapterId)
            } else if (!primaryFileId) {
                openFile(files[0].id)
            }
        })

        // Auto-save metadata
        const interval = setInterval(() => {
            const count = useStore.getState().wordCount
            if (count > 0) library.update(currentDoc.id, { wordCount: count })
        }, 5000)

        return () => {
            provider.destroy()
            clearInterval(interval)
        }
    }, [currentDoc, projectDoc, primaryFileId, openFile])

    return (
        <ThemeProvider defaultTheme="system" storageKey="draftless-theme">
            {!currentDoc || !projectDoc ? (
                <Library />
            ) : (
                <SidebarProvider style={{ "--sidebar-width": "24rem" } as React.CSSProperties}>
                    <AppSidebar projectDoc={projectDoc} activeFileId={activePane === 'primary' ? primaryFileId || '' : secondaryFileId || ''} />

                    <SidebarInset>
                        {/* HEADER */}
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
                                {/* Split View Toggle */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleSplitView}
                                    className={isSplitView ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                                    title={isSplitView ? 'Close Split View' : 'Split View'}
                                >
                                    {isSplitView ? <Maximize className="w-4 h-4"/> : <Columns className="w-4 h-4"/>}
                                </Button>

                                <div
                                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                                    {collabStatus === 'loading' &&
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground"/>}
                                    {collabStatus === 'connected' && <Cloud className="w-3.5 h-3.5 text-primary"/>}
                                    {collabStatus === 'offline' && <CloudOff className="w-3.5 h-3.5 text-destructive"/>}
                                    <span className="text-muted-foreground hidden sm:inline-block">
                                        {collabStatus === 'loading' ? 'Connecting...' : collabStatus === 'connected' ? 'Saved' : 'Offline'}
                                    </span>
                                </div>

                                <div
                                    className="hidden sm:flex items-center px-3 py-1.5 bg-muted/50 rounded-full border border-border/50 text-xs font-medium text-muted-foreground">
                                    {wordCount} words
                                </div>
                                <ExportDialog editor={editor}/>
                            </div>
                        </header>

                        {/* CONTENT GRID */}
                        <div className="flex flex-1 flex-col overflow-hidden bg-muted/10">
                            <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">

                                {/* PANE 1 (PRIMARY) */}
                                <ResizablePanel
                                    defaultSize={isSplitView ? 50 : 100}
                                    minSize={30}>
                                    <div
                                        className={`h-full p-4 md:p-8 overflow-hidden transition-colors ${activePane === 'primary' ? 'bg-background' : 'bg-muted/10'}`}
                                        onClick={() => setActivePane('primary')}
                                    >
                                        {primaryFileId && primaryDoc ? (
                                            <Editor
                                                key={primaryFileId}
                                                ydoc={primaryDoc}
                                                docId={primaryFileId}
                                                projectDoc={projectDoc}
                                                isActivePane={activePane === 'primary'}
                                                onFocus={() => setActivePane('primary')}
                                                className="max-w-3xl mx-auto"
                                            />
                                        ) : (
                                            <EmptyState message="Select a chapter" />
                                        )}
                                    </div>
                                </ResizablePanel>

                                {/* SPLIT HANDLE & PANE 2 */}
                                {isSplitView && (
                                    <>
                                        <ResizableHandle withHandle />
                                        <ResizablePanel defaultSize={50} minSize={30}>
                                            <div
                                                className={`h-full p-4 md:p-8 overflow-hidden transition-colors ${activePane === 'secondary' ? 'bg-background' : 'bg-muted/10'}`}
                                                onClick={() => setActivePane('secondary')}
                                            >
                                                {secondaryFileId && secondaryDoc ? (
                                                    <Editor
                                                        key={secondaryFileId}
                                                        ydoc={secondaryDoc}
                                                        docId={secondaryFileId}
                                                        projectDoc={projectDoc}
                                                        isActivePane={activePane === 'secondary'}
                                                        onFocus={() => setActivePane('secondary')}
                                                        className="max-w-3xl mx-auto"
                                                    />
                                                ) : (
                                                    <EmptyState message="Select a chapter for split view" />
                                                )}
                                            </div>
                                        </ResizablePanel>
                                    </>
                                )}
                            </ResizablePanelGroup>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            )}
        </ThemeProvider>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
            {message}
        </div>
    )
}

export default App