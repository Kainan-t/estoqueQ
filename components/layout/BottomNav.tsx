'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Início', icon: '📊' },
  { href: '/materias-primas', label: 'MP', icon: '🧪' },
  { href: '/peliculas', label: 'Pelíc.', icon: '🎞️' },
  { href: '/ordens-producao', label: 'OPs', icon: '📋' },
  { href: '/em-producao', label: 'Produção', icon: '🏭' },
  { href: '/corte', label: 'Corte', icon: '✂️' },
  { href: '/produtos-finalizados', label: 'PF', icon: '📦' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
  { href: '/configuracoes', label: 'Config', icon: '⚙️' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex overflow-x-auto z-50">
      {navItems.map(item => (
        <Link key={item.href} href={item.href}
          className={cn(
            'flex-shrink-0 min-w-[60px] flex flex-col items-center py-2 text-xs gap-1',
            pathname.startsWith(item.href) ? 'text-blue-600' : 'text-slate-500'
          )}>
          <span className="text-lg">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
