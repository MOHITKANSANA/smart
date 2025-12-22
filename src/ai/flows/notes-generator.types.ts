/**
 * @fileOverview Type definitions for the notes generator AI flow.
 *
 * - NotesGeneratorInput: The input type for the flow.
 * - NotesGeneratorOutput: The return type for the flow.
 */

import { z } from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export const NotesGeneratorInputSchema = z.object({
  prompt: z.string().describe('The user prompt for the notes.'),
  history: z.array(MessageSchema).optional().describe('The conversation history.'),
});
export type NotesGeneratorInput = z.infer<typeof NotesGeneratorInputSchema>;

export const NotesGeneratorOutputSchema = z.object({
  notes: z.string().describe('The generated notes in well-structured Markdown format. It must use headings, subheadings, bold text, bullet points, and numbered lists.'),
});
export type NotesGeneratorOutput = z.infer<typeof NotesGeneratorOutputSchema>;
