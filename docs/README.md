# Draftless Documentation

Draftless is a browser-based, local-first writing studio for long-form and non-linear writing. It combines a story library, chapter and note management, version checkpoints, an in-project codex, and AI-assisted merge tools in a single offline-capable app.

This documentation set is based on the current implementation in this repository, not just the product pitch. Where the code has limitations or unfinished surfaces, those are called out explicitly.

## What Draftless Is

At runtime, Draftless is:

- A React + Vite single-page app.
- A local-first data model built on IndexedDB and Yjs.
- A Tiptap-based editor for chapter and note content.
- A browser-only AI client that talks directly to Google, OpenAI, or Anthropic.
- A Progressive Web App (PWA) that can be installed and used offline after the initial load.

Draftless does not currently ship with:

- A backend or hosted sync service.
- User accounts or cloud persistence.
- Automated tests in this repository.
- A visible UI for authoring track-changes marks, even though the export pipeline supports them.

## Read This First

- [User Guide](./user-guide.md)
  For writers using the app day to day.

- [Technical Architecture](./technical-architecture.md)
  For understanding how the app is structured and how the major subsystems fit together.

- [Data Model and Storage](./data-model.md)
  For exact storage keys, schemas, and persistence behavior.

- [Development Guide](./development-guide.md)
  For setup, source-code orientation, and safe extension points.

## Core Concepts

### Story

A story is the top-level project shown in the library. Each story has lightweight metadata in the library database and a separate Yjs project document for its internal structure.

### File

A file is either a chapter or a note inside a story. Each file gets its own persisted Yjs document for editor content.

### Checkpoint

A checkpoint is a named snapshot of a single file's Tiptap JSON content. Checkpoints form a directed graph through `parentId`, which is why the history UI can render both a list and a graph.

### Codex Entity

A codex entry is a character, location, item, or lore entry stored inside the story-level Yjs document. Entities are highlighted in the editor by matching their names against text nodes.

### Semantic Weave

Semantic Weaver is the AI merge workflow. It compares the current editor text against a selected checkpoint and asks the configured model to produce a new merged passage. Confirming the result replaces the current editor content.

## Current Product Snapshot

These points are especially useful if you are onboarding to the repo quickly:

- The app opens into a library dashboard until a story is selected.
- Story structure and codex data live at the project level.
- Chapter and note text live in separate per-file Yjs documents.
- Word count is periodically written back to the library metadata.
- History is per file, not per project.
- The compile flow exports chapters only.
- EPUB currently falls back to HTML export with a user-facing note.

## Recommended Reading Paths

If you are a writer:

1. Start with [User Guide](./user-guide.md).
2. Skim [Data Model and Storage](./data-model.md) only if you care about backups, persistence, or local storage behavior.

If you are a developer:

1. Start with [Technical Architecture](./technical-architecture.md).
2. Read [Data Model and Storage](./data-model.md).
3. Use [Development Guide](./development-guide.md) while making changes.
