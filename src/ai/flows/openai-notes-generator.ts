
'use server';
/**
 * @fileOverview An AI flow for generating notes using OpenAI's GPT models, now with image generation.
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
4.  **Suggest Relevant Images (SAFELY):** As you write, identify key moments, concepts, or figures that would benefit from a visual aid. Insert an image placeholder in the format \`[[IMAGE: A descriptive, safe-for-work prompt for an image generation AI]]\`.
    **CRITICAL SAFETY GUIDELINE:** Image prompts MUST be for **safe, artistic, and symbolic** images. **DO NOT** generate prompts that depict violence, combat, gore, or direct conflict. Instead of a battle, suggest a symbolic representation like a flag, a map, or an artistic depiction of courage.
    *   **BAD EXAMPLE:** \`[[IMAGE: A violent battle scene from the war]]\`
    *   **GOOD EXAMPLE:** \`[[IMAGE: An artistic and symbolic painting of a flag waving over a historic map]]\`
    *   **GOOD EXAMPLE:** \`[[IMAGE: A solemn portrait of the main historical leader]]\`
5.  **Highlight Key Information:** Emphasize the most important keywords, definitions, dates, and concepts by making them **bold**. This is crucial for student revision.
6.  **Language:** Generate the notes strictly in the requested language ({{language}}).
7.  **Be Clear and Authoritative:** Use clear, precise language. Break down complex ideas into easy-to-understand points, but maintain an expert tone.

**Topic to Cover:** {{topic}}
{{#if description}}
**Additional Context:** {{description}}
{{/if}}

Generate the comprehensive, well-structured, and detailed study notes now.
`,
  config: {
    model: 'openai/gpt-4o-mini',
  },
});

const imageGenerator = ai.defineTool(
    {
        name: 'dallEImageGenerator',
        description: 'Generates an image based on a text prompt using DALL-E.',
        inputSchema: z.string(),
        outputSchema: z.string(),
    },
    async (prompt) => {
        const safePrompt = `A safe, educational, and artistic illustration of: ${prompt}`;
        const { media } = await ai.generate({
            model: 'openai/dall-e-2',
            prompt: safePrompt,
        });
        return media.url;
    }
);


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
      pageCount: input.pageCount || 10, // Increased default page count for more detail
    };

    // 1. Generate the initial notes with image placeholders.
    const { output } = await openAIPrompt(finalInput);
    let notesContent = output!.notes;

    // 2. Find all image placeholders.
    const imagePlaceholders = notesContent.match(/\[\[IMAGE: (.*?)\]\]/g) || [];
    
    if (imagePlaceholders.length > 0) {
        // 3. Generate images for each placeholder.
        const imageGenerationPromises = imagePlaceholders.map(placeholder => {
            const prompt = placeholder.replace('[[IMAGE: ', '').replace(']]', '');
            return imageGenerator(prompt);
        });

        const generatedImageUrls = await Promise.all(imageGenerationPromises);

        // 4. Replace placeholders with actual Markdown image tags.
        imagePlaceholders.forEach((placeholder, index) => {
            const imageUrl = generatedImageUrls[index];
            const imageMarkdown = `\n![Generated Image](${imageUrl})\n`;
            notesContent = notesContent.replace(placeholder, imageMarkdown);
        });
    }


    return { notes: notesContent };
  }
);

export async function generateOpenAINotes(input: NotesGeneratorInput): Promise<NotesGeneratorOutput> {
  return await openaiNotesGeneratorFlow(input);
}
