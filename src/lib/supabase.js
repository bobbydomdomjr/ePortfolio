import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && key)
export const supabase = supabaseConfigured ? createClient(url, key) : null

export function safeImage(value) {
  if (typeof value !== 'string' || value.length > 2048) return ''
  if (/^\/assets\/img\/[A-Za-z0-9._/-]+$/.test(value) && !value.includes('..')) return value
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.href : ''
  } catch {
    return ''
  }
}

export function safeLink(value) {
  if (typeof value !== 'string' || value.length > 2048) return ''
  if (/^(?:mailto|tel):[A-Za-z0-9+@._-]+$/.test(value)) return value
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.href : ''
  } catch {
    return ''
  }
}
