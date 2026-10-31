# Section Lens

An Obsidian plugin that keeps the heading context around your cursor visible.

Requires Obsidian **1.14.5 or newer**, the stable version used for integration testing. Uses mobile-compatible APIs; live integration testing currently covers desktop.

## Install

Download `main.js` and `manifest.json` from the [latest release](https://github.com/ChrisDavison/section-lens/releases/latest), place them in `<vault>/.obsidian/plugins/section-lens/`, reload Obsidian, and enable **Section Lens** in Community plugins. The plugin is not yet listed in the community directory.

## Commands

- **Section Lens: Focus section** — expand every heading in the cursor's top-level section and collapse the other top-level sections.
- **Section Lens: Rolling folds** — expand the cursor's heading and its ancestors; collapse every other heading branch, including children of the current heading.

Run a command again to stop its mode. Running the other command switches modes. Assign shortcuts under **Settings → Hotkeys → Section Lens**.

Both modes follow the cursor, **not scrolling**. A heading's body belongs to that heading until a child or subsequent heading begins. Folded sibling headings remain visible for navigation. Manual folds remain adjustable; the mode reapplies on cursor movement or editing.

Each editor pane has its own mode. Opening another note resets that pane to off; modes do not persist across app restarts. Supports Live Preview and Source mode, not Reading view.

## Heading behaviour

The heading hierarchy determines sections. A sole H1 that is the first heading is treated as the document title, so its children become top-level sections. Multiple H1 headings remain separate top-level sections. Skipped heading levels retain their natural ancestry. Both ATX (`## Heading`) and Setext headings are supported.

Before the first section, all sections are folded. A note with no section headings is unchanged. YAML properties, code-block contents, and headings inside lists or quotes are not treated as document sections. List, code, and other non-heading folds are preserved.

## Settings

**When a mode stops** controls toggling off and disabling the plugin:

- **Keep folds** (default).
- **Restore earlier folds** — restore heading folds from when the first mode was enabled. Switching between modes retains that snapshot; positions follow edits.
- **Unfold all headings** — preserve non-heading folds.

Navigating to another note leaves the outgoing note's current folds in place and resets the mode. To restore or unfold before navigating, toggle the command off first.

The status bar shows the active pane's mode. Native Obsidian folds are used, including compatibility with the Synchronise Outline Folds plugin.

## Build and deploy

Requires Node.js and npm.

```sh
npm ci
npm run check
npm run deploy -- /absolute/path/to/vault
obsidian plugin:reload id=section-lens
```

Deployment copies only `main.js` and `manifest.json`, retaining saved settings. For a first installation, enable **Section Lens** under Community plugins after deploying (reload Obsidian if it has not discovered the plugin yet).

To install elsewhere, copy those two files into `<vault>/.obsidian/plugins/section-lens/`.

## Verification

`npm test` verifies heading parsing and tree selection. `npm run build` also type-checks the source.

The live smoke test requires the plugin enabled in a running Obsidian vault. It creates temporary notes in `Notes/`, verifies native fold state and rendered editor content, tests both editing modes and pane isolation, and removes its notes afterward:

```sh
obsidian eval code="eval(require('fs').readFileSync('/absolute/path/to/section-lens/tests/obsidian-smoke.js','utf8'))"
```

The plugin uses CodeMirror's folding APIs and Obsidian's editor context field. The only untyped bridge is Obsidian's `Editor.cm` access, checked when a command runs.

## Releases

Update `manifest.json`, `package.json`, the lockfile, and `versions.json` together. Run `npm run check`, commit, then push a tag matching the version exactly (for example `0.1.0`, without `v`). GitHub Actions builds and publishes `main.js` and `manifest.json` as release attachments after all checks pass.

## Privacy and license

Section Lens runs offline. It makes no network requests, collects no telemetry, and does not access files outside the vault. It stores only its setting through Obsidian's plugin storage and changes editor folds, not note content.

[MIT](LICENSE), copyright Chris Davison. The bundle includes the MIT-licensed Lezer Markdown parser and its common/highlight libraries by Marijn Haverbeke and contributors. Their notices are in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt) and embedded in the distributed `main.js`.
