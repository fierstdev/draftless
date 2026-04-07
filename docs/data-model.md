# Draftless Data Model and Storage

This document is the exact storage and schema reference for the current implementation.

## Storage Layers

Draftless uses three browser storage mechanisms.

## 1. IndexedDB: Library Metadata

Database name:

- `draftless-library`

Object store:

- `documents`

Index:

- `updatedAt`

Interface:

```ts
interface DocumentMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  wordCount?: number
}
```

Purpose:

- Track stories in the library.
- Control the top-level library view.
- Store coarse metadata only.

Notes:

- `list()` returns documents ordered by `updatedAt`, newest first.
- `wordCount` is updated periodically from the active editor.

## 2. Yjs + IndexedDB: Story-Level Project Data

Database naming pattern:

- `draftless-project-{storyId}`

This stores one `Y.Doc` per story.

Inside that Yjs document, Draftless uses these maps:

- `draftless-project-files`
- `draftless-codex`

### `draftless-project-files`

Used by `ProjectManager`.

Interface:

```ts
type FileType = 'chapter' | 'note' | 'folder'

interface ProjectFile {
  id: string
  title: string
  type: FileType
  order: number
  updatedAt: number
}
```

Purpose:

- Store story structure.
- Populate the Contents sidebar.
- Determine chapter compile order.

Notes:

- `folder` exists in the type union but is not created by the current UI.
- `order` is append-only in the current UI flow.

### `draftless-codex`

Used by `CodexManager`.

Interface:

```ts
type EntityType = 'character' | 'location' | 'item' | 'lore'

interface CodexEntity {
  id: string
  name: string
  type: EntityType
  description: string
  color: string
}
```

Purpose:

- Store worldbuilding data per story.
- Drive editor highlighting and hover cards.

Notes:

- Color is derived from entity type in the current UI.
- Entity matching in the editor is name-based and text-based, not reference-based.

## 3. Yjs + IndexedDB: File Content

Database naming pattern:

- `draftless-doc-{fileId}`

This stores one `Y.Doc` per chapter or note.

Purpose:

- Persist Tiptap editor content for a single file.
- Keep chapter and note content isolated from story structure.

How it is used:

- The main editor opens one Yjs document per active file pane.
- Compile spins up temporary headless editors against these databases to read chapter content safely.

Notes:

- The editor content is not stored in the Zustand store.
- Yjs is the canonical source of file text state.

## 4. IndexedDB: File Snapshots

Database naming pattern:

- `draftless-snapshots-{fileId}`

Object store:

- `snapshots`

Version:

- `4`

Interface:

```ts
interface Snapshot {
  id: string
  timestamp: number
  description: string
  content: Content | Fragment | Node
  parentId: string | null
}
```

Purpose:

- Save named checkpoints of a file.
- Restore older versions.
- Build graph history through `parentId`.
- Provide checkpoint input to Semantic Weaver.

Notes:

- Snapshots are per file, not per story.
- `content` is stored as editor JSON, not raw text.
- `parentId` is set from the currently restored or created checkpoint lineage.

## 5. localStorage: UI and AI Settings

Current keys:

- `draftless-theme`
- `ai_provider`
- `google_api_key`
- `openai_api_key`
- `anthropic_api_key`

Purpose:

- Persist theme choice.
- Persist the selected AI provider.
- Persist provider API keys in-browser.

Notes:

- Google can also fall back to `VITE_GOOGLE_API_KEY` from the build environment.
- Saving AI settings reloads the page.

## Storage Map

| Layer | Name / Key | Scope | Stores |
| --- | --- | --- | --- |
| IndexedDB | `draftless-library` | Global | Story metadata |
| Yjs via IndexedDB | `draftless-project-{storyId}` | Per story | File list and codex |
| Yjs via IndexedDB | `draftless-doc-{fileId}` | Per file | Chapter or note content |
| IndexedDB | `draftless-snapshots-{fileId}` | Per file | Checkpoints |
| localStorage | `draftless-theme` | Browser | Theme |
| localStorage | `ai_provider` | Browser | Active AI provider |
| localStorage | `*_api_key` | Browser | Provider credentials |

## Lifecycle Walkthroughs

## Creating a Story

1. Add a `DocumentMeta` record to `draftless-library`.
2. Open the story in the app shell.
3. Create or load `draftless-project-{storyId}`.
4. If there are no files yet, create `Chapter 1` inside `draftless-project-files`.
5. Open `draftless-doc-{fileId}` for the first file.

## Creating a Chapter or Note

1. Add a `ProjectFile` entry to `draftless-project-files`.
2. Open the new file in the active pane.
3. The editor attaches to `draftless-doc-{fileId}`.
4. Content persists automatically through `IndexeddbPersistence`.

## Saving a Checkpoint

1. Read the current Tiptap JSON from the active editor.
2. Create a `Snapshot` record in `draftless-snapshots-{fileId}`.
3. Set `parentId` to the currently active history lineage.
4. Refresh the list and graph views.

## Restoring a Checkpoint

1. Load the selected snapshot from the snapshots store.
2. Call `editor.commands.setContent(snapshot.content)`.
3. Update the current lineage pointer to that snapshot ID.

## Compiling a Story

1. Read the ordered project file list.
2. Filter to chapter files only.
3. Open each `draftless-doc-{fileId}` through a temporary headless editor.
4. Convert each chapter to JSON.
5. Process marks according to export mode.
6. Concatenate into one HTML document.
7. Download as `.doc` or `.html`.

## Data Integrity Notes

## Local-first, not cloud-synced

All current data lives in the browser. Clearing browser storage can remove:

- Stories
- Chapters
- Notes
- Checkpoints
- Codex entries
- AI settings

## Story deletion caveat

Story deletion currently removes the story metadata record, but file content and checkpoint cleanup is incomplete because those databases are keyed by file ID, not story ID.

## Snapshot migration caveat

The snapshots database upgrade path recreates the object store when the version changes. Without a custom migration, future schema bumps can destroy existing checkpoint data.

## Reference Summary

If you are changing code, these are the main files to keep in sync:

- `src/lib/storage.ts`
- `src/lib/project.ts`
- `src/lib/codex.ts`
- `src/components/sidebar/HistoryView.tsx`
- `src/components/CompileDialog.tsx`
- `src/lib/content-processor.ts`
