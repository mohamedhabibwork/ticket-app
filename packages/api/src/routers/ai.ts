import { google } from "@ai-sdk/google";
import { generateText, wrapLanguageModel } from "ai";
import * as z from "zod";

import { publicProcedure } from "../index";

const model = wrapLanguageModel({
  model: google("gemini-2.5-flash"),
});

export const aiRouter = {
  suggestReplies: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        context: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const prompt = `Generate 3 suggested replies for a customer support ticket.
Ticket ID: ${input.ticketId}
${input.context ? `Context: ${input.context}` : ""}

Provide short, helpful responses that address customer concerns.`;

      const { text } = await generateText({
        model,
        prompt,
      });

      const suggestions = text
        .split(/\d+\.\s*/)
        .filter((s) => s.trim())
        .map((s) => s.trim());

      return { suggestions };
    }),

  analyzeSentiment: publicProcedure
    .input(
      z.object({
        text: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const prompt = `Analyze the sentiment of the following text and return a JSON object with:
- sentiment: "positive", "negative", or "neutral"
- score: a number from -1 to 1
- explanation: a brief explanation of the sentiment

Text: "${input.text}"

Respond only with valid JSON.`;

      const { text } = await generateText({
        model,
        prompt: `${prompt}

Respond only with valid JSON.`,
      });

      try {
        return JSON.parse(text);
      } catch {
        return { sentiment: "neutral", score: 0, explanation: "Unable to analyze sentiment" };
      }
    }),

  predictPriority: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        subject: z.string(),
        description: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const prompt = `Predict the priority level for a support ticket.
Ticket ID: ${input.ticketId}
Subject: ${input.subject}
Description: ${input.description}

Priority levels:
- low: General questions, minor issues
- medium: Standard support requests
- high: Important issues affecting work
- urgent: Critical issues requiring immediate attention

Return a JSON object with:
- priority: "low", "medium", "high", or "urgent"
- confidence: a number from 0 to 1
- reasoning: brief explanation`;

      const { text } = await generateText({
        model,
        prompt: `${prompt}

Respond only with valid JSON.`,
      });

      try {
        return JSON.parse(text);
      } catch {
        return { priority: "medium", confidence: 0.5, reasoning: "Unable to determine priority" };
      }
    }),

  suggestRouting: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        subject: z.string(),
        description: z.string(),
        availableTeams: z
          .array(
            z.object({
              id: z.coerce.number(),
              name: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .handler(async ({ input }) => {
      const teamsText = input.availableTeams
        ? `Available teams: ${input.availableTeams.map((t) => t.name).join(", ")}`
        : "No specific teams available.";

      const prompt = `Suggest the best team/routing for a support ticket.

Ticket ID: ${input.ticketId}
Subject: ${input.subject}
Description: ${input.description}
${teamsText}

Consider issue type, complexity, and required expertise.

Return a JSON object with:
- suggestedTeamId: team ID or null
- suggestedTeamName: team name or "general"
- reasoning: brief explanation
- estimatedComplexity: "low", "medium", or "high"`;

      const { text } = await generateText({
        model,
        prompt: `${prompt}

Respond only with valid JSON.`,
      });

      try {
        return JSON.parse(text);
      } catch {
        return {
          suggestedTeamId: null,
          suggestedTeamName: "general",
          reasoning: "Unable to determine routing",
          estimatedComplexity: "medium",
        };
      }
    }),

  suggestArticles: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        query: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const prompt = `Suggest 3-5 knowledge base articles that might help resolve a support ticket.

Ticket ID: ${input.ticketId}
${input.query ? `Search query: ${input.query}` : ""}

Return a JSON array of article suggestions with:
- id: article ID (use 0 if unknown)
- title: article title
- relevance: relevance score from 0 to 1
- summary: brief summary of how it relates to the ticket`;

      const { text } = await generateText({
        model,
        prompt: `${prompt}

Respond only with valid JSON array.`,
      });

      try {
        return { articles: JSON.parse(text) };
      } catch {
        return { articles: [] };
      }
    }),

  generateDraft: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        tone: z.enum(["professional", "friendly", "empathetic", "formal"]).default("professional"),
        includeGreeting: z.coerce.boolean().default(true),
        includeSignature: z.coerce.boolean().default(false),
      }),
    )
    .handler(async ({ input }) => {
      const prompt = `Generate a draft reply for a support ticket.

Ticket ID: ${input.ticketId}
Tone: ${input.tone}
${input.includeGreeting ? "Include a greeting" : "No greeting"}
${input.includeSignature ? "Include a signature" : "No signature"}

Write a helpful, ${input.tone} response that addresses the customer's issue.`;

      const { text } = await generateText({
        model,
        prompt,
      });

      return { draft: text };
    }),

  detectLanguage: publicProcedure
    .input(
      z.object({
        text: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const prompt = `Detect the language of the following text and return a JSON object with:
- language: the ISO 639-1 language code (e.g., "en", "es", "fr")
- languageName: full language name (e.g., "English", "Spanish", "French")
- confidence: a number from 0 to 1

Text: "${input.text.substring(0, 500)}"

Respond only with valid JSON.`;

      const { text } = await generateText({
        model,
        prompt: `${prompt}

Respond only with valid JSON.`,
      });

      try {
        return JSON.parse(text);
      } catch {
        return { language: "en", languageName: "English", confidence: 0.5 };
      }
    }),

  summarize: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        text: z.string().min(1),
        maxLength: z.coerce.number().min(50).max(500).default(150),
      }),
    )
    .handler(async ({ input }) => {
      const prompt = `Summarize the following support ticket content in no more than ${input.maxLength} characters.

Ticket ID: ${input.ticketId}

Content:
${input.text}

Provide a concise summary that captures the main issue or request.`;

      const { text } = await generateText({
        model,
        prompt,
      });

      return { summary: text.substring(0, input.maxLength) };
    }),
};
