import { createClient } from '@supabase/supabase-js'

// Sostituisci con i tuoi valori
const supabaseUrl = 'https://bbcoxisizpjdixnwaltu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiY294aXNpenBqZGl4bndhbHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQ0NjEsImV4cCI6MjA2OTM2MDQ2MX0.rYO2tF_xWWXnd97l1CQ2CY25wYxg_tr1P7jcAAUre5I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
