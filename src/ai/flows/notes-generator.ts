'use server';
/**
 * @fileOverview An AI flow for generating colorful and structured study notes.
 *
 * - generateNotes: A function to trigger the notes generation process.
 * - NotesGeneratorInput: The input type for the flow.
 * - NotesGeneratorOutput: The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const NotesGeneratorInputSchema = z.object({
  topic: z.string().describe('The main topic or chapter title for the notes.'),
  language: z.enum(['Hindi', 'English']).describe('The language in which the notes should be generated.'),
  description: z.string().optional().describe('An optional detailed description or context for the notes.'),
});
export type NotesGeneratorInput = z.infer<typeof NotesGeneratorInputSchema>;

export const NotesGeneratorOutputSchema = z.object({
  notes: z.string().describe('The generated notes in well-structured Markdown format. Use headings, subheadings, bold text, bullet points, and numbered lists to create a clear and organized structure. Highlight key terms and important concepts using bold syntax (**).'),
});
export type NotesGeneratorOutput = z.infer<typeof NotesGeneratorOutputSchema>;

const notesPrompt = ai.definePrompt({
  name: 'notesGeneratorPrompt',
  input: { schema: NotesGeneratorInputSchema },
  output: { schema: NotesGeneratorOutputSchema },
  prompt: `You are an expert educator and content creator, specializing in creating high-quality, engaging, and well-structured study notes for students. Your task is to generate notes on a given topic in the specified language.

**Instructions:**
1.  **Analyze the Request:** Carefully read the topic, language, and any additional description provided.
2.  **Structure the Notes:** Organize the content logically. Use Markdown for formatting:
    *   `# Main Title` for the primary topic.
    *   `## Subheading` for major sections.
    *   `### Sub-subheading` for smaller sections.
    *   Use bullet points (`*` or `-`) for lists of items.
    *   Use numbered lists (`1.`, `2.`) for steps or sequential information.
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
