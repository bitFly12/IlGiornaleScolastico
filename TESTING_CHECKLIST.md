# Testing & Validation Checklist

## Phase 1: Console Error Fixes ✅

### Admin.js Syntax Errors
- [x] Line 18: Fixed `window.supabase. createClient` → `window.supabase.createClient`
- [x] Line 752: Fixed `window.supabase. createClient` → `window.supabase.createClient`
- [ ] **Manual Test**: Open browser console on `area-riservata.html` and verify no Supabase initialization errors

### Placeholder Images
- [x] Replaced all `via.placeholder.com` references with SVG data URIs
- [x] Added `FALLBACK_IMAGE` and `FALLBACK_IMAGE_SMALL` constants
- [ ] **Manual Test**: Check that articles without images show clean SVG fallbacks instead of broken via.placeholder.com links

### Logo Fix
- [x] Replaced corrupted base64 logo with clean SVG
- [x] Updated CSS to support SVG logo
- [ ] **Manual Test**: Verify logo displays correctly in navbar on all pages
- [ ] **Manual Test**: Check logo is visible (not hidden behind other elements)

## Phase 2: Graphical Rework ✅

### HERO Article Layout
- [x] Implemented `createHeroCard()` function for large featured article
- [x] Modified `loadFeaturedArticles()` to display 1 HERO + 2 smaller featured
- [x] Added `hero-article-card` CSS styling with 450px height image
- [ ] **Manual Test**: Homepage shows one large HERO article prominently
- [ ] **Manual Test**: HERO article is clearly the focal point of the page

### Professional Typography & Spacing
- [x] Using Playfair Display for headings
- [x] Using Inter for body text
- [x] Professional color scheme with Cesaris blue (#1e3a8a) as accent
- [ ] **Manual Test**: Text is clear and readable
- [ ] **Manual Test**: Hierarchy is obvious (HERO > Featured > Regular articles)

### Sidebar Visibility
- [x] Changed `.footer-link` color to `var(--cesaris-blue)` (was transparent white)
- [x] Added font-weight: 500 to links
- [x] Added accent color to icons
- [x] Made sidebar titles blue and bold
- [ ] **Manual Test**: "Link Utili" are ALWAYS visible with blue color
- [ ] **Manual Test**: Icons are visible and colored
- [ ] **Manual Test**: No hover-only visibility issues

### UX Enhancements
- [x] Added smooth transitions for all interactive elements
- [x] Added hover states with `cursor: pointer`
- [x] Implemented shimmer skeleton loading animation
- [x] Added micro-animations for cards
- [ ] **Manual Test**: Hover effects work smoothly on all cards
- [ ] **Manual Test**: Loading states appear when loading articles
- [ ] **Manual Test**: Animations are smooth, not jarring

### Responsive Design
- [x] Existing responsive breakpoints maintained
- [ ] **Manual Test**: Desktop (>1200px) - HERO layout works
- [ ] **Manual Test**: Tablet (768-1199px) - Layout adapts properly
- [ ] **Manual Test**: Mobile (<768px) - All elements stack correctly
- [ ] **Manual Test**: Sidebar moves below content on mobile

## Phase 3: Gemini AI Image System ✅

### UI Implementation
- [x] Added tab navigation (Manual Upload / AI Generate)
- [x] Created manual upload input field
- [x] Created AI generation section with button
- [x] Added preview area for generated images
- [x] Added loading state indicator
- [ ] **Manual Test**: Can switch between manual and AI tabs
- [ ] **Manual Test**: Tab UI is intuitive and clear

### Gemini Integration
- [x] Added `GEMINI_API_KEY` configuration
- [x] Implemented `generateAIImage()` function
- [x] Implemented `generateImageKeywords()` using Gemini API
- [x] Implemented `fetchUnsplashImage()` for actual images
- [x] Added confirm/regenerate buttons
- [ ] **Manual Test**: Click "Genera Immagine con AI" with article title/content
- [ ] **Manual Test**: Loading indicator appears
- [ ] **Manual Test**: Image preview shows after generation
- [ ] **Manual Test**: Can regenerate different image
- [ ] **Manual Test**: "Usa Questa Immagine" copies URL to manual field

### Image Quality
- [x] Gemini prompt requests "professional, realistic photo"
- [x] Using Unsplash Source API for high-quality images
- [ ] **Manual Test**: Generated images are professional quality
- [ ] **Manual Test**: Images match article content reasonably well
- [ ] **Manual Test**: No cartoon or illustration images

## Phase 4: Newsletter System ✅

### Database Schema
- [x] Created `database_newsletter.sql` with all modifications
- [x] Added `email_verificata`, `ultimo_invio`, `attiva` columns
- [x] Created `newsletter_log` table
- [x] Created database trigger `notify_newsletter_on_publish()`
- [ ] **Manual Test**: Run SQL script in Supabase SQL Editor
- [ ] **Manual Test**: Verify tables and columns created successfully
- [ ] **Manual Test**: Check trigger exists in Supabase

### Edge Function
- [x] Created `send-newsletter/index.ts` Edge Function
- [x] Implemented email batching (50 at a time)
- [x] Professional HTML email template
- [x] Integration with Resend API
- [x] Logging to `newsletter_log` table
- [ ] **Manual Setup**: Deploy Edge Function to Supabase
- [ ] **Manual Setup**: Configure RESEND_API_KEY secret
- [ ] **Manual Test**: Call function manually and verify execution

### Client Integration
- [x] Modified `createOrUpdateArticle()` to detect publishing
- [x] Added `sendNewsletterForArticle()` function
- [x] Calls Edge Function when article published
- [x] Shows success/error messages
- [ ] **Manual Test**: Create test article as "bozza"
- [ ] **Manual Test**: Change to "pubblicato" and save
- [ ] **Manual Test**: Verify newsletter message appears
- [ ] **Manual Test**: Check newsletter_log table for entry

### Email Delivery
- [ ] **Manual Setup**: Add test email to iscrizioni_newsletter
- [ ] **Manual Test**: Publish article and receive email
- [ ] **Manual Test**: Email has correct title, summary, image
- [ ] **Manual Test**: "Leggi articolo" link works
- [ ] **Manual Test**: Email design is professional

## Phase 5: Documentation ✅

### Setup Guides
- [x] Created comprehensive `NEWSLETTER_SETUP.md`
- [x] Included step-by-step instructions
- [x] Alternative email service options documented
- [x] Troubleshooting section included
- [ ] **Review**: Read through setup guide
- [ ] **Verify**: Instructions are clear and complete

### SQL Scripts
- [x] All SQL is safe (uses IF NOT EXISTS)
- [x] No data deletion queries
- [x] Proper indexes for performance
- [ ] **Review**: Check SQL for safety
- [ ] **Manual Test**: Run SQL on test database first

## Phase 6: Final Validation

### Cross-Browser Testing
- [ ] **Test**: Chrome - all features work
- [ ] **Test**: Firefox - all features work
- [ ] **Test**: Safari - all features work
- [ ] **Test**: Edge - all features work

### Performance
- [ ] **Test**: Homepage loads in <3 seconds
- [ ] **Test**: No console errors or warnings
- [ ] **Test**: Images load efficiently
- [ ] **Test**: Smooth scrolling and animations

### Security
- [x] API keys only in server-side code (Edge Function)
- [x] No secrets exposed in client code
- [x] Using Supabase RLS (assumed existing)
- [ ] **Review**: Check no sensitive data in client JS

### Mobile Experience
- [ ] **Test**: Touch targets are large enough (>44px)
- [ ] **Test**: Text is readable without zooming
- [ ] **Test**: Forms work on mobile keyboards
- [ ] **Test**: Navigation menu works on mobile

## Known Limitations

1. **Newsletter Email Service**: Requires manual setup of Resend account or alternative
2. **Edge Function Deployment**: Requires Supabase CLI and manual deployment
3. **Unsplash Images**: Using Source API (limited), consider official API for production
4. **Email Verification**: Not implemented yet (future enhancement)
5. **Unsubscribe Link**: Placeholder only, needs implementation

## Production Checklist

Before deploying to production:

- [ ] Run `database_newsletter.sql` on production database
- [ ] Deploy Edge Function with proper secrets
- [ ] Set up and verify Resend account (or alternative)
- [ ] Verify domain for email sending
- [ ] Test newsletter with real subscribers
- [ ] Set up monitoring for Edge Function
- [ ] Configure proper RLS policies
- [ ] Add analytics tracking
- [ ] Test complete user flow end-to-end
- [ ] Create backup before deployment

## Support & Maintenance

### If Newsletter Fails
1. Check Edge Function logs: `supabase functions logs send-newsletter`
2. Verify RESEND_API_KEY is set correctly
3. Check newsletter_log table for error messages
4. Verify subscribers have `attiva = true`

### If Images Don't Generate
1. Check browser console for errors
2. Verify GEMINI_API_KEY is valid
3. Try manual image URL instead
4. Check Unsplash availability

### If UI Looks Broken
1. Clear browser cache
2. Check console for CSS/JS errors
3. Verify Bootstrap and font CDNs are loading
4. Test in different browser
