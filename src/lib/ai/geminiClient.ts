/**
 * GEMINI CLIENT & AI GATEWAY — METODO ANTONIO / AC TRAINING
 * 
 * Client centralizzato e trasparente per le chiamate AI:
 * 1. Lettura diretta di VITE_GEMINI_API_KEY e VITE_GEMINI_MODEL per chiamate client-side dirette a Google REST API
 * 2. Routing a Supabase Edge Function se la chiave client non è presente
 * 3. NO FALLBACK SILENZIOSO: Qualsiasi errore (401, 403, 400, 429, 503) viene propagato esplicitamente
 * 4. Logging strutturato in console con dettagli su provider, model, token, durata e timestamp
 * 5. Stato diagnostico esportato per il Debug Panel UI
 */

import { AI_CONFIG, AIProvider } from '../../config/aiConfig';
import { supabase } from '../supabase';

export interface AIGenerationOptions {
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  provider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
  responseMimeType?: 'application/json' | 'text/plain';
}

export interface AIGenerationResult {
  text: string;
  provider: AIProvider;
  model: string;
  durationMs: number;
  isFallback: boolean;
  promptTokens?: number;
  completionTokens?: number;
  timestamp: string;
}

export interface AIDiagnosticInfo {
  provider: AIProvider;
  model: string;
  apiKeyStatus: 'client_key_present' | 'edge_function_route' | 'missing';
  apiKeyMasked: string;
  lastCallStatus: 'idle' | 'success' | 'error';
  lastCallDurationMs?: number;
  lastCallError?: string;
  lastCallTimestamp?: string;
  lastCallTokens?: { prompt: number; completion: number };
}

// Stato diagnostico singleton per la UI
let diagnosticState: AIDiagnosticInfo = {
  provider: AI_CONFIG.DEFAULT_PROVIDER,
  model: AI_CONFIG.GEMINI.MODEL_ID,
  apiKeyStatus: 'missing',
  apiKeyMasked: 'NON CONFIGURATA',
  lastCallStatus: 'idle',
};

const diagnosticListeners = new Set<(info: AIDiagnosticInfo) => void>();

export function subscribeToAIDiagnostics(cb: (info: AIDiagnosticInfo) => void): () => void {
  diagnosticListeners.add(cb);
  cb({ ...diagnosticState });
  return () => diagnosticListeners.delete(cb);
}

function updateDiagnostic(partial: Partial<AIDiagnosticInfo>) {
  diagnosticState = { ...diagnosticState, ...partial };
  diagnosticListeners.forEach((cb) => cb({ ...diagnosticState }));
}

/**
 * Legge l'ambiente e restituisce la chiave e il modello configurati
 */
export function getGeminiRuntimeConfig() {
  const viteEnvKey =
    typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) : undefined;
  const nodeEnvKey =
    typeof process !== 'undefined' && process.env ? (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY) : undefined;
  const apiKey = (viteEnvKey || nodeEnvKey || '').trim();

  const viteEnvModel =
    typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_GEMINI_MODEL as string | undefined) : undefined;
  const nodeEnvModel =
    typeof process !== 'undefined' && process.env ? (process.env.VITE_GEMINI_MODEL || process.env.GEMINI_MODEL) : undefined;
  const model = (viteEnvModel || nodeEnvModel || AI_CONFIG.GEMINI.MODEL_ID).trim();

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
    : 'NON PRESENTE (Client)';

  return { apiKey, model, maskedKey };
}

/**
 * Invoca l'API Gemini in modo reale e trasparente
 */
export async function generateContentWithGemini(
  options: AIGenerationOptions
): Promise<AIGenerationResult> {
  const { apiKey, model: defaultModel, maskedKey } = getGeminiRuntimeConfig();
  const selectedModel = options.model || defaultModel || 'gemini-2.0-flash';
  const provider: AIProvider = options.provider || AI_CONFIG.DEFAULT_PROVIDER;
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  // Se abbiamo una chiave client-side (es. VITE_GEMINI_API_KEY in .env), chiamiamo l'API REST di Google direttamente
  if (apiKey) {
    updateDiagnostic({
      provider: 'gemini',
      model: selectedModel,
      apiKeyStatus: 'client_key_present',
      apiKeyMasked: maskedKey,
    });

    console.group(`[AI Gateway - Direct Google Gemini] 🚀 ${selectedModel}`);
    console.log('📌 Timestamp:', timestamp);
    console.log('📌 Provider:', 'Google Gemini (Direct REST API v1beta)');
    console.log('📌 Model ID:', selectedModel);
    console.log('📌 API Key:', maskedKey);
    console.log('📌 Endpoint:', `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`);
    console.log('📌 Max Tokens:', options.maxTokens || 8192);
    console.log('📌 Temperature:', options.temperature ?? 0.7);

    const fullPrompt = options.systemPrompt
      ? `${options.systemPrompt}\n\n---\n\n${options.userPrompt}`
      : options.userPrompt;

    const requestBody = {
      contents: [
        {
          parts: [{ text: fullPrompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens || 8192,
        ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
      },
    };

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ [AI Gateway Error] HTTP ${response.status}:`, errorBody);
        console.groupEnd();

        const errMsg = `Errore Google Gemini API (HTTP ${response.status}): ${errorBody}`;
        updateDiagnostic({
          lastCallStatus: 'error',
          lastCallDurationMs: durationMs,
          lastCallError: errMsg,
          lastCallTimestamp: new Date().toISOString(),
        });

        // NESSUN FALLBACK SILENZIOSO: Lanciamo l'errore reale
        throw new Error(errMsg);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const promptTokens = data.usageMetadata?.promptTokenCount || 0;
      const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;

      console.log(`✅ [AI Gateway Success] HTTP 200 OK (${durationMs}ms)`);
      console.log('📊 Tokens:', { prompt: promptTokens, completion: completionTokens, total: promptTokens + completionTokens });
      console.log('📄 Text length:', generatedText.length, 'chars');
      console.log('🛡️ Fallback:', 'NO (Risposta Reale Google Gemini)');
      console.groupEnd();

      const result: AIGenerationResult = {
        text: generatedText,
        provider: 'gemini',
        model: selectedModel,
        durationMs,
        isFallback: false,
        promptTokens,
        completionTokens,
        timestamp: new Date().toISOString(),
      };

      updateDiagnostic({
        lastCallStatus: 'success',
        lastCallDurationMs: durationMs,
        lastCallError: undefined,
        lastCallTimestamp: result.timestamp,
        lastCallTokens: { prompt: promptTokens, completion: completionTokens },
      });

      return result;
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - startTime);
      console.groupEnd();
      const message = err instanceof Error ? err.message : String(err);
      updateDiagnostic({
        lastCallStatus: 'error',
        lastCallDurationMs: durationMs,
        lastCallError: message,
        lastCallTimestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // Se non c'è una chiave client diretta, invochiamo la Edge Function 'generate-workout' su Supabase
  updateDiagnostic({
    provider,
    model: selectedModel,
    apiKeyStatus: 'edge_function_route',
    apiKeyMasked: 'Gestita da Supabase Edge Function (Secret GEMINI_API_KEY)',
  });

  console.group(`[AI Gateway - Supabase Edge Function Route] 🌐 generate-workout (${selectedModel})`);
  console.log('📌 Timestamp:', timestamp);
  console.log('📌 Provider:', provider);
  console.log('📌 Model:', selectedModel);
  console.log('📌 Route:', 'Supabase Edge Function (generate-workout)');

  try {
    const { data, error } = await supabase.functions.invoke('generate-workout', {
      body: {
        provider,
        systemPrompt: options.systemPrompt || '',
        userPrompt: options.userPrompt,
        model: selectedModel,
        maxTokens: options.maxTokens || 8192,
        temperature: options.temperature ?? 0.7,
      },
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (error) {
      console.error('❌ [AI Gateway Error via Edge Function]:', error);
      console.groupEnd();
      const errMsg = `Errore Edge Function Supabase: ${error.message || 'Chiamata fallita'}`;
      updateDiagnostic({
        lastCallStatus: 'error',
        lastCallDurationMs: durationMs,
        lastCallError: errMsg,
        lastCallTimestamp: new Date().toISOString(),
      });
      throw new Error(errMsg);
    }

    if (!data || !data.text) {
      console.error('❌ [AI Gateway Error]: Risposta vuota dal server.');
      console.groupEnd();
      const errMsg = 'Risposta vuota dal server AI.';
      updateDiagnostic({
        lastCallStatus: 'error',
        lastCallDurationMs: durationMs,
        lastCallError: errMsg,
        lastCallTimestamp: new Date().toISOString(),
      });
      throw new Error(errMsg);
    }

    console.log(`✅ [AI Gateway Success via Edge Function] 200 OK (${durationMs}ms)`);
    console.log('📄 Text length:', data.text.length, 'chars');
    console.log('🛡️ Fallback:', 'NO (Risposta Reale dal backend LLM)');
    console.groupEnd();

    const result: AIGenerationResult = {
      text: data.text,
      provider,
      model: selectedModel,
      durationMs,
      isFallback: false,
      timestamp: new Date().toISOString(),
    };

    updateDiagnostic({
      lastCallStatus: 'success',
      lastCallDurationMs: durationMs,
      lastCallError: undefined,
      lastCallTimestamp: result.timestamp,
    });

    return result;
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - startTime);
    console.groupEnd();
    const message = err instanceof Error ? err.message : String(err);
    updateDiagnostic({
      lastCallStatus: 'error',
      lastCallDurationMs: durationMs,
      lastCallError: message,
      lastCallTimestamp: new Date().toISOString(),
    });
    throw err;
  }
}
