// ============================================
// Supabase Edge Function: Generate Image Keywords
// Securely calls Gemini AI API to generate image keywords
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Gemini API key from environment (server-side only)
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyDXwkvfGymYKD5pN3cV0f8ofC54j9IcS90'
    const geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'

    // Parse request body
    const { title, content } = await req.json()

    if (!title) {
      throw new Error('Title is required')
    }

    // Create prompt for Gemini
    const prompt = `Based on this news article, generate 3-5 professional, realistic photo search keywords that would be suitable for a news publication. Focus on real-world photography, not illustrations or cartoons.

Article Title: ${title}
Article Summary: ${content || ''}

Respond with ONLY comma-separated keywords, nothing else. Example: "students, classroom, education, learning"`

    // Call Gemini API
    const response = await fetch(`${geminiApiUrl}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    })

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text())
      throw new Error('Gemini API error: ' + response.status)
    }

    const data = await response.json()
    const keywords = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'school, students, education'

    console.log('Generated keywords:', keywords)

    return new Response(
      JSON.stringify({ keywords }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating keywords:', error)
    
    // Return fallback keywords on error
    return new Response(
      JSON.stringify({ 
        keywords: 'school, students, education, learning',
        error: error.message 
      }),
      { 
        status: 200,  // Still return 200 with fallback
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
