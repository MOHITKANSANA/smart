'use server';
/**
 * @fileOverview An AI flow for generating colorful and structured study notes.
 *
 * - generateNotes: A function to trigger the notes generation process.
 */

import { ai } from '@/ai/genkit';
import {
  NotesGeneratorInputSchema,
  NotesGeneratorOutputSchema,
  type NotesGeneratorInput,
  type NotesGeneratorOutput,
} from './notes-generator.types';

const notesPrompt = ai.definePrompt({
  name: 'notesGeneratorPrompt',
  input: { schema: NotesGeneratorInputSchema },
  output: { schema: NotesGeneratorOutputSchema },
  prompt: `You are an expert educator and content creator, specializing in creating high-quality, engaging, and well-structured study notes for students. Your task is to generate notes on a given topic in the specified language.

**Instructions:**
1.  **Analyze the Request:** Carefully read the topic, language, and any additional description provided.
2.  **Structure the Notes:** Organize the content logically. Use Markdown for formatting:
    *   Use '# Main Title' for the primary topic.
    *   Use '## Subheading' for major sections.
    *   Use '### Sub-subheading' for smaller sections.
    *   Use bullet points ('*' or '-') for lists of items.
    *   Use numbered lists ('1.', '2.') for steps or sequential information.
3.  **Highlight Key Information:** Emphasize the most important keywords, definitions, dates, and concepts by making them **bold**. This is crucial for making the notes scannable and easy to review.
4.  **Language:** Generate the notes strictly in the requested language ({{language}}).
5.  **Be Clear and Concise:** Use simple language and break down complex ideas into easy-to-understand points.

**Topic to Cover:** {{topic}}
{{#if description}}
**Additional Context:** {{description}}
{{/if}}

Generate the notes now.
`,
});

const notesGeneratorFlow = ai.defineFlow(
  {
    name: 'notesGeneratorFlow',
    inputSchema: NotesGeneratorInputSchema,
    outputSchema: NotesGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await notesPrompt(input);
    return output!;
  }
);

export async function generateNotes(input: NotesGeneratorInput): Promise<NotesGeneratorOutput> {
  return await notesGeneratorFlow(input);
}
