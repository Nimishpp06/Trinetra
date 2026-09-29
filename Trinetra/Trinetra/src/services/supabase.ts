import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
}

// Snapshot the callback URL BEFORE createClient(). supabase-js parses
// /auth/callback during its own async init and may strip ?code= from
// window.location afterwards — reading it later yields an empty query string
// and a false "no authorisation code" failure.
export const INITIAL_AUTH_URL = window.location.href

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)
