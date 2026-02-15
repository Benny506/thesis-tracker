import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = "https://pasivszijpywbrbfrhrv.supabase.co"
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhc2l2c3ppanB5d2JyYmZyaHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTM1MDksImV4cCI6MjA4NjE2OTUwOX0.Qq39dXXAxp9if2fZ7LOT1kKCbY7gRI2C6wVcJD27hwI"

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file.')
} else {
  console.log('Supabase Client Initialized', { url: supabaseUrl });
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    // Optional: Add debug to see why it fails
    // debug: true, 
  }
})
