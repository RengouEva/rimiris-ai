'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Users, DollarSign, TrendingUp, Activity, Lock, LogOut,
  Search, ArrowUpRight, ArrowDownRight, Crown, Sparkles,
  Download, FileText, Brain, Eye, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useIrisStore } from '@/store/iris-store'
import { getGlobalStats, getAllUsers, seedDemoData, type GlobalStats, type UserRecord } from '@/lib/iris/analytics'
import { TIER_LIST, getTier } from '@/lib/iris/tiers'
import { RimirisLogo } from '@/components/iris/rimiris-logo'

// ============================================================================
// Admin gate — password-protected access.
// Default password is "rimiris2026" (configurable in localStorage).
// In production you'd replace this with a real auth backend.
// ============================================================================
const ADMIN_PASSWORD = 'rimiris2026'
const SESSION_KEY = 'rimiris.admin.session'

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = React.useState('')
  const [err, setErr] = React.useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {}
      onUnlock()
    } else {
      setErr('Mot de passe incorrect')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 border-primary/20">
          <div className="flex flex-col items-center text-center mb-6">
            <RimirisLogo size="xl" glow />
            <h1 className="text-2xl font-bold mt-4">Portail Admin CRM</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Accès réservé à l'équipe Rimiris AI
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setErr('') }}
                placeholder="Mot de passe administrateur"
                className="pl-10"
                autoFocus
              />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full iris-gradient text-white">
              Déverrouiller le portail
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Mot de passe par défaut : <code className="bg-muted px-1.5 py-0.5 rounded">rimiris2026</code>
            </p>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}

// ============================================================================
// Stat card
// ============================================================================
function StatCard({
  label, value, sublabel, trend, icon: Icon, accent,
}: {
  label: string
  value: string
  sublabel?: string
  trend?: number
  icon: any
  accent: string
}) {
  return (
    <Card className="p-5 relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}20`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
      {sublabel && (
        <p className="text-xs text-muted-foreground/70 mt-1">{sublabel}</p>
      )}
    </Card>
  )
}

// ============================================================================
// Simple SVG sparkline chart (no chart lib dependency)
// ============================================================================
function Sparkline({
  data, color = '#145DD6', height = 80,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 100
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * w
      const y = height - ((v - min) / range) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(' ')

  const area = `0,${height} ${points} ${w},${height}`

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// ============================================================================
// Main admin portal
// ============================================================================
export function AdminPortal() {
  const { setView } = useIrisStore()
  const [unlocked, setUnlocked] = React.useState(false)
  const [stats, setStats] = React.useState<GlobalStats | null>(null)
  const [users, setUsers] = React.useState<UserRecord[]>([])
  const [search, setSearch] = React.useState('')
  const [tab, setTab] = React.useState<'overview' | 'users' | 'revenue' | 'tiers'>('overview')

  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true)
    } catch {}
  }, [])

  React.useEffect(() => {
    if (!unlocked) return
    seedDemoData()
    setStats(getGlobalStats())
    setUsers(getAllUsers())
  }, [unlocked])

  function handleLogout() {
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {}
    setUnlocked(false)
    setView('welcome')
  }

  if (!unlocked) return <AdminGate onUnlock={() => setUnlocked(true)} />
  if (!stats) return <div className="p-8">Chargement…</div>

  const fmtEur = (cents: number) =>
    (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
  const fmtPct = (n: number) => `${n.toFixed(1)}%`

  const filteredUsers = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q) ||
      u.institution?.toLowerCase().includes(q) ||
      u.tier.includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RimirisLogo size="md" />
            <div className="hidden sm:block">
              <p className="font-bold text-sm leading-none">Portail Admin</p>
              <p className="text-xs text-muted-foreground leading-none mt-1">CRM Rimiris AI</p>
            </div>
            <Badge className="ml-2 bg-primary/10 text-primary border-primary/20">
              <Crown className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView('welcome')}>
              Quitter
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              Déconnexion
            </Button>
          </div>
        </div>
        <div className="px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {([
            ['overview', "Vue d'ensemble"],
            ['users', 'Utilisateurs'],
            ['revenue', 'Revenus'],
            ['tiers', 'Plans & Tiers'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
        {tab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Utilisateurs totaux" value={stats.totalUsers.toString()} sublabel={`${stats.activeUsers7d} actifs (7j)`} trend={12} icon={Users} accent="#145DD6" />
              <StatCard label="Revenu total" value={fmtEur(stats.totalRevenue)} sublabel={`MRR : ${fmtEur(stats.mrr)}`} trend={18} icon={DollarSign} accent="#10B981" />
              <StatCard label="Taux de conversion" value={fmtPct(stats.conversionRate)} sublabel={`${stats.tierDistribution.pro + stats.tierDistribution.premium} payants`} trend={5} icon={TrendingUp} accent="#6D28D9" />
              <StatCard label="Requêtes IA" value={stats.totalAIRequests.toLocaleString('fr-FR')} sublabel={`ARPU : ${fmtEur(stats.arpu)}`} trend={24} icon={Activity} accent="#F59E0B" />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenus (30j)</p>
                    <p className="text-xl font-bold">{fmtEur(stats.revenueSeries.reduce((s, p) => s + p.revenue, 0))}</p>
                  </div>
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <Sparkline data={stats.revenueSeries.map((p) => p.revenue)} color="#10B981" height={80} />
              </Card>
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nouveaux utilisateurs (30j)</p>
                    <p className="text-xl font-bold">{stats.userSeries.reduce((s, p) => s + p.users, 0)}</p>
                  </div>
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <Sparkline data={stats.userSeries.map((p) => p.users)} color="#145DD6" height={80} />
              </Card>
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Activité IA (30j)</p>
                    <p className="text-xl font-bold">{stats.usageSeries.reduce((s, p) => s + p.requests, 0).toLocaleString('fr-FR')}</p>
                  </div>
                  <Brain className="h-5 w-5 text-violet-500" />
                </div>
                <Sparkline data={stats.usageSeries.map((p) => p.requests)} color="#6D28D9" height={80} />
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <p className="font-semibold mb-4">Répartition par plan</p>
                <div className="space-y-3">
                  {TIER_LIST.map((t) => {
                    const count = stats.tierDistribution[t.id]
                    const pct = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0
                    return (
                      <div key={t.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                            <span className="text-sm font-medium">{t.name}</span>
                            <span className="text-xs text-muted-foreground">{fmtEur(t.priceMonthly * 100)}/mois</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold">{count}</span>
                            <span className="text-muted-foreground"> · {fmtPct(pct)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: t.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold">Activité récente</p>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {stats.recentEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucune activité enregistrée pour le moment.</p>
                  ) : (
                    stats.recentEvents.slice(0, 20).map((e, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {e.type === 'upgrade_complete' ? <Crown className="h-3.5 w-3.5 text-violet-500" />
                            : e.type === 'export_run' ? <Download className="h-3.5 w-3.5 text-blue-500" />
                            : e.type === 'section_drafted' ? <FileText className="h-3.5 w-3.5 text-emerald-500" />
                            : e.type === 'ai_request' ? <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">{e.type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{new Date(e.ts).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {tab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom, email, pays, institution, plan…" className="pl-10" />
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">{filteredUsers.length} / {users.length}</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Pays</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Revenu</TableHead>
                      <TableHead className="text-right">IA req.</TableHead>
                      <TableHead className="text-right">Exports</TableHead>
                      <TableHead>Dernière visite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.slice(0, 50).map((u) => {
                      const t = getTier(u.tier)
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{u.name || 'Anonyme'}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{u.country || '—'}</TableCell>
                          <TableCell className="text-sm">{u.institution || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" style={{ color: t.color, borderColor: `${t.color}40`, background: `${t.color}10` }}>
                              {t.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">{fmtEur(u.revenue.total)}</TableCell>
                          <TableCell className="text-right text-sm">{u.totals.aiRequests}</TableCell>
                          <TableCell className="text-right text-sm">{u.totals.exports}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(u.lastSeenAt).toLocaleDateString('fr-FR')}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {filteredUsers.length > 50 && (
                <div className="p-4 border-t border-border text-center text-sm text-muted-foreground">
                  50 premiers affichés sur {filteredUsers.length}. Utilisez la recherche pour filtrer.
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {tab === 'revenue' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Revenu total" value={fmtEur(stats.totalRevenue)} icon={DollarSign} accent="#10B981" />
              <StatCard label="MRR" value={fmtEur(stats.mrr)} sublabel="Revenu mensuel récurrent" icon={TrendingUp} accent="#145DD6" />
              <StatCard label="ARR" value={fmtEur(stats.arr)} sublabel="Revenu annualisé" icon={TrendingUp} accent="#6D28D9" />
              <StatCard label="ARPU" value={fmtEur(stats.arpu)} sublabel="Par utilisateur" icon={Users} accent="#F59E0B" />
            </div>
            <Card className="p-5">
              <p className="font-semibold mb-4">Revenus par jour (30 derniers jours)</p>
              <div className="space-y-2">
                {stats.revenueSeries.slice().reverse().map((p) => {
                  const maxRev = Math.max(...stats.revenueSeries.map((x) => x.revenue), 1)
                  const pct = (p.revenue / maxRev) * 100
                  return (
                    <div key={p.date} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24">{p.date}</span>
                      <div className="flex-1 h-6 bg-muted rounded relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 rounded bg-emerald-500/60" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium w-20 text-right">{fmtEur(p.revenue)}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'tiers' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-3 gap-4">
            {TIER_LIST.map((t) => {
              const count = stats.tierDistribution[t.id]
              const pct = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0
              return (
                <Card key={t.id} className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                      <h3 className="font-semibold">{t.name}</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmtPct(pct)}</span>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {fmtEur(t.priceMonthly * 100)}
                    <span className="text-sm font-normal text-muted-foreground">/mois</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{t.tagline}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Utilisateurs</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenu mensuel</span>
                      <span className="font-medium">{fmtEur(count * t.priceMonthly * 100)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sections max</span>
                      <span className="font-medium">{t.capabilities.maxSections >= 999 ? '∞' : t.capabilities.maxSections}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mots/section</span>
                      <span className="font-medium">{t.capabilities.maxWordsPerSection.toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setView('pricing')}>
                    Voir la page pricing
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Card>
              )
            })}
          </motion.div>
        )}
      </main>
    </div>
  )
}
