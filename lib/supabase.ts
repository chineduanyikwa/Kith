import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pligdrerwcpwvyshuxhz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsaWdkcmVyd2Nwd3Z5c2h1eGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTc5NTUsImV4cCI6MjA5MDUzMzk1NX0.4BDnCLvKq9LDEiZCCZT6npZf6vP9H7p2WxB5ZkhQx64'

export const supabase = createClient(supabaseUrl, supabaseKey)
