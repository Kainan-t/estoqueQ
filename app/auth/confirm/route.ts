import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// Verifica links de email do Supabase (convite, recuperação de senha, etc.)
// que usam token_hash + type. Diferente de /auth/callback, que trata o
// fluxo OAuth/magic-link (code/PKCE).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    const motivo = encodeURIComponent(error.message)
    return NextResponse.redirect(`${origin}/login?erro=verify&motivo=${motivo}`)
  }

  const faltando = `token_hash=${token_hash ? 'ok' : 'ausente'},type=${type ?? 'ausente'}`
  return NextResponse.redirect(
    `${origin}/login?erro=parametros&motivo=${encodeURIComponent(faltando)}`
  )
}
