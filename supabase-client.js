// ============================================
// Centralized Supabase Client Initialization
// Giornale Scolastico - Single source of truth
// ============================================

// Supabase configuration
const SUPABASE_URL = 'https://ftazdkxyfekyzfvgrgiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXpka3h5ZmVreXpmdmdyZ2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTE3MzQsImV4cCI6MjA4MDYyNzczNH0._V8LM9f8Dz2s9j8hcxUEWkHN8FMX9QW7YzKH3CgAzdU';

// Initialize Supabase client once and export globally
if (typeof window !== 'undefined' && typeof window.supabase !== 'undefined') {
    // Create the client using the Supabase library
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Export as supabaseClient to avoid conflicts with the Supabase library
    window.supabaseClient = client;
    
    // Also export as 'supabase' for convenience in pages that don't use the library directly
    // This is safe because we're only overwriting after we've used it to create the client
    window.supabase = client;
    
    console.log('Supabase client initialized successfully');
} else {
    console.error('Supabase library not loaded. Make sure @supabase/supabase-js is loaded before this script.');
}
