// ============================================
// Centralized Supabase Client Initialization
// Giornale Scolastico - Single source of truth
// ============================================

// Supabase configuration
const SUPABASE_URL = 'https://ftazdkxyfekyzfvgrgiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXpka3h5ZmVreXpmdmdyZ2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTE3MzQsImV4cCI6MjA4MDYyNzczNH0._V8LM9f8Dz2s9j8hcxUEWkHN8FMX9QW7YzKH3CgAzdU';

// Initialize Supabase client once and export globally
if (typeof window !== 'undefined' && typeof window.supabase !== 'undefined') {
    // Create and export the client globally
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Also export as 'supabase' for convenience
    window.supabase = window.supabaseClient;
    
    console.log('Supabase client initialized successfully');
} else {
    console.error('Supabase library not loaded. Make sure @supabase/supabase-js is loaded before this script.');
}
