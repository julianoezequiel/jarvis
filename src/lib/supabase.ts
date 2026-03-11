/*
 Minimal Supabase client wrapper.
 Install dependency: `npm install @supabase/supabase-js`
 Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from environment.
*/
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

export async function saveJarvisFile(path: string, content: string, projectName?: string) {
  return supabase.from('jarvis_files').insert([
    { path, content, project_name: projectName || null }
  ])
}

export async function searchMemory(
  query: string,
  limit = 10,
  sessionId?: string | null
): Promise<{ memories: any[]; facts: any[]; error: any }> {
  const q = `%${query || ''}%`

  const [memRes, factRes] = await Promise.all([
    sessionId
      ? supabase
          .from('jarvis_memory')
          .select('*')
          .eq('session_id', sessionId)
          .ilike('content', q)
          .order('created_at', { ascending: false })
          .limit(limit)
      : supabase
          .from('jarvis_memory')
          .select('*')
          .ilike('content', q)
          .order('created_at', { ascending: false })
          .limit(limit),
    supabase
      .from('user_facts')
      .select('*')
      .ilike('fact', q)
      .order('importance', { ascending: false })
      .limit(limit),
  ])

  return {
    memories: memRes.data || [],
    facts: factRes.data || [],
    error: memRes.error || factRes.error,
  }
}
