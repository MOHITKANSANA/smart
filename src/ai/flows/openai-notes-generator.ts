
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
  prompt: `You are an expert educator specializing in creating high-quality, engaging, and well-structured study notes. Your task is to generate notes on a given topic in the specified language that are detailed enough to span approximately 5 pages.

**Instructions:**
1.  **Analyze the Request:** Carefully read the topic, language, and any additional description provided.
2.  **Generate Comprehensive Content:** Create detailed, in-depth notes. The content should be extensive, covering multiple sub-topics, historical context, key figures, important dates, consequences, and significance. Aim for a length that would typically fill 5 standard pages.
3.  **Structure the Notes:** Organize the content logically using Markdown. Use headings, subheadings, bold text, and lists.
4.  **Suggest Relevant Images (SAFELY):** As you write, identify key moments or concepts that would benefit from a visual aid. Insert an image placeholder in the format \`[[IMAGE: A descriptive prompt for an image generation AI]]\`.
    **CRITICAL SAFETY GUIDELINE:** The prompts must be for **safe, artistic, and symbolic** images. **DO NOT** generate prompts that depict violence, combat, gore, or direct conflict. Instead of a battle, suggest a symbolic representation like a flag, a map, or an artistic depiction of courage.
    *   **BAD EXAMPLE:** \`[[IMAGE: A violent battle scene from the war]]\`
    *   **GOOD EXAMPLE:** \`[[IMAGE: An artistic and symbolic painting of a flag waving over a historic map]]\`
    *   **GOOD EXAMPLE:** \`[[IMAGE: A solemn portrait of the main historical leader]]\`
5.  **Highlight Key Information:** Emphasize the most important keywords and concepts by making them **bold**.
6.  **Language:** Generate the notes strictly in the requested language ({{language}}).
7.  **Be Clear and Concise:** Use simple language and break down complex ideas.

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

const imageGenerator = ai.defineTool(
    {
        name: 'dallEImageGenerator',
        description: 'Generates an image based on a text prompt using DALL-E.',
        inputSchema: z.string(),
        outputSchema: z.string(),
    },
    async (prompt) => {
        const safePrompt = `A safe, educational, and artistic illustration of: ${prompt}`;
        console.log(`Generating image for safe prompt: ${safePrompt}`);
        const { media } = await ai.generate({
            model: 'openai/dall-e-2',
            prompt: safePrompt,
        });
        console.log('Image generated successfully.');
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
    // 1. Generate the initial notes with image placeholders.
    const { output } = await openAIPrompt(input);
    let notesContent = output!.notes;

    // 2. Find all image placeholders.
    const imagePlaceholders = notesContent.match(/\[\[IMAGE: (.*?)\]\]/g) || [];
    
    if (imagePlaceholders.length > 0) {
        console.log(`Found ${imagePlaceholders.length} image placeholders. Generating images...`);

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

         console.log('All images generated and embedded in notes.');
    } else {
        console.log('No image placeholders found in the generated notes.');
    }


    return { notes: notesContent };
  }
);

export async function generateOpenAINotes(input: NotesGeneratorInput): Promise<NotesGeneratorOutput> {
  return await openaiNotesGeneratorFlow(input);
}
