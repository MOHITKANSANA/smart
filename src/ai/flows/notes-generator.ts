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
  prompt: `You are an expert educator and content creator, specializing in creating high-quality, engaging, and well-structured study notes for students. Your task is to generate notes on a given topic in the specified language, detailed enough to span approximately {{pageCount}} pages.

**Instructions:**
1.  **Analyze the Request:** Carefully read the topic, language, and any additional description provided.
2.  **Generate Comprehensive Content:** Create detailed, in-depth notes for the specified topic. The content should be extensive, covering multiple sub-topics, historical context, key figures, important dates, consequences, and significance to match the requested page count.
3.  **Structure the Notes:** Organize the content logically using Markdown. Use headings (H1, H2, H3), subheadings, bold text, and lists (bulleted and numbered). The structure must be clean and easy to follow.
4.  **Highlight Key Information:** Emphasize the most important keywords, definitions, dates, and concepts by making them **bold**.
5.  **Language:** Generate the notes strictly in the requested language ({{language}}).
6.  **Be Clear and Concise:** Use simple language and break down complex ideas into easy-to-understand points.
7.  **DO NOT include image placeholders.** Focus solely on generating high-quality textual content.

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
    // Set default page count if not provided
    const finalInput = {
      ...input,
      pageCount: input.pageCount || 5,
    };
    
    const { output } = await notesPrompt(finalInput);
    return { notes: output!.notes };
  }
);

export async function generateNotes(input: NotesGeneratorInput): Promise<NotesGeneratorOutput> {
  return await notesGeneratorFlow(input);
}
