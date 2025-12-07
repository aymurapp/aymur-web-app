/**
 * AI Chat API Route
 *
 * Handles streaming chat with Gemini using Vercel AI SDK.
 * Authenticates users via Supabase and streams responses.
 *
 * @module app/api/ai/chat/route
 */

import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

import { createClient } from '@/lib/supabase/server';

/**
 * System prompt for Aymur AI assistant.
 * Defines the AI's persona and capabilities for jewelry business management.
 */
const SYSTEM_PROMPT = `You are Aymur AI, a helpful assistant for jewelry business management.

You help users with:
- Inventory tracking and management
- Sales analysis and reporting
- Customer relationship management
- Supplier and purchase management
- Business insights and recommendations
- Financial metrics and analytics

Guidelines:
- Be concise, professional, and helpful
- Format responses with markdown when appropriate
- Provide actionable insights when possible
- Respect data privacy - never expose sensitive information
- If asked about operations you cannot perform, explain what the user can do instead`;

/**
 * POST /api/ai/chat
 *
 * Streams AI responses for chat conversations.
 *
 * Request body:
 * - messages: Array of chat messages (required)
 * - conversationId: Optional conversation ID for context
 * - shopId: Optional shop ID for context
 *
 * @param request - The incoming request
 * @returns Streaming response with AI-generated text
 */
export async function POST(request: Request) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { messages } = body;

    // Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Stream response from Gemini
    const result = await streamText({
      model: google('gemini-2.5-flash-preview-05-20'),
      messages,
      system: SYSTEM_PROMPT,
    });

    // 4. Return streaming response
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[AI Chat Error]', error);

    // Handle specific error types
    if (error instanceof SyntaxError) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
