import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headings, collapsedHeadings } from '../src/headings';

const text = '# Title\nIntro\n## A\na\n### A1\na1\n#### A1a\ndeep\n### A2\na2\n## B\nb\n### B1\nb1\n';
const tree = headings(text);

void test('focus opens the entire section from a deeply nested cursor', () => {
  assert.deepEqual([...collapsedHeadings(tree, text.indexOf('deep'), 'section')], [5]);
  assert.deepEqual([...collapsedHeadings(tree, text.indexOf('b1'), 'section')], [1]);
});

void test('rolling opens only ancestors and current heading, not descendants or siblings', () => {
  assert.deepEqual([...collapsedHeadings(tree, text.indexOf('deep'), 'rolling')], [4, 5, 6]);
  assert.deepEqual([...collapsedHeadings(tree, text.indexOf('a1\n'), 'rolling')], [3, 4, 5, 6]);
});

void test('preamble folds all sections but preserves the sole title', () => {
  assert.deepEqual([...collapsedHeadings(tree, text.indexOf('Intro'), 'section')], [1, 5]);
});

void test('multiple H1s are actual top-level sections', () => {
  const content = '# A\na\n## Child\nc\n# B\nb';
  assert.deepEqual([...collapsedHeadings(headings(content), content.indexOf('c\n'), 'section')], [2]);
});

void test('parser excludes code, quoted and list headings and accepts setext headings', () => {
  const content = '---\ntitle: metadata\n---\nTitle\n=====\n\n```md\n## Fake\n```\n> ## Quote\n\n- ## List\n\n## Real\ntext';
  const parsed = headings(content, content.indexOf('Title'));
  assert.deepEqual(parsed.map(h => h.level), [1, 2]);
  assert.equal(content.slice(parsed[1].from, parsed[1].from + 7), '## Real');
});

void test('skipped levels retain their true ancestry and EOF stays in its section', () => {
  const content = '## A\n#### Child\nbody\n## B\nend';
  const parsed = headings(content);
  assert.equal(parsed[1].parent, 0);
  assert.deepEqual([...collapsedHeadings(parsed, content.length, 'section')], [0]);
  assert.deepEqual([...collapsedHeadings([], 0, 'rolling')], []);
});
