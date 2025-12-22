
'use server';
/**
 * @fileOverview An AI flow for generating notes using OpenAI's GPT models.
 *
 * - generateOpenAINotes: A function to trigger the notes generation process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
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
  prompt: `You are a world-class expert educator and content creator, with a specialization in creating exceptionally high-quality, comprehensive, and well-structured study notes for competitive exams. Your task is to generate extensive and detailed notes on a given topic in the specified language. The notes should be very thorough, as if you were creating a definitive guide for the topic, aiming for a length that would span approximately {{pageCount}} pages.

**CRITICAL INSTRUCTIONS:**
1.  **Analyze the Request:** Meticulously read the topic, language, page count, and any additional description provided.
2.  **Generate Comprehensive & Deep Content:** Create extremely detailed, in-depth notes. The content must be exhaustive, covering multiple sub-topics, historical context, key figures, critical dates, causes, consequences, significance, and related theories. The content should be substantial enough to genuinely match the requested page count. Do not just make the font bigger; add more facts, analysis, and details.
3.  **Structure the Notes Logically:** Organize the content in a highly logical and hierarchical manner using Markdown. Use headings (H1, H2, H3), subheadings, bold text, and lists (both bulleted and numbered). The structure must be impeccable and easy for a student to follow.
4.  **Highlight Key Information:** Emphasize the most important keywords, definitions, dates, and concepts by making them **bold**. This is crucial for student revision.
5.  **Language:** Generate the notes strictly in the requested language ({{language}}).
6.  **Be Clear and Authoritative:** Use clear, precise language. Break down complex ideas into easy-to-understand points, but maintain an expert tone.

**Topic to Cover:** {{topic}}
{{#if description}}
**Additional Context:** {{description}}
{{/if}}

Generate the comprehensive, well-structured, and detailed study notes now.
`,
});

const openaiNotesGeneratorFlow = ai.defineFlow(
  {
    name: 'openaiNotesGeneratorFlow',
    inputSchema: NotesGeneratorInputSchema,
    outputSchema: NotesGeneratorOutputSchema,
  },
  async (input) => {
    // Set default page count if not provided
    const finalInput = {
      ...input,
      pageCount: input.pageCount || 10,
    };

    const { output } = await ai.generate({
      prompt: openAIPrompt,
      model: 'openai/gpt-4o-mini',
      input: finalInput,
      output: {
        schema: NotesGeneratorOutputSchema,
      }
    });
    
    return { notes: output!.notes };
  }
);

export async function generateOpenAINotes(input: NotesGeneratorInput): Promise<NotesGeneratorOutput> {
  return await openaiNotesGeneratorFlow(input);
}
