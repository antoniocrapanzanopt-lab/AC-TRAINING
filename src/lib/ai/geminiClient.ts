/**
 * GEMINI CLIENT & AI GATEWAY — METODO ANTONIO / AC TRAINING
 * 
 * Client centralizzato e protetto per le chiamate AI:
 * 1. Routing 100% Server-Side tramite Supabase Edge Function 'generate-workout'
 * 2. Nessun segreto né chiave API esposta nel frontend o nel bundle client
 * 3. Rate limiting atomico Redis Upstash & controlli AAL2/is_coach eseguiti sul backend
 * 4. NO FALLBACK SILENZIOSO: Errori e diagnostica propagati in modo esplicito
 * 5. Logging strutturato e stato diagnostico esportato per il Debug Panel UI
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
  apiKeyStatus: 'edge_function_route',
  apiKeyMasked: 'Gestita da Supabase Edge Function (Secret GEMINI_API_KEY)',
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
 * Restituisce la configurazione runtime per la diagnostica UI
 */
export function getGeminiRuntimeConfig() {
  const viteEnvModel =
    typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_GEMINI_MODEL as string | undefined) : undefined;
  const nodeEnvModel =
    typeof process !== 'undefined' && process.env ? (process.env.VITE_GEMINI_MODEL || process.env.GEMINI_MODEL) : undefined;
  const model = (viteEnvModel || nodeEnvModel || AI_CONFIG.GEMINI.MODEL_ID).trim();

  return {
    apiKey: '',
    model,
    maskedKey: 'Gestita da Supabase Edge Function (Server-Side)',
  };
}

export function setGeminiApiKey(_key: string) {
  // Deprecato per ragioni di sicurezza: le chiavi sono gestite server-side
}

export function clearGeminiApiKey() {
  // Deprecato per ragioni di sicurezza: le chiavi sono gestite server-side
}

/**
 * Invoca l'AI tramite la Edge Function Supabase in modo sicuro e verificato (AAL2 + RBAC)
 */
export async function generateContentWithGemini(
  options: AIGenerationOptions
): Promise<AIGenerationResult> {
  const { model: defaultModel } = getGeminiRuntimeConfig();
  const selectedModel = options.model || defaultModel || AI_CONFIG.GEMINI.MODEL_ID;
  const provider: AIProvider = options.provider || AI_CONFIG.DEFAULT_PROVIDER;
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

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
