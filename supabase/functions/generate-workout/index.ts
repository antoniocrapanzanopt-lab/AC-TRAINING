import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Redis } from 'https://esm.sh/@upstash/redis@1.28.3'
import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@1.0.1'

const ALLOWED_ORIGINS = ['http://localhost:5173', 'https://builderathletemanager.com']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

/**
 * Estrae e verifica il claim AAL dal JWT. Rifiuta AAL1.
 * Poiché l'Edge Function ha verify_jwt = true di default in config.toml,
 * Supabase ha già validato la firma del token in ingresso.
 */
function requireMfaAuth(authHeader: string | null) {
  if (!authHeader) throw new Error("Missing Authorization header");

  const token = authHeader.replace("Bearer ", "");
  try {
    const base64Payload = token.split(".")[1];
    const payload = JSON.parse(atob(base64Payload));

    if (payload.aal !== "aal2") {
      throw new Error("Insufficient Assurance Level. AAL2 required.");
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.message.includes("AAL2")) throw error;
    throw new Error("Invalid JWT format");
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  
  // Gestione preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validazione JWT e MFA Guard (AAL2 Enforcement)
    const authHeader = req.headers.get('Authorization')
    try {
      requireMfaAuth(authHeader);
    } catch (err: any) {
      console.warn(`[SECURITY] Accesso Edge Function bloccato: ${err.message}`)
      return new Response(JSON.stringify({ error: `Forbidden: ${err.message}` }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // La chiamata getUser() verifica fisicamente il token contro il DB di Supabase
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 1.5. Controllo Ruolo RBAC Server-Side (Vertical Escalation Prevention)
    // Interroghiamo la funzione RPC is_coach() del DB che usa auth.uid()
    const { data: isCoach, error: rpcError } = await supabaseClient.rpc('is_coach')
    if (rpcError || !isCoach) {
      console.warn(`[SECURITY] Tentativo di invocazione AI bloccato per utente non autorizzato (Atleta). UID: ${user.id}`)
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient privileges. Only coaches can generate workouts.' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 2. RATE LIMITING ATOMICO (Upstash Redis - 5 richieste / minuto)
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
    
    if (redisUrl && redisToken) {
      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      })

      const ratelimit = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
      })

      const identifier = `generate-workout:${user.id}`
      const { success, limit, remaining, reset } = await ratelimit.limit(identifier)

      if (!success) {
        console.error(`Rate Limit Superato per ${user.id}. Blocco atomico Redis.`)
        return new Response(JSON.stringify({ 
          error: 'Rate limit superato. Attendi un minuto prima di generare un nuovo allenamento.' 
        }), {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString()
          }
        })
      }
    } else {
      console.error("ERRORE CRITICO: Upstash Redis non configurato. Chiamata bloccata (Fail Closed) per prevenire Denial of Wallet.")
      return new Response(JSON.stringify({ 
        error: 'Servizio temporaneamente non disponibile per configurazione mancante. Contatta il supporto.' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const requestData = await req.json()
    const { provider, systemPrompt, userPrompt, model, maxTokens, temperature, responseFormat } = requestData

    let apiKey = '';
    let apiUrl = '';
    let requestBody = {};

    // 3. Routing al provider LLM
    if (provider === 'openai') {
      apiKey = Deno.env.get('OPENAI_API_KEY') || ''
      apiUrl = 'https://api.openai.com/v1/chat/completions'
      if (!apiKey) throw new Error('API Key non configurata')
      
      requestBody = {
        model: model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 8192,
        response_format: responseFormat
      }
    } else {
      apiKey = Deno.env.get('GEMINI_API_KEY') || ''
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`
      if (!apiKey) throw new Error('API Key non configurata')

      requestBody = {
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
        ],
        generationConfig: {
          temperature: temperature || 0.7,
          maxOutputTokens: maxTokens || 8192,
          responseMimeType: "application/json"
        }
      }
    }

    // 4. Fetch verso il provider AI
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: provider === 'openai' ? {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      } : {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`AI Provider Error (${response.status}):`, errorText) // Solo log interno, mai al client
      throw new Error(`Errore di comunicazione con il provider AI. Riprova più tardi.`) // Errore sanitizzato
    }

    const data = await response.json()

    // 5. Estrazione testo generato
    let generatedText = '';
    let promptTokens = 0;
    let completionTokens = 0;

    if (provider === 'openai') {
      generatedText = data.choices[0].message.content
      promptTokens = data.usage?.prompt_tokens || 0
      completionTokens = data.usage?.completion_tokens || 0
    } else {
      generatedText = data.candidates[0].content.parts[0].text
      promptTokens = data.usageMetadata?.promptTokenCount || 0
      completionTokens = data.usageMetadata?.candidatesTokenCount || 0
    }

    // 6. Logging Tracciato Asincrono su DB (non bloccante per la return)
    supabaseClient.from('ai_usage_logs').insert({
      coach_id: user.id,
      provider: provider,
      model: model || (provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-pro'),
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens
    }).then(({ error }) => {
      if (error) console.error("Errore salvataggio Audit Log:", error)
    })

    return new Response(JSON.stringify({ text: generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Function Error:", error)
    return new Response(JSON.stringify({ error: error.message || 'Errore interno del server.' }), {
      status: 400,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
