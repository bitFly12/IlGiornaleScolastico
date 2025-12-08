# Newsletter System Implementation Guide

## Overview
This system automatically sends newsletter emails to subscribers when a new article is published.

## Components

### 1. Database Modifications (`database_newsletter.sql`)
Run this SQL script in your Supabase SQL Editor to:
- Add tracking columns to `iscrizioni_newsletter` table
- Create `newsletter_log` table for email tracking
- Set up automatic trigger when articles are published

### 2. Supabase Edge Function (`supabase/functions/send-newsletter/`)
Handles the actual email sending using Resend API.

## Setup Instructions

### Step 1: Apply Database Changes
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database_newsletter.sql`
4. Execute the SQL script

### Step 2: Configure Email Service (Resend)

1. **Sign up for Resend** (https://resend.com)
   - Free tier includes 100 emails/day
   - Professional plan for higher volume

2. **Get your API key**
   - Go to API Keys section in Resend dashboard
   - Create a new API key
   - Copy the key (you won't see it again)

3. **Verify your domain** (optional but recommended)
   - Add your domain in Resend dashboard
   - Follow DNS verification steps
   - Use format: `redazione@giornalecesaris.it`

### Step 3: Deploy Edge Function

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Set secrets**:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key_here
   ```

5. **Deploy the function**:
   ```bash
   supabase functions deploy send-newsletter
   ```

### Step 4: Alternative Email Services

If you prefer not to use Resend, you can modify the Edge Function to use:

#### Option A: SendGrid
```typescript
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sendgridApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    personalizations: batch.map(s => ({ to: [{ email: s.email }] })),
    from: { email: 'redazione@giornalecesaris.it', name: 'Giornale Cesaris' },
    subject: `📰 ${article.titolo}`,
    content: [{ type: 'text/html', value: htmlContent }]
  })
})
```

#### Option B: SMTP (using nodemailer in Deno)
See: https://deno.land/x/nodemailer

### Step 5: Test the System

1. **Create a test subscriber**:
   ```sql
   INSERT INTO iscrizioni_newsletter (email, attiva)
   VALUES ('your-test-email@example.com', true);
   ```

2. **Publish an article**:
   - Go to Area Riservata
   - Create or edit an article
   - Change status to "pubblicato"

3. **Check newsletter_log**:
   ```sql
   SELECT * FROM newsletter_log ORDER BY data_invio DESC LIMIT 10;
   ```

4. **Verify email delivery**:
   - Check your inbox
   - Check Resend dashboard for delivery status

## How It Works

1. **User publishes article**: Status changes to "pubblicato" in admin area
2. **Database trigger**: `notify_newsletter_on_publish()` creates a pending log entry
3. **Edge Function call**: Admin.js calls the `send-newsletter` Edge Function
4. **Email generation**: Function fetches article details and subscriber list
5. **Batch sending**: Emails sent in batches of 50 via Resend API
6. **Logging**: Results logged in `newsletter_log` table

## Manual Trigger

To manually trigger newsletter for an article:

```javascript
// In admin.js or browser console
async function sendNewsletterManual(articleId) {
  const { data, error } = await supabase.functions.invoke('send-newsletter', {
    body: { articleId }
  });
  console.log(data);
}
```

## Troubleshooting

### Emails not sending
- Check Edge Function logs: `supabase functions logs send-newsletter`
- Verify RESEND_API_KEY is set correctly
- Check newsletter_log table for error messages

### Subscribers not receiving emails
- Verify `attiva` column is true
- Check spam folder
- Verify email addresses are valid

### Rate limiting
- Resend free tier: 100 emails/day
- Consider upgrading plan for production use
- Implement queue system for large subscriber lists

## Security Considerations

1. **Never expose API keys** in client-side code
2. Use **Row Level Security (RLS)** on newsletter tables
3. Implement **unsubscribe functionality**
4. Add **email verification** before sending
5. **Rate limit** newsletter sends to prevent abuse

## Future Enhancements

- [ ] Email templates with better design
- [ ] Unsubscribe link functionality
- [ ] Email verification on signup
- [ ] Preview newsletter before sending
- [ ] Schedule newsletter sends
- [ ] Track open rates and clicks
- [ ] A/B testing for subject lines
- [ ] Subscriber segmentation
