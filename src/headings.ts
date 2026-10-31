import { parser } from '@lezer/markdown';

export type Mode = 'section' | 'rolling';
export interface Heading {
  from: number;
  end: number;
  level: number;
  parent: number | null;
}

/** Parse Markdown rather than matching heading-looking text inside code blocks. */
export function headings(text: string, bodyStart = 0): Heading[] {
  const result: Heading[] = [];
  const stack: number[] = [];
  parser.parse(text.slice(bodyStart)).iterate({
    enter(node) {
      // Headings in blockquotes and list items are not document sections.
      if (['Blockquote', 'BulletList', 'OrderedList'].includes(node.name)) return false;
      const match = /^(?:ATX|Setext)Heading([1-6])$/.exec(node.name);
      if (!match) return;
      const level = Number(match[1]);
      const from = node.from + bodyStart;
      while (stack.length && result[stack.at(-1)!].level >= level) {
        result[stack.pop()!].end = from;
      }
      const parent = stack.at(-1) ?? null;
      stack.push(result.length);
      result.push({ from, end: text.length, level, parent });
    },
  });
  return result;
}

/** Indices of headings whose bodies should be folded. */
export function collapsedHeadings(tree: Heading[], cursor: number, mode: Mode): Set<number> {
  const collapsed = new Set<number>();
  const ignoreTitle = tree[0]?.level === 1 && tree.filter(h => h.level === 1).length === 1;
  const first = ignoreTitle ? 1 : 0;
  let current = -1;
  for (let i = first; i < tree.length; i++) {
    if (tree[i].from <= cursor && cursor < tree[i].end) current = i;
    // A cursor at the very end still belongs to the last section.
    if (cursor === tree[i].end && i === tree.length - 1) current = i;
  }
  if (mode === 'rolling') {
    const open = new Set<number>();
    for (let i: number | null = current < 0 ? null : current; i !== null; i = tree[i].parent) open.add(i);
    for (let i = first; i < tree.length; i++) if (!open.has(i)) collapsed.add(i);
  } else {
    let root = current;
    while (root >= first && tree[root].parent !== null && tree[root].parent! >= first) root = tree[root].parent!;
    for (let i = first; i < tree.length; i++) {
      const isRoot = tree[i].parent === null || tree[i].parent! < first;
      if (isRoot && i !== root) collapsed.add(i);
    }
  }
  return collapsed;
}
