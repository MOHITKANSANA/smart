/**
 * @fileOverview Type definitions for the notes generator AI flow.
 *
 * - NotesGeneratorInput: The input type for the flow.
 * - NotesGeneratorOutput: The return type for the flow.
 */

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
