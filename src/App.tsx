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
import { getProjectDbName, waitForProviderSync } from '@/lib/persistence'
import {
    applyEntityHighlightPreferences,
    getInitialEntityHighlightOpacity,
    getInitialEntityHighlightVisibility,
} from '@/lib/entity-highlights'
import { useIsMobile } from '@/hooks/use-mobile'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import {Analytics} from '@vercel/analytics/react';

function App() {
   // GLOBAL STORE
    const currentDoc = useStore((state) => state.currentDoc)
    const primaryFileId = useStore((state) => state.primaryFileId)
    const secondaryFileId = useStore((state) => state.secondaryFileId)
    const isSplitView = useStore((state) => state.isSplitView)
    const setSplitView = useStore((state) => state.setSplitView)
    const isFocusMode = useStore((state) => state.isFocusMode)
    const activePane = useStore((state) => state.activePane)
    const setActivePane = useStore((state) => state.setActivePane)
    const openFile = useStore((state) => state.openFile)
    const currentDocId = currentDoc?.id ?? null
    const isMobile = useIsMobile()

    // MEMOIZED DOCS
    const projectDoc = useMemo(() => currentDocId ? new Y.Doc() : null, [currentDocId])
    const primaryDoc = useMemo(() => primaryFileId ? new Y.Doc() : null, [primaryFileId])
    const secondaryDoc = useMemo(() => secondaryFileId ? new Y.Doc() : null, [secondaryFileId])

    useEffect(() => { return () => projectDoc?.destroy() }, [projectDoc])
    useEffect(() => { return () => primaryDoc?.destroy() }, [primaryDoc])
    useEffect(() => { return () => secondaryDoc?.destroy() }, [secondaryDoc])

    useEffect(() => {
        if (isMobile && isSplitView) {
            setSplitView(false)
        }
    }, [isMobile, isSplitView, setSplitView])

    useEffect(() => {
        if (isFocusMode && isSplitView) {
            setSplitView(false)
        }
    }, [isFocusMode, isSplitView, setSplitView])

    useEffect(() => {
        applyEntityHighlightPreferences({
            visibility: getInitialEntityHighlightVisibility(),
            opacity: getInitialEntityHighlightOpacity(),
        })
    }, [])

    // PROJECT PERSISTENCE
    useEffect(() => {
        if (!currentDoc || !projectDoc) return
        const provider = new IndexeddbPersistence(getProjectDbName(currentDoc.id), projectDoc)
        let isCancelled = false

        void waitForProviderSync(provider).then(() => {
            if (isCancelled) return

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

        return () => {
            isCancelled = true
            provider.destroy()
            clearInterval(interval)
        }
    }, [currentDoc, projectDoc, primaryFileId, openFile])

    return (
        <ThemeProvider defaultTheme="system" storageKey="draftless-theme">
            {!currentDoc || !projectDoc ? (
                <Library />
            ) : (
                <SidebarProvider
                    className="h-dvh overflow-hidden"
                    style={{ "--sidebar-width": "24rem" } as React.CSSProperties}
                >
                    {!isFocusMode && (
                        <AppSidebar
                            projectDoc={projectDoc}
                            activeFileId={activePane === 'primary' ? primaryFileId || '' : secondaryFileId || ''}
                        />
                    )}

                    <SidebarInset className="min-h-0 overflow-hidden">
                        {!isFocusMode && <AppHeader projectDoc={projectDoc} />}

                        <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${isFocusMode ? 'bg-background' : 'bg-muted/10'}`}>
                            <ResizablePanelGroup direction="horizontal" className="h-full min-h-0 flex-1">

                                {/* PANE 1 (PRIMARY) */}
                                <ResizablePanel defaultSize={isSplitView ? 50 : 100} minSize={30}>
                                    <div
                                        className={`h-full min-h-0 overflow-hidden transition-colors ${
                                            isFocusMode
                                                ? 'bg-background p-2 sm:p-4 md:p-5 lg:p-6'
                                                : `p-2 sm:p-4 md:p-8 ${activePane === 'primary' ? 'bg-background' : 'bg-muted/10'}`
                                        }`}
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
                                                className={`h-full w-full ${isFocusMode ? 'max-w-[1480px]' : 'max-w-[1320px]'}`}
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-muted-foreground">Select a chapter</div>
                                        )}
                                    </div>
                                </ResizablePanel>

                                {/* PANE 2 */}
                                {isSplitView && !isMobile && (
                                    <>
                                        <ResizableHandle withHandle />
                                        <ResizablePanel defaultSize={50} minSize={30}>
                                            <div
                                                className={`h-full min-h-0 overflow-hidden transition-colors ${
                                                    isFocusMode
                                                        ? 'bg-background p-2 sm:p-4 md:p-5 lg:p-6'
                                                        : `p-2 sm:p-4 md:p-8 ${activePane === 'secondary' ? 'bg-background' : 'bg-muted/10'}`
                                                }`}
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
                                                        className={`h-full w-full ${isFocusMode ? 'max-w-[1480px]' : 'max-w-[1320px]'}`}
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
            <Analytics />
        </ThemeProvider>
    )
}

export default App
