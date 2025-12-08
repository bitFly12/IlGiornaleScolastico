-- ============================================
-- Database Modifications for Newsletter System
-- Giornale Scolastico Cesaris
-- ============================================

-- Add columns to iscrizioni_newsletter table for tracking
ALTER TABLE iscrizioni_newsletter 
ADD COLUMN IF NOT EXISTS email_verificata BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ultimo_invio TIMESTAMP,
ADD COLUMN IF NOT EXISTS attiva BOOLEAN DEFAULT true;

-- Create newsletter_log table for tracking email sends
CREATE TABLE IF NOT EXISTS newsletter_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    articolo_id UUID REFERENCES articoli(id) ON DELETE CASCADE,
    data_invio TIMESTAMP DEFAULT NOW(),
    destinatari_count INTEGER DEFAULT 0,
    stato TEXT DEFAULT 'inviato',
    errore TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_newsletter_log_articolo ON newsletter_log(articolo_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_log_data ON newsletter_log(data_invio DESC);
CREATE INDEX IF NOT EXISTS idx_iscrizioni_attive ON iscrizioni_newsletter(attiva) WHERE attiva = true;

-- Add comment for documentation
COMMENT ON TABLE newsletter_log IS 'Log di tutti gli invii newsletter per tracciabilità';
COMMENT ON COLUMN iscrizioni_newsletter.email_verificata IS 'Indica se l email è stata verificata';
COMMENT ON COLUMN iscrizioni_newsletter.ultimo_invio IS 'Data ultimo invio newsletter a questo iscritto';
COMMENT ON COLUMN iscrizioni_newsletter.attiva IS 'Indica se l iscrizione è attiva';

-- Create function to send newsletter (placeholder for Edge Function trigger)
CREATE OR REPLACE FUNCTION notify_newsletter_on_publish()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be triggered when an article status changes to 'pubblicato'
    -- The actual email sending will be handled by Supabase Edge Function
    
    IF NEW.stato = 'pubblicato' AND OLD.stato != 'pubblicato' THEN
        -- Insert notification record that Edge Function can pick up
        INSERT INTO newsletter_log (articolo_id, stato)
        VALUES (NEW.id, 'pending');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic newsletter on article publish
DROP TRIGGER IF EXISTS trigger_newsletter_on_publish ON articoli;
CREATE TRIGGER trigger_newsletter_on_publish
    AFTER UPDATE ON articoli
    FOR EACH ROW
    EXECUTE FUNCTION notify_newsletter_on_publish();

-- Grant necessary permissions (adjust based on your RLS policies)
-- GRANT SELECT, INSERT ON newsletter_log TO authenticated;
-- GRANT SELECT ON iscrizioni_newsletter TO authenticated;
