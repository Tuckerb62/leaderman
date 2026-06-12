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

  it('strips legacy bolded guide labels before building novel output', () => {
    const parsed = parseExpansionMarkdown(`
**Chapter 1 Guide**

Chapter 1 opens in the river town with a boy who does not fit the expected order.

**What happens in this chapter**

Huck hears a signal in the night and slips out to adventure.

**Why This Chapter Matters**

The chapter sets the conflict between adult control and the pull of freedom.
`, { mode: 'novel' });

    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].key).toBe('shortStoryRetelling');
    const text = parsed.sections[0].paragraphs.join(' ');
    expect(text).not.toContain('Chapter 1 Guide');
    expect(text).not.toContain('What happens in this chapter');
    expect(text).not.toContain('Why This Chapter Matters');
    expect(text).toContain('Chapter 1 opens in the river town with a boy who does not fit the expected order.');
    expect(text).toContain('Huck hears a signal in the night and slips out to adventure.');
    expect(text).toContain('The chapter sets the conflict between adult control and the pull of freedom.');
  });

  it('removes legacy plain-text chapter headings in novel mode', () => {
    const parsed = parseExpansionMarkdown(`
Chapter 1 Guide
Why this chapter matters
The chapter is about a boy stepping out from a narrow world.

What happens in this chapter
He chooses action over certainty and the story turns.

Common reading trap
Do not confuse this as a study guide, and do not treat tension as a chart.
`, { mode: 'novel' });

    expect(parsed.sections[0].key).toBe('shortStoryRetelling');
    expect(parsed.sections[0].paragraphs.join(' ')).not.toContain('Chapter 1 Guide');
    expect(parsed.sections[0].paragraphs.join(' ')).not.toContain('Why this chapter matters');
    expect(parsed.sections[0].paragraphs.join(' ')).not.toContain('What happens in this chapter');
    expect(parsed.sections[0].paragraphs.join(' ')).not.toContain('Common reading trap');
    expect(parsed.sections[0].paragraphs.join(' ')).toContain('He chooses action over certainty');
    expect(parsed.sections[0].paragraphs.join(' ')).toContain('The chapter is about a boy stepping out');
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
    expect(parsed.sections[0].paragraphs).toHaveLength(6);
    expect(parsed.sections[0].paragraphs[0]).toContain(
      'The chapter opens in a room where everyone seems to know the rules except the protagonist.',
    );
    expect(parsed.sections[0].paragraphs[1]).toContain(
      'By the end, a small honest answer has made him visible.',
    );
    expect(parsed.sections[0].paragraphs[2]).toContain('begins by trying not to be noticed');
    expect(parsed.sections[0].paragraphs[3]).toContain('The chapter turns social pressure into the real danger.');
    expect(parsed.sections[0].paragraphs[4]).toContain('Watch who controls the room.');
    expect(parsed.sections[0].paragraphs[5]).toContain('Visibility becomes opportunity and danger.');
    expect(parsed.sections[0].paragraphs.join(' ')).not.toContain('What Changed');
    expect(parsed.sections[0].paragraphs.join(' ')).not.toContain('Why It Matters');
    expect(parsed.sections[0].paragraphs.join(' ')).not.toContain('Reader Guide');
    expect(parsed.sections[0].paragraphs.join(' ')).not.toContain('Keep In Mind');
    expect(parsed.byKey.questions).toBeUndefined();
  });

  it('uses all non-short-story headings only when no required heading is present', () => {
    const parsed = parseExpansionMarkdown(`
## What Changed
The chapter opens with one hard decision.

## Why It Matters
Because pressure becomes visible only when the main rule breaks.

## Keep In Mind
- Stay on scene.
- Keep your footing.
`, { mode: 'novel' });

    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].key).toBe('shortStoryRetelling');
    const flattened = parsed.sections[0].paragraphs.join(' ');
    expect(flattened).toContain('The chapter opens with one hard decision.');
    expect(flattened).toContain('Because pressure becomes visible only when the main rule breaks.');
    expect(flattened).toContain('Stay on scene.');
    expect(flattened).not.toContain('## What Changed');
    expect(flattened).not.toContain('## Why It Matters');
    expect(flattened).not.toContain('## Keep In Mind');
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

  it('uses the required short-story heading when source output lacks one', () => {
    const parsed = parseExpansionMarkdown(`
The chapter starts in a place with no headings.

It continues into a single quiet choice.
`, { mode: 'novel' });

    expect(parsed.sections[0].heading).toBe('Short Story Retelling');
    expect(parsed.sections[0].paragraphs).toEqual([
      'The chapter starts in a place with no headings.',
      'It continues into a single quiet choice.',
    ]);
  });
});
