'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [modo, setModo] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [loading, setLoading] = useState(false)

  // Mostra o motivo real de uma falha vinda de /auth/confirm (diagnóstico).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const erro = params.get('erro')
    if (!erro) return
    const motivo = params.get('motivo')
    if (erro === 'verify') {
      setError(`Link inválido ou expirado. Detalhe: ${motivo ?? 'sem detalhe'}`)
    } else if (erro === 'parametros') {
      setError(`Link incompleto. Parâmetros: ${motivo ?? 'sem detalhe'}`)
    } else {
      setError('Link inválido. Solicite um novo.')
    }
  }, [])

  function trocarModo(novo: 'login' | 'reset') {
    setModo(novo)
    setError('')
    setAviso('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('E-mail ou senha inválidos.')
        return
      }
      router.refresh()
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Informe seu e-mail.')
      return
    }
    setLoading(true)
    setError('')
    setAviso('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm?next=/definir-senha`,
      })
      if (error) {
        setError('Não foi possível enviar o e-mail. Tente novamente.')
        return
      }
      setAviso('Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-center">EstoqueQ</CardTitle>
        <p className="text-sm text-center text-muted-foreground">
          {modo === 'login' ? 'Controle de estoque interno' : 'Redefinir senha'}
        </p>
      </CardHeader>
      <CardContent>
        {modo === 'login' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <button type="button" onClick={() => trocarModo('reset')}
              className="w-full text-sm text-center text-blue-600 hover:underline">
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input id="reset-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {aviso && <p className="text-sm text-green-600">{aviso}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </Button>
            <button type="button" onClick={() => trocarModo('login')}
              className="w-full text-sm text-center text-blue-600 hover:underline">
              Voltar para o login
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
