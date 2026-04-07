# Draftless User Guide

This guide is for writers and editors using Draftless as it exists in this repository today.

## What Draftless Helps You Do

Draftless is built around a few writing workflows:

- Managing multiple stories from one local library.
- Breaking a story into chapters and notes.
- Saving named checkpoints of a chapter while you experiment.
- Comparing and merging alternate versions of a scene with AI.
- Maintaining a project codex for people, places, items, and lore.
- Compiling chapters into exportable manuscript files.

Everything is stored in your browser on your own machine. There is no account sign-in or remote sync layer in the current app.

## 1. Start In the Library

When the app loads without an active story, you see the library.

From here you can:

- Create a new story.
- Open an existing story.
- Rename or delete a story.
- Load the built-in demo project.
- Open Settings.

Each story card shows:

- The story title.
- The current recorded word count.
- The last-updated timestamp.

## 2. Create or Open a Story

Creating a story adds it to the library and immediately opens it.

When you open a story for the first time:

- Draftless creates a story-level project document in IndexedDB.
- If the story has no files yet, it automatically creates `Chapter 1`.
- That first chapter is opened in the editor.

## 3. Understand the Main Workspace

Inside a story, the workspace has four main areas:

- Header
  Shows the story title, split-view toggle, save status, word count, and compile action.

- Sidebar
  Switches between `Contents`, `History`, and `Codex`.

- Editor pane
  The main writing surface for the active chapter or note.

- Optional second editor pane
  Appears when split view is enabled.

## 4. Write in Chapters and Notes

Use the `Contents` tab in the sidebar to create files.

Draftless currently supports:

- Chapters
- Notes

What you can do in `Contents`:

- Add a new chapter.
- Add a new note.
- Open a file in the active pane.
- Rename a file.
- Delete a file.

Notes about file behavior:

- Files are stored per story.
- The app tracks one primary pane and, optionally, one secondary pane.
- Clicking a file opens it in whichever pane is currently active.

## 5. Use the Editor

The editor is a Tiptap writing surface with:

- Placeholder text for empty documents.
- A floating menu for headings, bullet lists, and blockquotes.
- A bubble menu for bold, italic, strike, and inline code.
- Live word count in the header for the active pane.

The editor autosaves through IndexedDB-backed Yjs persistence. The status badge in the header reflects that local sync state.

## 6. Work in Split View

Use the split-view button in the header to open a second editor pane.

This is useful when you want to:

- Rewrite one chapter while referencing another.
- Compare a note against a chapter.
- Keep alternate scenes visible side by side.

Behavior to know:

- Turning split view on copies the current primary file into the secondary pane initially.
- Clicking inside a pane makes it the active pane.
- Opening a file from the sidebar replaces the file in the active pane only.

## 7. Save Checkpoints

Checkpoints live in the `History` tab and belong to one file at a time.

To create a checkpoint:

1. Open the file you want to snapshot.
2. Open `History`.
3. Enter a checkpoint name.
4. Save it.

Each checkpoint stores:

- A unique ID.
- A timestamp.
- Your description.
- The editor content at that moment.
- A `parentId` linking it to the previously restored or created checkpoint.

This lets Draftless show history in two formats:

- List view
- Graph view

From the history list you can:

- Restore a checkpoint into the editor.
- Rename a checkpoint.
- Delete a checkpoint.
- Send a checkpoint into Semantic Weaver.

Important behavior:

- Restoring a checkpoint replaces the current editor content.
- Creating a checkpoint does not automatically create project-wide branches. It snapshots the active file only.

## 8. Use Semantic Weaver

Semantic Weaver is the AI merge drawer opened from a checkpoint in the history list.

It compares:

- `Current Draft`: the active editor text.
- `Checkpoint`: the text stored in the selected checkpoint.

It supports three strategies:

- `Smart Mix`
  Keep the current draft's context and style while making the checkpoint's events happen.

- `Restyle`
  Keep the checkpoint's facts but rewrite them in the current draft's voice.

- `Connect`
  Bridge the current draft and checkpoint with a smoother transition.

Typical flow:

1. Open `History`.
2. Pick a checkpoint and choose `Weave`.
3. Pick a strategy.
4. Generate a preview.
5. Re-roll if needed.
6. Confirm to replace the current editor content.

Important behavior:

- The generated result is full replacement text, not an inline diff.
- AI calls happen directly from the browser to the selected provider.

## 9. Build a Codex

The `Codex` tab is your story-specific world bible.

Each entry has:

- Name
- Type
- Description
- Type-based accent color

Supported types:

- Character
- Location
- Item
- Lore

What you can do:

- Add an entity.
- Search by name or type.
- Edit an entity.
- Delete an entity.

How codex highlighting works:

- Draftless scans text nodes for whole-word matches of entity names.
- Matching text is decorated in the editor.
- Hovering highlighted text shows the entity card.

Practical advice:

- Use stable names for characters and places if you want consistent highlighting.
- Very common words may create noisy matches if you use them as entity names.

## 10. Configure AI Providers

Open `Settings`, then go to `Intelligence`.

You can choose:

- Google Gemini
- OpenAI
- Anthropic

You can also store API keys for each provider directly in the browser.

Important behavior:

- Keys are saved in `localStorage` on your device.
- The app reloads after saving provider settings.
- Google is the smoothest browser-native option in the current implementation.
- OpenAI and Anthropic may fail in-browser because of CORS or provider-side restrictions unless you use a proxy.

## 11. Change Appearance and Install the App

In `Settings` you can switch between:

- Light
- Dark
- System

Draftless also supports PWA installation.

On Chromium-based browsers:

- You get an install button when the browser emits an install prompt.

On Safari or iOS:

- Draftless shows manual install instructions.

Once installed, the app can run in standalone mode.

## 12. Compile a Manuscript

Use the `Compile` button in the header to export the current story.

Current compile behavior:

- Only files of type `chapter` are included.
- Notes are excluded.
- Chapters are exported in project order.

Available output formats:

- `Word (.doc)`
- `Web (.html)`
- `Ebook`

Current format notes:

- `Word` is implemented as Word-compatible HTML downloaded as a `.doc` file.
- `Web` exports standard HTML.
- `Ebook` currently falls back to HTML with a warning message.

Content filtering modes:

- `Final Draft`
  Applies additions, removes deletions, hides comments.

- `Review Copy`
  Keeps review marks visible.

- `Original`
  Rejects additions, keeps deleted text, hides comments.

## 13. Troubleshooting

### The AI merge fails

Check these first:

- You selected the provider you want in Settings.
- The matching API key is present.
- Your browser is allowed to reach that provider.
- You are not using OpenAI or Anthropic in an environment where direct browser calls are blocked.

### The history panel is empty

History is manual. You must create checkpoints yourself before the list or graph will show anything.

### My codex entry is not highlighting

The highlighter depends on exact whole-word matches. Try:

- Matching capitalization and spacing more closely.
- Avoiding punctuation inside the entity name.
- Using a more specific name.

### The app says "Offline"

In the current implementation, that status is tied to local IndexedDB/Yjs sync state, not to an online account system. Reloading the page usually helps if the editor did not attach cleanly.

## 14. Current Limits to Be Aware Of

These are implementation details worth knowing as a user:

- Draftless is local-first, but not currently a shared real-time collaboration app.
- The visible UI supports chapters and notes, but not folders.
- Checkpoints are per file, not per whole story.
- Review marks are supported in the export pipeline, but there is no visible UI yet to add them while editing.
