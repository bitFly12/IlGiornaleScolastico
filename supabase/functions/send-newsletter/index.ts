// ============================================
// Supabase Edge Function: Send Newsletter
// Sends newsletter emails when articles are published
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { articleId } = await req.json()

    if (!articleId) {
      throw new Error('Article ID is required')
    }

    // Fetch article details
    const { data: article, error: articleError } = await supabaseClient
      .from('articoli')
      .select(`
        id,
        titolo,
        sommario,
        immagine_url,
        profili_redattori(nome_visualizzato)
      `)
      .eq('id', articleId)
      .single()

    if (articleError) throw articleError

    // Fetch active newsletter subscribers
    const { data: subscribers, error: subscribersError } = await supabaseClient
      .from('iscrizioni_newsletter')
      .select('email')
      .eq('attiva', true)

    if (subscribersError) throw subscribersError

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscribers', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare email content
    const articleUrl = `https://giornalecesaris.it/articolo/${article.id}`
    const author = article.profili_redattori?.nome_visualizzato || 'Redazione Cesaris'
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
          .article-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0; }
          .btn { display: inline-block; background: #fbbf24; color: #1e3a8a; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📰 Giornale Cesaris</h1>
            <p>Nuovo Articolo Pubblicato!</p>
          </div>
          <div class="content">
            <h2>${article.titolo}</h2>
            ${article.immagine_url ? `<img src="${article.immagine_url}" class="article-image" alt="${article.titolo}">` : ''}
            <p>${article.sommario || ''}</p>
            <p><strong>Autore:</strong> ${author}</p>
            <a href="${articleUrl}" class="btn">Leggi l'articolo completo</a>
          </div>
          <div class="footer">
            <p>&copy; 2025 Giornale Cesaris. Tutti i diritti riservati.</p>
            <p><a href="${Deno.env.get('SUPABASE_URL')}/unsubscribe">Annulla iscrizione</a></p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send emails using Resend API (or your preferred email service)
    // NOTE: You need to configure RESEND_API_KEY in your Supabase Edge Function secrets
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    let sentCount = 0
    let errors = []

    // Batch send emails (max 50 at a time for Resend)
    const batchSize = 50
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'Giornale Cesaris <redazione@giornalecesaris.it>',
            to: batch.map(s => s.email),
            subject: `📰 ${article.titolo} - Giornale Cesaris`,
            html: htmlContent
          })
        })

        if (response.ok) {
          sentCount += batch.length
          
          // Update ultimo_invio for these subscribers
          await supabaseClient
            .from('iscrizioni_newsletter')
            .update({ ultimo_invio: new Date().toISOString() })
            .in('email', batch.map(s => s.email))
        } else {
          const error = await response.text()
          errors.push(`Batch ${i}: ${error}`)
        }
      } catch (error) {
        errors.push(`Batch ${i}: ${error.message}`)
      }
    }

    // Log the newsletter send
    await supabaseClient
      .from('newsletter_log')
      .update({
        stato: sentCount > 0 ? 'inviato' : 'errore',
        destinatari_count: sentCount,
        errore: errors.length > 0 ? errors.join('; ') : null
      })
      .eq('articolo_id', articleId)
      .eq('stato', 'pending')

    return new Response(
      JSON.stringify({
        success: true,
        message: `Newsletter sent to ${sentCount} subscribers`,
        sentCount,
        errors: errors.length > 0 ? errors : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending newsletter:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
