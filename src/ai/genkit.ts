import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import openai from 'genkitx-openai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
    openai({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
