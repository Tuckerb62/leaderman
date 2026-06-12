import { describe, expect, it } from 'vitest';
import { parseExpansionMarkdown } from './expansionMapper.js';

describe('expansion mapper', () => {
  it('maps nonfiction expansion Markdown into native lesson sections', () => {
    const parsed = parseExpansionMarkdown(`
## Quick Version
- Name the pressure.
- Choose the next controllable move.

## Deeper Read
The lesson starts with a noisy situation.

The useful move is to separate signal from reaction.

## Break Down
- Notice the trigger.
- Name what belongs to you.

## Remember
- Control is about authorship, not comfort.

## Questions
- Recall: What is the first distinction to make?
- Scenario: A teammate criticizes your plan in public. What do you do first?
- Judgment: When could control language become avoidance?
- Reflection: Where do you over-own outcomes?
`);

    expect(parsed.sections.map((section) => section.key)).toEqual([
      'quickVersion',
      'deeperRead',
      'breakDown',
      'remember',
      'questions',
    ]);
    expect(parsed.byKey.quickVersion.items).toEqual([
      'Name the pressure.',
      'Choose the next controllable move.',
    ]);
    expect(parsed.byKey.deeperRead.paragraphs).toEqual([
      'The lesson starts with a noisy situation.',
      'The useful move is to separate signal from reaction.',
    ]);
    expect(parsed.byKey.questions.questions).toEqual([
      { type: 'Recall', prompt: 'What is the first distinction to make?' },
      { type: 'Scenario', prompt: 'A teammate criticizes your plan in public. What do you do first?' },
      { type: 'Judgment', prompt: 'When could control language become avoidance?' },
      { type: 'Reflection', prompt: 'Where do you over-own outcomes?' },
    ]);
  });

  it('maps novel output with missing headings into a single fallback story section in novel mode', () => {
    const parsed = parseExpansionMarkdown(
      `The candlelight made the room feel smaller than the trouble inside it.

He did not know exactly what would change, only that he had to keep walking.`,
      { mode: 'novel' },
    );

    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].key).toBe('shortStoryRetelling');
    expect(parsed.sections[0].paragraphs).toEqual([
      'The candlelight made the room feel smaller than the trouble inside it.',
      'He did not know exactly what would change, only that he had to keep walking.',
    ]);
  });

  it('maps novel reading companion markdown in strict novel mode into one retelling section', () => {
    const parsed = parseExpansionMarkdown(`
## Story Retelling
The chapter opens in a room where everyone seems to know the rules except the protagonist.

By the end, a small honest answer has made him visible.

## What Changed
He begins by trying not to be noticed and ends with new attention on him.

## Why It Matters
The chapter turns social pressure into the real danger.

## Reader Guide
- Watch who controls the room.
- Notice when politeness becomes pressure.

## Keep In Mind
- Visibility becomes opportunity and danger.
- The hidden rules matter.
`, { mode: 'novel' });

    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].key).toBe('shortStoryRetelling');
    expect(parsed.sections[0].paragraphs).toHaveLength(5);
    expect(parsed.sections[0].paragraphs[0]).toContain(
      'The chapter opens in a room where everyone seems to know the rules except the protagonist.',
    );
    expect(parsed.sections[0].paragraphs[1]).toContain(
      'By the end, a small honest answer has made him visible.',
    );
    expect(parsed.sections[0].paragraphs[2]).toContain('## What Changed');
    expect(parsed.sections[0].paragraphs[2]).toContain('begins by trying not to be noticed');
    expect(parsed.sections[0].paragraphs[3]).toContain('## Why It Matters');
    expect(parsed.sections[0].paragraphs[3]).toContain('social pressure');
    expect(parsed.sections[0].paragraphs[4]).toContain('## Keep In Mind');
    expect(parsed.byKey.questions).toBeUndefined();
  });

  it('keeps unknown headings renderable instead of dropping model output', () => {
    const parsed = parseExpansionMarkdown(`
## Strange But Useful Section
This does not match a known heading, but it should still render.
`);

    expect(parsed.sections[0]).toMatchObject({
      key: 'strangeButUsefulSection',
      heading: 'Strange But Useful Section',
      kind: 'text',
      text: 'This does not match a known heading, but it should still render.',
    });
  });
});
