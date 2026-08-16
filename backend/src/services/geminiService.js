/**
 * Phazon Backend — Gemini AI Service
 * ─────────────────────────────────────────────────────────────────
 * Centralized server-side service for all Gemini API communications.
 *
 * Security:
 * - Reads GEMINI_API_KEY exclusively from process.env (never exposed to client).
 * - Enforces timeout (30s) to prevent hanging requests.
 * - Sanitizes all error outputs — no stack traces or API keys are ever leaked.
 */

'use strict';

const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Checks whether the Gemini API key is configured on the backend server.
 * @returns {boolean}
 */
function isConfigured() {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'your_gemini_api_key');
}

/**
 * Sends a prompt to the Gemini API and parses the JSON output.
 *
 * @param {object} params
 * @param {string} params.prompt      — The prompt text to generate content for
 * @param {number} [params.temperature] — Sampling temperature (0.0 to 1.0)
 * @param {number} [params.maxTokens]   — Maximum output tokens
 * @param {string} [params.model]       — Model override (defaults to GEMINI_MODEL env or gemini-2.5-flash)
 * @param {number} [params.timeoutMs]   — Timeout override in milliseconds
 * @returns {Promise<{ success: boolean, data?: object, message?: string, error?: string }>}
 */
async function generateContent({ prompt, temperature, maxTokens, model, timeoutMs }) {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'NOT_CONFIGURED',
      message: 'Gemini API key is not configured on the server.',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY.trim();
  const selectedModel = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const timeout = timeoutMs || DEFAULT_TIMEOUT_MS;

  const endpoint = `${GEMINI_REST_BASE}/${selectedModel}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: temperature ?? 0.4,
      maxOutputTokens: maxTokens ?? 1024,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const statusCode = response.status;
      const apiErrMsg = errJson?.error?.message || response.statusText;

      console.warn(`[GeminiService] API Error ${statusCode}:`, apiErrMsg);

      if (statusCode === 401 || statusCode === 403) {
        return {
          success: false,
          error: 'AUTH_ERROR',
          message: 'Invalid or unauthorized Gemini API key.',
        };
      }

      if (statusCode === 429) {
        return {
          success: false,
          error: 'RATE_LIMIT',
          message: 'Rate limit reached. Please wait a moment and try again.',
        };
      }

      if (statusCode === 503 || statusCode === 500) {
        return {
          success: false,
          error: 'SERVICE_UNAVAILABLE',
          message: 'Gemini AI service is temporarily unavailable.',
        };
      }

      return {
        success: false,
        error: 'API_ERROR',
        message: 'AI request failed.',
      };
    }

    const json = await response.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return {
        success: false,
        error: 'EMPTY_RESPONSE',
        message: 'Gemini returned an empty response.',
      };
    }

    // Attempt to parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (_) {
      // Clean markdown code blocks if present
      const match = rawText.match(/```json\s*([\s\S]*?)```/i) || rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[1] || match[0]);
        } catch (_) {
          return {
            success: false,
            error: 'PARSE_ERROR',
            message: 'Could not parse AI response as JSON.',
          };
        }
      } else {
        return {
          success: false,
          error: 'PARSE_ERROR',
          message: 'Could not parse AI response as JSON.',
        };
      }
    }

    return {
      success: true,
      data: parsed,
    };
  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'TIMEOUT',
        message: 'AI request timed out',
      };
    }

    console.error('[GeminiService] Network Error:', err.message);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: 'Failed to communicate with AI service.',
    };
  }
}

module.exports = {
  isConfigured,
  generateContent,
};
