import { describe, expect, it } from 'vitest';
import { buildAiInstructions, buildResponseInput, extractResponseText } from './aiClient.js';

const lesson = {
  title: 'Control What Is Yours',
  domain: 'Philosophy',
  coreIdea: 'Separate what depends on your judgment from what belongs to fortune.',
  sourceBasis: ['Stoicism', 'The Enchiridion'],
  historicalExample: { title: 'Epictetus under empire' },
  scenario: 'A public criticism lands before an important decision.',
  practiceRep: 'Write two columns.',
  reviewPrompt: 'Stoic control is disciplined authorship of your response.',
};

describe('ai client helpers', () => {
  it('builds lesson-grounded instructions without asking the model to invent facts', () => {
    const instructions = buildAiInstructions(lesson, true);

    expect(instructions).toContain('Control What Is Yours');
    expect(instructions).toContain('Epictetus under empire');
    expect(instructions).toContain('Do not invent book quotes');
  });

  it('builds recent chat input for the Responses API', () => {
    const input = buildResponseInput(
      [
        { role: 'user', content: 'Explain Stoicism.' },
        { role: 'assistant', content: 'It starts with judgment.' },
      ],
      'Give me a drill.',
    );

    expect(input).toEqual([
      { role: 'user', content: 'Explain Stoicism.' },
      { role: 'assistant', content: 'It starts with judgment.' },
      { role: 'user', content: 'Give me a drill.' },
    ]);
  });

  it('extracts direct output text from a Responses API payload', () => {
    expect(extractResponseText({ output_text: '  A clear answer. ' })).toBe('A clear answer.');
  });

  it('extracts nested text from a Responses API payload', () => {
    expect(
      extractResponseText({
        output: [
          {
            content: [{ text: 'First part.' }, { text: { value: 'Second part.' } }],
          },
        ],
      }),
    ).toBe('First part.\nSecond part.');
  });
});
