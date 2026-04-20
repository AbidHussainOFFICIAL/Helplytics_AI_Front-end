/**
 * AI Service — Multi-Provider with Automatic Key Rotation
 *
 * Priority order:
 *   1. xAI  (Grok)       — base_url: https://api.x.ai/v1
 *   2. Groq              — base_url: https://api.groq.com/openai/v1
 *   3. OpenRouter        — base_url: https://openrouter.ai/api/v1
 *
 * On any rate-limit (429) or quota-exhausted error the service
 * automatically tries the next provider.  If all providers are
 * exhausted it throws so the controller can return a 503.
 */

const OpenAI = require('openai');

// ── Custom error class for better error handling ────────────────────────────
class AIServiceError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.status = status;
    this.statusCode = status;
    this.name = 'AIServiceError';
  }
}

// ── Provider definitions ────────────────────────────────────────────────────
const PROVIDERS = [
  {
    name: 'xAI (Grok)',
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
    model: 'grok-3-mini',           // fast, low-cost Grok model
  },
  {
    name: 'Groq',
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama3-70b-8192',       // Groq's fastest large model
  },
  {
    name: 'OpenRouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'mistralai/mistral-7b-instruct', // free-tier friendly
    defaultHeaders: {
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
      'X-Title': 'HelpHub AI',
    },
  },
];

// ── Rate-limit detection helpers ────────────────────────────────────────────
const RATE_LIMIT_STATUS_CODES = new Set([429]);
const RATE_LIMIT_MESSAGES = [
  'rate limit',
  'quota',
  'too many requests',
  'exceeded',
  'limit reached',
];

function isRateLimitError(err) {
  if (err?.status && RATE_LIMIT_STATUS_CODES.has(err.status)) return true;
  const msg = (err?.message || '').toLowerCase();
  return RATE_LIMIT_MESSAGES.some((kw) => msg.includes(kw));
}

// ── Core ask function with rotation ────────────────────────────────────────
exports.askAI = async (prompt, options = {}) => {
  const { systemPrompt = null, temperature = 0.7, jsonMode = false } = options;

  // Validate input
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new AIServiceError('Prompt cannot be empty', 400);
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  let lastError;
  const availableProviders = PROVIDERS.filter(p => p.apiKey);

  // Check if any providers are configured
  if (availableProviders.length === 0) {
    throw new AIServiceError('AI service is not configured. Please contact support or try again later.', 503);
  }

  for (const provider of availableProviders) {
    try {
      console.log(`[AI] Trying provider: ${provider.name}`);

      const client = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseURL,
        defaultHeaders: provider.defaultHeaders || {},
      });

      const requestParams = {
        model: provider.model,
        messages,
        temperature,
      };

      if (jsonMode) {
        requestParams.response_format = { type: 'json_object' };
      }

      const response = await client.chat.completions.create(requestParams);
      const content = response.choices[0].message.content;

      console.log(`[AI] Success via ${provider.name}`);
      return content;
    } catch (err) {
      lastError = err;

      if (isRateLimitError(err)) {
        console.warn(
          `[AI] Rate limit hit on ${provider.name}. Rotating to next provider...`
        );
        continue; // try next provider
      }

      // Non-rate-limit errors: log and still try next provider as a fallback
      console.error(
        `[AI] Error on ${provider.name}: ${err?.message || err}. Trying next...`
      );
    }
  }

  // All providers failed
  console.error('[AI] All providers exhausted.');
  const errorMsg = lastError?.message || 'All AI providers are unavailable.';
  throw new AIServiceError(errorMsg, 503);
};