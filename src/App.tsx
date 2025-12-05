import { useEffect, useMemo } from 'react'
import { Editor } from "./components/Editor"
import { AppSidebar } from "./components/Sidebar"
import { AppHeader } from "./components/layout/AppHeader" // Import Header
import { ThemeProvider } from "@/lib/theme-provider"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useStore } from "@/lib/store"
import { library } from "@/lib/storage"
import { Library } from "./components/Library"
import { ProjectManager } from '@/lib/project'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

function App() {
    // ... (Global Store & Memoized Docs code remains identical to previous robust version) ...
    const currentDoc = useStore((state) => state.currentDoc)
    const primaryFileId = useStore((state) => state.primaryFileId)
    const secondaryFileId = useStore((state) => state.secondaryFileId)
    const isSplitView = useStore((state) => state.isSplitView)
    const activePane = useStore((state) => state.activePane)
    const setActivePane = useStore((state) => state.setActivePane)
    const openFile = useStore((state) => state.openFile)

    // MEMOIZED DOCS
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const projectDoc = useMemo(() => currentDoc ? new Y.Doc() : null, [currentDoc?.id])
    const primaryDoc = useMemo(() => primaryFileId ? new Y.Doc() : null, [primaryFileId])
    const secondaryDoc = useMemo(() => secondaryFileId ? new Y.Doc() : null, [secondaryFileId])

    useEffect(() => { return () => projectDoc?.destroy() }, [projectDoc])
    useEffect(() => { return () => primaryDoc?.destroy() }, [primaryDoc])
    useEffect(() => { return () => secondaryDoc?.destroy() }, [secondaryDoc])

    // PROJECT PERSISTENCE
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
        const interval = setInterval(() => {
            const count = useStore.getState().wordCount
            if (count > 0) library.update(currentDoc.id, { wordCount: count })
        }, 5000)
        return () => { provider.destroy(); clearInterval(interval) }
    }, [currentDoc, projectDoc, primaryFileId, openFile])

    return (
        <ThemeProvider defaultTheme="system" storageKey="draftless-theme">
            {!currentDoc || !projectDoc ? (
                <Library />
            ) : (
                <SidebarProvider style={{ "--sidebar-width": "24rem" } as React.CSSProperties}>
                    <AppSidebar projectDoc={projectDoc} activeFileId={activePane === 'primary' ? primaryFileId || '' : secondaryFileId || ''} />

                    <SidebarInset>
                        <AppHeader projectDoc={projectDoc} />

                        <div className="flex flex-1 flex-col overflow-hidden bg-muted/10">
                            <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">

                                {/* PANE 1 (PRIMARY) */}
                                <ResizablePanel defaultSize={isSplitView ? 50 : 100} minSize={30}>
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
                                            <div className="flex h-full items-center justify-center text-muted-foreground">Select a chapter</div>
                                        )}
                                    </div>
                                </ResizablePanel>

                                {/* PANE 2 */}
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
                                                    <div className="flex h-full items-center justify-center text-muted-foreground">Select a chapter for split view</div>
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

export default App