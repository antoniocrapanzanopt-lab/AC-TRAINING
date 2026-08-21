import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ALLOWED_ORIGINS = ['http://localhost:5173', 'https://builderathletemanager.com']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    try {
      requireMfaAuth(authHeader);
    } catch (err: any) {
      console.warn(`[SECURITY] Accesso parse-pdf-workout bloccato: ${err.message}`)
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const { data: isCoach, error: rpcError } = await supabaseClient.rpc('is_coach')
    if (rpcError || !isCoach) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient privileges.' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const requestData = await req.json()
    const { pdfText, pdfBase64 } = requestData

    if (!pdfText && !pdfBase64) {
      return new Response(JSON.stringify({ error: 'Nessun testo o file PDF fornito.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY') || ''
    if (!apiKey) {
      throw new Error('Secret GEMINI_API_KEY non configurato sul server.')
    }

    const systemPrompt = `Sei un esperto parser AI specializzato in schede di allenamento fitness e body building in formato PDF.
Il tuo compito è analizzare il testo o il contenuto del PDF fornito ed estrarre la scheda in un JSON rigorosamente strutturato.

SCHEMA JSON OBBLIGATORIO DA RESTITUIRE:
{
  "title": "Titolo del programma (es. Programma di Allenamento - Nome Atleta)",
  "totalWeeks": numero_settimane_totali,
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "dayName": "GIORNO 1",
          "exercises": [
            {
              "orderLetter": "A",
              "rawName": "Nome Esercizio",
              "sets": 3,
              "repsTarget": "10-12",
              "isTimeBased": false,
              "durationSeconds": null,
              "restSeconds": 90,
              "restDisplay": "01:30",
              "notes": "Note dell'esercizio se presenti"
            }
          ]
        }
      ]
    }
  ]
}

REGOLE DI ESTRAZIONE STRINGENTI:
1. "settimane": Identifica ogni Blocco "SETTIMANA 1", "SETTIMANA 2", etc.
2. "giorni": Identifica "Allenamento 1 GIORNO 1", "GIORNO 2", "GIORNO 3", etc.
3. "lettera": Conserva la lettera d'ordine (A, B, C, D, E, F, G...).
4. "serie": Estrai il numero intero di serie (es. "Serie 4" -> 4, "Serie 3" -> 3).
5. "ripetizioni vs tempo":
   - Se c'è "Periodo 01:00" -> isTimeBased: true, durationSeconds: 60, repsTarget: "".
   - Se c'è "Periodo 00:30" -> isTimeBased: true, durationSeconds: 30, repsTarget: "".
   - Se c'è "Ripetizioni 10-12" -> isTimeBased: false, durationSeconds: null, repsTarget: "10-12".
   - Se c'è "Ripetizioni 10-12 x lato" -> repsTarget: "10-12 x lato".
6. "recupero":
   - "01:00" -> restSeconds: 60, restDisplay: "01:00".
   - "01:30" -> restSeconds: 90, restDisplay: "01:30".
   - "02:00" -> restSeconds: 120, restDisplay: "02:00".
   - "No Recupero" -> restSeconds: 0, restDisplay: "No Recupero".
7. "note": Se sotto l'esercizio compare "Note: ...", estrai solo il testo della nota pulito.
8. Restituisci ESCLUSIVAMENTE il codice JSON valido, senza blocchi di codice markdown (senza \`\`\`json).`;

    let parts: any[] = [];
    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64
        }
      });
      parts.push({ text: systemPrompt });
    } else {
      parts.push({ text: systemPrompt + "\n\nTESTO DA PARSARE:\n" + pdfText });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini Parse Error:", errText);
      throw new Error("Errore durante la lettura dell'AI.");
    }

    const resData = await response.json();
    const rawJson = resData.candidates[0].content.parts[0].text;
    const cleanJson = rawJson.replace(/```json\n?|\n?```/g, '').trim();
    const parsedObject = JSON.parse(cleanJson);

    return new Response(JSON.stringify(parsedObject), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Parse Function Error:", error)
    return new Response(JSON.stringify({ error: error.message || 'Errore interno del server.' }), {
      status: 400,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
