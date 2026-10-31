// Run inside Obsidian with the CLI; creates and removes its own temporary note.
(async () => {
  const plugin = app.plugins.plugins['section-lens'];
  const originalLeaf = app.workspace.getMostRecentLeaf();
  const originalExit = plugin.exitAction;
  const path = `Notes/Section Lens test ${Date.now()}.md`;
  const text = '# Title\nIntro\n## A\na\n### A1\na1\n#### A1a\ndeep\n### A2\na2\n## B\nb\n### B1\nb1\n- parent\n  - child\n';
  const file = await app.vault.create(path, text);
  const otherFile = await app.vault.create(path.replace('.md', ' other.md'), '## Other\nbody\n## Next\nbody');
  const leaf = app.workspace.getLeaf('tab');
  const results = [];
  const settle = () => new Promise(resolve => setTimeout(resolve, 150));
  const assert = (condition, message) => { if (!condition) throw new Error(message); results.push(message); };
  try {
    await leaf.openFile(file, { state: { mode: 'source' } });
    app.workspace.setActiveLeaf(leaf, { focus: true });
    await settle();
    const view = leaf.view;
    const editor = view.editor;
    const folds = () => view.currentMode.getFoldInfo().folds.map(f => f.from).sort((a,b) => a-b);
    const command = async id => { app.commands.executeCommandById(`section-lens:${id}`); await settle(); };
    editor.setCursor({line:7,ch:1});
    await command('focus-section');
    assert(JSON.stringify(folds()) === '[10]', `Focus deep: ${JSON.stringify(folds())}`);
    await command('rolling-folds');
    assert(JSON.stringify(folds()) === '[8,10,12]', `Rolling deep: ${JSON.stringify(folds())}`);
    editor.setCursor({line:5,ch:1});
    await settle();
    assert(JSON.stringify(folds()) === '[6,8,10,12]', `Rolling parent: ${JSON.stringify(folds())}`);
    editor.setCursor({line:13,ch:1});
    await settle();
    assert(JSON.stringify(folds()) === '[2,4,6,8]', `Rolling other root: ${JSON.stringify(folds())}`);
    await command('rolling-folds');
    assert(JSON.stringify(folds()) === '[2,4,6,8]', 'Keep folds on stop');
    plugin.exitAction = 'unfold';
    await command('focus-section');
    await command('focus-section');
    assert(folds().length === 0, 'Unfold headings on stop');
    view.currentMode.applyFoldInfo({lines:editor.lineCount(),folds:[{from:4,to:7}]});
    plugin.exitAction = 'restore';
    await command('focus-section');
    await command('rolling-folds');
    await command('rolling-folds');
    assert(JSON.stringify(folds()) === '[4]', 'Restore original folds across mode switch');
    await view.setState({ ...view.getState(), source: true }, { history: false });
    await settle();
    editor.setCursor({line:7,ch:1});
    await command('focus-section');
    assert(JSON.stringify(folds()) === '[10]', 'Source mode focus');
    assert(!view.containerEl.querySelector('.cm-content').textContent.includes('B1'), 'Rendered editor hides the other section descendants');
    await command('focus-section');
    view.currentMode.applyFoldInfo({lines:editor.lineCount(),folds:[{from:14,to:15}]});
    editor.setCursor({line:13,ch:1});
    await command('focus-section');
    assert(JSON.stringify(folds()) === '[2,14]', 'List fold preserved inside the active section');
    plugin.exitAction = 'unfold';
    await command('focus-section');
    assert(JSON.stringify(folds()) === '[14]', 'Unfold-on-stop preserves list folds');
    plugin.exitAction = 'restore';
    view.currentMode.applyFoldInfo({lines:editor.lineCount(),folds:[{from:4,to:7}]});
    await command('focus-section');
    editor.replaceRange('\n', {line:0,ch:0});
    await settle();
    await command('focus-section');
    assert(JSON.stringify(folds()) === '[5]', 'Saved folds track inserted text before restoration');
    await command('rolling-folds');
    const second = app.workspace.getLeaf('tab');
    try {
      await second.openFile(otherFile, {state:{mode:'source'}});
      await settle();
      const secondLens = [...plugin.controllers].find(l => l.view === second.view.editor.cm);
      assert(secondLens?.mode === null, 'Other panes remain independent');
    } finally { second.detach(); }
    await leaf.openFile(otherFile, {state:{mode:'source'}});
    await settle();
    const lens = [...plugin.controllers].find(l => l.view === leaf.view.editor.cm);
    assert(lens?.mode === null, 'Opening another note resets the mode');
    return results;
  } finally {
    plugin.exitAction = originalExit;
    leaf.detach();
    await app.vault.delete(file);
    await app.vault.delete(otherFile);
    if (originalLeaf) app.workspace.setActiveLeaf(originalLeaf, { focus: true });
  }
})()
