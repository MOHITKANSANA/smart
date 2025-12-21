
'use server';
/**
 * @fileOverview An AI flow for generating notes using OpenAI's GPT models.
 *
 * - generateOpenAINotes: A function to trigger the notes generation process.
 */

import { ai } from '@/ai/genkit';
import {
  NotesGeneratorInputSchema,
  NotesGeneratorOutputSchema,
  type NotesGeneratorInput,
  type NotesGeneratorOutput,
} from './notes-generator.types';

const openAIPrompt = ai.definePrompt({
  name: 'openaiNotesGeneratorPrompt',
  input: { schema: NotesGeneratorInputSchema },
  output: { schema: NotesGeneratorOutputSchema },
  prompt: `You are an expert educator specializing in creating high-quality, engaging, and well-structured study notes. Your task is to generate notes on a given topic in the specified language.

**Instructions:**
1.  **Analyze the Request:** Carefully read the topic, language, and any additional description provided.
2.  **Structure the Notes:** Organize the content logically using Markdown. Use headings, subheadings, bold text, and lists.
3.  **Highlight Key Information:** Emphasize the most important keywords and concepts by making them **bold**.
4.  **Language:** Generate the notes strictly in the requested language ({{language}}).
5.  **Be Clear and Concise:** Use simple language and break down complex ideas.

**Topic to Cover:** {{topic}}
{{#if description}}
**Additional Context:** {{description}}
{{/if}}

Generate the notes now.
`,
  config: {
    model: 'openai/gpt-4o-mini',
  },
});

const openaiNotesGeneratorFlow = ai.defineFlow(
  {
    name: 'openaiNotesGeneratorFlow',
    inputSchema: NotesGeneratorInputSchema,
    outputSchema: NotesGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await openAIPrompt(input);
    return output!;
  }
);

export async function generateOpenAINotes(input: NotesGeneratorInput): Promise<NotesGeneratorOutput> {
  return await openaiNotesGeneratorFlow(input);
}
