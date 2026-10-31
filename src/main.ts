import { Plugin, PluginSettingTab, Setting, Notice, editorInfoField, getFrontMatterInfo } from 'obsidian';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { StateEffect } from '@codemirror/state';
import { foldable, foldedRanges, foldEffect, unfoldEffect } from '@codemirror/language';
import { headings, collapsedHeadings, type Heading, type Mode } from './headings';

type ExitAction = 'keep' | 'restore' | 'unfold';
type Range = { from: number; to: number };
const modeEffect = StateEffect.define<Mode | null>();

export default class SectionLens extends Plugin {
  exitAction: ExitAction = 'keep';
  controllers = new Set<Lens>();
  status!: HTMLElement;

  async onload() {
    const data = await this.loadData();
    if (['keep', 'restore', 'unfold'].includes(data?.exitAction)) this.exitAction = data.exitAction;
    const plugin = this;
    const extension = ViewPlugin.define(view => new Lens(view, plugin));
    this.registerEditorExtension(extension);
    this.status = this.addStatusBarItem();
    this.status.hide();
    for (const [mode, name] of [['section', 'Focus section'], ['rolling', 'Rolling folds']] as const) {
      this.addCommand({
        id: mode === 'section' ? 'focus-section' : 'rolling-folds', name,
        editorCallback: editor => {
          // Obsidian's CM6 bridge is not part of its public Editor type.
          const cm = (editor as unknown as { cm?: EditorView }).cm;
          const lens = cm?.plugin(extension);
          if (!cm || !lens) {
            new Notice('Section Lens requires Live Preview or Source mode.');
            return;
          }
          cm.dispatch({ effects: modeEffect.of(lens.mode === mode ? null : mode) });
        },
      });
    }
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.updateStatus()));
    this.registerEvent(this.app.workspace.on('file-open', () => {
      for (const lens of this.controllers) lens.checkFile();
      this.updateStatus();
    }));
    this.addSettingTab(new LensSettings(this.app, this));
  }

  updateStatus() {
    const editor = this.app.workspace.activeEditor?.editor;
    const cm = (editor as unknown as { cm?: EditorView } | undefined)?.cm;
    const mode = [...this.controllers].find(lens => lens.view === cm)?.mode;
    this.status.setText(mode ? `Section Lens: ${mode === 'section' ? 'Focus section' : 'Rolling folds'}` : '');
    this.status.toggle(!!mode);
  }

  onunload() {
    for (const lens of this.controllers) if (lens.mode) lens.stop();
  }
}

class Lens {
  mode: Mode | null = null;
  original: Range[] = [];
  tree: Heading[];
  file: unknown;
  timer: ReturnType<typeof setTimeout> | null = null;

  constructor(public view: EditorView, private plugin: SectionLens) {
    this.file = view.state.field(editorInfoField, false)?.file;
    this.tree = this.parse();
    plugin.controllers.add(this);
  }

  parse() {
    const text = this.view.state.doc.toString();
    return headings(text, getFrontMatterInfo(text).contentStart);
  }

  checkFile() {
    const file = this.view.state.field(editorInfoField, false)?.file;
    if (file !== this.file) {
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = null;
      this.mode = null;
      this.original = [];
      this.file = file;
    }
  }

  update(update: ViewUpdate) {
    this.checkFile();
    if (update.docChanged) {
      this.tree = this.parse();
      this.original = this.original.map(range => ({
        from: update.changes.mapPos(range.from, 1),
        to: update.changes.mapPos(range.to, -1),
      })).filter(range => range.from < range.to);
    }
    for (const transaction of update.transactions) {
      for (const effect of transaction.effects) {
        if (!effect.is(modeEffect)) continue;
        if (effect.value && !this.mode) {
          this.original = [];
          foldedRanges(update.state).between(0, update.state.doc.length, (from, to) => {
            this.original.push({ from, to });
          });
        }
        // Dispatching fold changes must happen after CodeMirror finishes updating.
        if (!effect.value) this.schedule(true);
        this.mode = effect.value;
        this.plugin.updateStatus();
      }
    }
    if (this.mode && (update.docChanged || update.selectionSet || update.transactions.some(t => t.effects.some(e => e.is(modeEffect))))) this.schedule();
  }

  schedule(stopping = false) {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.checkFile();
      if (stopping && !this.mode) this.stop();
      else if (this.mode) this.apply();
    }, 0);
  }

  ranges(): Map<number, Range> {
    const result = new Map<number, Range>();
    this.tree.forEach((heading, i) => {
      const line = this.view.state.doc.lineAt(heading.from);
      const range = foldable(this.view.state, line.from, line.to);
      if (range) result.set(i, range);
    });
    return result;
  }

  apply() {
    const ranges = this.ranges();
    const collapsed = collapsedHeadings(this.tree, this.view.state.selection.main.head, this.mode!);
    this.replace([...collapsed].flatMap(i => ranges.get(i) ?? []));
  }

  /** Replace heading folds only, leaving list/code/other block folds untouched. */
  replace(desired: Range[]) {
    const lines = new Set(this.tree.map(h => this.view.state.doc.lineAt(h.from).number));
    const existing: Range[] = [];
    foldedRanges(this.view.state).between(0, this.view.state.doc.length, (from, to) => {
      if (lines.has(this.view.state.doc.lineAt(from).number)) existing.push({ from, to });
    });
    const key = (range: Range) => `${range.from}:${range.to}`;
    const wanted = new Set(desired.map(key));
    const have = new Set(existing.map(key));
    const effects = [
      ...existing.filter(r => !wanted.has(key(r))).map(r => unfoldEffect.of(r)),
      ...desired.filter(r => !have.has(key(r))).map(r => foldEffect.of(r)),
    ];
    if (effects.length) this.view.dispatch({ effects });
  }

  stop() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const ranges = this.ranges();
    if (this.plugin.exitAction !== 'keep') {
      const starts = new Set([...ranges.values()].map(r => r.from));
      this.replace(this.plugin.exitAction === 'restore' ? this.original.filter(r => starts.has(r.from)) : []);
    }
    this.mode = null;
    this.original = [];
    this.plugin.updateStatus();
  }

  destroy() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.plugin.controllers.delete(this);
  }
}

class LensSettings extends PluginSettingTab {
  constructor(app: SectionLens['app'], private plugin: SectionLens) { super(app, plugin); }
  display() {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName('When a mode stops')
      .setDesc('Applies when toggling off or disabling the plugin. Non-heading folds are preserved.')
      .addDropdown(dropdown => dropdown
        .addOptions({ keep: 'Keep folds', restore: 'Restore earlier folds', unfold: 'Unfold all headings' })
        .setValue(this.plugin.exitAction)
        .onChange(async value => {
          this.plugin.exitAction = value as ExitAction;
          await this.plugin.saveData({ exitAction: value });
        }));
  }
}
