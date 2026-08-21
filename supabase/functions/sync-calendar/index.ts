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

/**
 * Verifica JWT e livello di sicurezza AAL2
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

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    requireMfaAuth(authHeader);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: isCoach, error: rpcError } = await supabaseClient.rpc('is_coach')
    if (rpcError || !isCoach) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only coach can sync calendar' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { icalUrl } = await req.json()
    if (!icalUrl || typeof icalUrl !== 'string' || !icalUrl.startsWith('https://calendar.google.com/')) {
      return new Response(JSON.stringify({ error: 'Invalid Google Calendar iCal URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch server-side sicuro direttamente da Google (senza proxy terzi)
    const response = await fetch(icalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'BuilderAthleteManager-CalendarSync/1.0',
      },
    })

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Google Calendar HTTP ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const icsContent = await response.text()

    return new Response(JSON.stringify({ icsContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Errore interno.' }), {
      status: 400,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
