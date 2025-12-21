'use server';
/**
 * @fileOverview An AI flow for generating colorful and structured study notes, now with image generation via Gemini.
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
import { z } from 'genkit';


const notesPrompt = ai.definePrompt({
  name: 'notesGeneratorPrompt',
  input: { schema: NotesGeneratorInputSchema },
  output: { schema: NotesGeneratorOutputSchema },
  prompt: `You are an expert educator and content creator, specializing in creating high-quality, engaging, and well-structured study notes for students. Your task is to generate notes on a given topic in the specified language, detailed enough to span approximately 5 pages.

**Instructions:**
1.  **Analyze the Request:** Carefully read the topic, language, and any additional description provided.
2.  **Generate Comprehensive Content:** Create detailed, in-depth notes. The content should be extensive, covering multiple sub-topics, historical context, key figures, important dates, consequences, and significance.
3.  **Structure the Notes:** Organize the content logically using Markdown. Use headings, subheadings, bold text, and lists.
4.  **Suggest Relevant Images (SAFELY):** As you write, identify key moments or concepts that would benefit from a visual aid. Insert an image placeholder in the format \`[[IMAGE: A descriptive prompt for an image generation AI]]\`.
    **CRITICAL SAFETY GUIDELINE:** The prompts must be for **safe, artistic, and symbolic** images. **DO NOT** generate prompts that depict violence, combat, gore, or direct conflict. Instead of a battle, suggest a symbolic representation like a flag, a map, or an artistic depiction of courage.
    *   **BAD EXAMPLE:** \`[[IMAGE: A violent battle scene from the war]]\`
    *   **GOOD EXAMPLE:** \`[[IMAGE: An artistic and symbolic painting of a flag waving over a historic map]]\`
    *   **GOOD EXAMPLE:** \`[[IMAGE: A solemn portrait of the main historical leader]]\`
5.  **Highlight Key Information:** Emphasize the most important keywords, definitions, dates, and concepts by making them **bold**.
6.  **Language:** Generate the notes strictly in the requested language ({{language}}).
7.  **Be Clear and Concise:** Use simple language and break down complex ideas into easy-to-understand points.

**Topic to Cover:** {{topic}}
{{#if description}}
**Additional Context:** {{description}}
{{/if}}

Generate the notes now.
`,
});

const imageGenerator = ai.defineTool(
    {
        name: 'googleImageGenerator',
        description: 'Generates an image based on a text prompt using Google\'s Imagen model.',
        inputSchema: z.string(),
        outputSchema: z.string(),
    },
    async (prompt) => {
        const safePrompt = `A safe, educational, and artistic illustration of: ${prompt}`;
        const { media } = await ai.generate({
            model: 'googleai/imagen-4.0-fast-generate-001',
            prompt: safePrompt,
        });
        return media.url;
    }
);


const notesGeneratorFlow = ai.defineFlow(
  {
    name: 'notesGeneratorFlow',
    inputSchema: NotesGeneratorInputSchema,
    outputSchema: NotesGeneratorOutputSchema,
  },
  async (input) => {
    // 1. Generate the initial notes with image placeholders.
    const { output } = await notesPrompt(input);
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

export async function generateNotes(input: NotesGeneratorInput): Promise<NotesGeneratorOutput> {
  return await notesGeneratorFlow(input);
}
