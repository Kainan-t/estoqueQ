'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/materias-primas', label: 'Matéria-Prima', icon: '🧪' },
  { href: '/produtos-finalizados', label: 'Prod. Finalizado', icon: '📦' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
  { href: '/configuracoes', label: 'Configurações', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex w-56 min-h-screen flex-col bg-slate-900 text-slate-100 p-4">
      <div className="text-xs font-bold tracking-widest text-slate-400 mb-6 pt-2">ESTOQUEQ</div>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(item => (
          <Link key={item.href} href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            )}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
