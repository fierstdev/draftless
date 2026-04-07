# Draftless Development Guide

This guide is for contributors working inside the codebase.

## Stack

Draftless currently uses:

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- shadcn/ui + Radix UI primitives
- Zustand
- Tiptap 3
- Yjs + `y-indexeddb`
- `idb`
- Vercel AI SDK
- React Flow + Dagre

## Prerequisites

- Node.js 18 or newer
- npm

Optional:

- A Google Gemini API key
- An OpenAI API key
- An Anthropic API key

## Install and Run

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run build
npm run lint
npm run preview
```

## AI Configuration

There are two ways to provide AI credentials:

### Runtime, in the UI

Open Settings and save:

- Provider choice
- Provider API keys

These are written to `localStorage`.

### Build-time environment

Google also supports a Vite env fallback:

```bash
VITE_GOOGLE_API_KEY=your_key_here
```

Current behavior to remember:

- OpenAI and Anthropic may not work reliably from the browser without a proxy because of CORS or provider-side restrictions.
- Saving AI settings reloads the app.

## Source Tree Orientation

Core entry points:

- `src/main.tsx`
- `src/App.tsx`

Data and state:

- `src/lib/store.ts`
- `src/lib/storage.ts`
- `src/lib/project.ts`
- `src/lib/codex.ts`
- `src/lib/ai-client.ts`
- `src/lib/content-processor.ts`
- `src/lib/theme-provider.tsx`

Main feature surfaces:

- `src/components/Library.tsx`
- `src/components/Sidebar.tsx`
- `src/components/Editor.tsx`
- `src/components/sidebar/FilesView.tsx`
- `src/components/sidebar/HistoryView.tsx`
- `src/components/sidebar/CodexView.tsx`
- `src/components/Weaver.tsx`
- `src/components/CompileDialog.tsx`
- `src/components/SettingsDialog.tsx`

Editor-related extensions:

- `src/components/editor/EntityExtension.ts`
- `src/components/editor/ReviewExtension.ts`

Platform and styling:

- `vite.config.ts`
- `src/index.css`

## How the App Boots

1. `main.tsx` renders `App`.
2. `App` decides between the library view and story workspace based on `currentDoc`.
3. Selecting a story creates and hydrates the story-level Yjs document.
4. Opening a file creates and hydrates a file-level Yjs document.
5. The editor attaches to that file-level Yjs document.

## Where to Make Common Changes

## Add or change library metadata

Touch:

- `src/lib/storage.ts`
- `src/components/Library.tsx`

If the metadata needs to appear in the header or workspace, also update:

- `src/lib/store.ts`
- `src/App.tsx`
- `src/components/layout/AppHeader.tsx`

## Add project-wide structured data

Prefer adding it to the story-level Yjs document, similar to:

- `draftless-project-files`
- `draftless-codex`

Touch:

- A manager in `src/lib/`
- The relevant sidebar or workspace component

## Add file-level writing data

If it belongs to a specific chapter or note, keep it file-scoped and tied to `draftless-doc-{fileId}`.

That keeps chapter content isolated and works cleanly with compile and snapshot flows.

## Add a new editor mark or node

If you introduce new Tiptap semantics, review all of these:

- `src/components/Editor.tsx`
- `src/components/CompileDialog.tsx`
- `src/lib/content-processor.ts`

Reason:

- The visible editor, the headless compile editor, and the export scrubber must all agree on the schema.

## Add a new sidebar workflow

Touch:

- `src/components/Sidebar.tsx`
- Possibly a new component under `src/components/sidebar/`
- Zustand store only if cross-panel UI state is required

## Add a new AI workflow

Touch:

- `src/lib/ai-client.ts`
- The UI surface that invokes it, such as `src/components/Weaver.tsx`
- Settings if the feature needs new provider options or model selection

## Manual Verification Checklist

There are no automated tests in the repo right now, so manual verification matters.

After significant changes, verify:

- Library loads and stories can be created.
- Opening a story creates or loads `Chapter 1`.
- Chapters and notes can be created, renamed, and deleted.
- Editor content persists after reload.
- Split view opens and swaps files correctly.
- Checkpoints can be saved, restored, renamed, and deleted.
- Codex entities can be created and highlighted.
- Compile still exports chapters.
- Settings still save theme and AI provider state.
- The app still builds successfully.

## Current Implementation Gaps

These are useful to know before building on top of the current code:

- `src/lib/yjs-provider.ts` is an empty placeholder.
- `src/components/ExportDialog.tsx` is present but not wired into the live UI.
- `FileType` includes `folder`, but the interface only creates chapters and notes.
- The export path knows about review marks, but the app does not expose a visible review-authoring UI.
- Story deletion does not fully clean up file-level IndexedDB databases.
- Snapshot DB migration is destructive on version changes.

## Safe Extension Advice

If you are extending Draftless, these choices will keep the architecture consistent:

- Keep story structure and story-wide metadata in the project-level Yjs doc.
- Keep prose content in file-level Yjs docs.
- Keep lightweight library metadata in the library IndexedDB database.
- Keep user-specific settings in `localStorage`.
- If you add new export-visible marks, update both the editor and compile path immediately.
- If you add destructive migrations, implement a real upgrade path instead of recreating object stores.

## Suggested Near-Term Improvements

These are the highest-value maintenance opportunities visible from the current codebase:

- Fix story deletion so it cleans up per-file content and snapshot databases.
- Add automated tests around storage managers and content processing.
- Expose review mark authoring or remove the unfinished review/export surface.
- Add reorder support for project files.
- Decide whether `folder` is a planned feature or dead schema and align the code accordingly.
