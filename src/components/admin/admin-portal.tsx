'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Users, DollarSign, TrendingUp, Activity, Lock, LogOut,
  Search, ArrowUpRight, ArrowDownRight, Crown, Sparkles,
  Download, FileText, Brain, Eye, ChevronRight, ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useIrisStore } from '@/store/iris-store'
import {
  getGlobalStats, getAllUsers, type GlobalStats, type UserRecord,
} from '@/lib/iris/analytics'
import {
  listAccounts, signOut, isSuperAdmin, ADMIN_EMAIL,
  type AuthAccount, type AuthSession,
} from '@/lib/iris/auth'
import { useAuth } from '@/hooks/use-auth'
import { TIER_LIST, getTier, formatXAF } from '@/lib/iris/tiers'
import { RimirisLogo } from '@/components/iris/rimiris-logo'
import { LoginScreen } from '@/components/auth/login-screen'

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
// Access denied screen (shown when a non-super-admin tries to access /admin)
// ============================================================================
function AccessDenied({ session }: { session: AuthSession }) {
  const { setView } = useIrisStore()
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 border-destructive/20 text-center">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Accès refusé</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-5">
            Seul le super administrateur (<code className="bg-muted px-1 py-0.5 rounded">{ADMIN_EMAIL}</code>)
            peut accéder au portail CRM.
          </p>
          <div className="p-3 rounded-lg bg-muted/50 text-left text-xs space-y-1 mb-5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connecté en tant que</span>
              <span className="font-medium">{session.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rôle</span>
              <span className="font-medium">{session.role}</span>
            </div>
          </div>
          <Button className="w-full" onClick={() => setView('workspace')}>
            Retour au mémoire
          </Button>
        </Card>
      </motion.div>
    </div>
  )
}

// ============================================================================
// Empty state — no users yet (real data only)
// ============================================================================
function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
        <Users className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Aucun utilisateur enregistré</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
        Les statistiques apparaîtront ici dès que des étudiants créeront un compte
        et commenceront à utiliser Rimiris AI. Aucune donnée fictive n'est générée —
        ce portail reflète l'activité réelle de la plateforme.
      </p>
    </Card>
  )
}

// ============================================================================
// Combined row = auth account + (optional) analytics record
// ============================================================================
type AdminUserRow = AuthAccount & {
  analytics?: UserRecord
}

function buildAdminRows(): AdminUserRow[] {
  const accounts = listAccounts()
  const analyticsUsers = getAllUsers()
  const byEmail = new Map<string, UserRecord>()
  for (const u of analyticsUsers) {
    if (u.email) byEmail.set(u.email, u)
  }
  return accounts
    .map((a) => ({ ...a, analytics: a.email ? byEmail.get(a.email) : undefined }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

// ============================================================================
// Main admin portal
// ============================================================================
export function AdminPortal() {
  const { setView } = useIrisStore()
  const { session } = useAuth()
  const [stats, setStats] = React.useState<GlobalStats | null>(null)
  const [rows, setRows] = React.useState<AdminUserRow[]>([])
  const [search, setSearch] = React.useState('')
  const [tab, setTab] = React.useState<'overview' | 'users' | 'revenue' | 'tiers' | 'llm'>('overview')

  // Load real data (no demo seeding).
  React.useEffect(() => {
    if (!session || !isSuperAdmin(session)) return
    setStats(getGlobalStats())
    setRows(buildAdminRows())
  }, [session])

  // Refresh on window focus (admin returns to tab → fresh numbers).
  React.useEffect(() => {
    if (!session || !isSuperAdmin(session)) return
    const onFocus = () => {
      setStats(getGlobalStats())
      setRows(buildAdminRows())
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [session])

  function handleLogout() {
    signOut()
    // The login screen will re-render automatically via the useAuth subscriber.
  }

  // Access control — only super_admin can pass.
  // If not logged in, show the login screen so the user can authenticate.
  // Once logged in but not super_admin, show access denied.
  if (!session) return <LoginScreen />
  if (!isSuperAdmin(session)) return <AccessDenied session={session} />
  if (!stats) return <div className="p-8">Chargement…</div>

  const fmtXaf = (amount: number) => formatXAF(amount)
  const fmtPct = (n: number) => `${n.toFixed(1)}%`

  const filteredRows = rows.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.role.includes(q) ||
      r.tier.includes(q)
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
              Super Admin
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-xs font-medium leading-none">{session.name}</p>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">{session.email}</p>
            </div>
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
            ['llm', 'Configuration IA'],
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
        {stats.totalUsers === 0 && rows.length === 0 && tab === 'overview' ? (
          <EmptyState />
        ) : (
          <>
            {tab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Utilisateurs totaux" value={rows.length.toString()} sublabel={`${stats.activeUsers7d} actifs (7j)`} icon={Users} accent="#145DD6" />
                  <StatCard label="Revenu total" value={fmtXaf(stats.totalRevenue)} sublabel={`30j : ${fmtXaf(stats.mrr)}`} icon={DollarSign} accent="#10B981" />
                  <StatCard label="Taux de conversion" value={fmtPct(stats.conversionRate)} sublabel={`${stats.tierDistribution.pro} payants`} icon={TrendingUp} accent="#6D28D9" />
                  <StatCard label="Requêtes IA" value={stats.totalAIRequests.toLocaleString('fr-FR')} sublabel={`ARPU : ${fmtXaf(stats.arpu)}`} icon={Activity} accent="#F59E0B" />
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Revenus (30j)</p>
                        <p className="text-xl font-bold">{fmtXaf(stats.revenueSeries.reduce((s, p) => s + p.revenue, 0))}</p>
                      </div>
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                    </div>
                    {stats.revenueSeries.some((p) => p.revenue > 0) ? (
                      <Sparkline data={stats.revenueSeries.map((p) => p.revenue)} color="#10B981" height={80} />
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6">Aucun revenu enregistré pour le moment.</p>
                    )}
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Nouveaux utilisateurs (30j)</p>
                        <p className="text-xl font-bold">{stats.userSeries.reduce((s, p) => s + p.users, 0)}</p>
                      </div>
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    {stats.userSeries.some((p) => p.users > 0) ? (
                      <Sparkline data={stats.userSeries.map((p) => p.users)} color="#145DD6" height={80} />
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6">Aucune inscription récente.</p>
                    )}
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Activité IA (30j)</p>
                        <p className="text-xl font-bold">{stats.usageSeries.reduce((s, p) => s + p.requests, 0).toLocaleString('fr-FR')}</p>
                      </div>
                      <Brain className="h-5 w-5 text-violet-500" />
                    </div>
                    {stats.usageSeries.some((p) => p.requests > 0) ? (
                      <Sparkline data={stats.usageSeries.map((p) => p.requests)} color="#6D28D9" height={80} />
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6">Aucune activité IA enregistrée.</p>
                    )}
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <Card className="p-5">
                    <p className="font-semibold mb-4">Répartition par plan</p>
                    <div className="space-y-3">
                      {TIER_LIST.map((t) => {
                        // Compute distribution from real auth accounts (not analytics).
                        const count = rows.filter((r) => r.tier === t.id).length
                        const pct = rows.length > 0 ? (count / rows.length) * 100 : 0
                        return (
                          <div key={t.id}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                                <span className="text-sm font-medium">{t.name}</span>
                                <span className="text-xs text-muted-foreground">{formatXAF(t.priceXAF)} / projet</span>
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
                      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom, email, rôle, plan…" className="pl-10" />
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{filteredRows.length} / {rows.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Rôle</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead className="text-right">Revenu</TableHead>
                          <TableHead className="text-right">IA req.</TableHead>
                          <TableHead className="text-right">Exports</TableHead>
                          <TableHead>Dernière connexion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                              Aucun compte enregistré pour le moment.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRows.map((r) => {
                            const t = getTier(r.tier)
                            const a = r.analytics
                            return (
                              <TableRow key={r.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{r.name}</p>
                                    <p className="text-xs text-muted-foreground">{r.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {r.role === 'super_admin' ? (
                                    <Badge className="bg-primary/10 text-primary border-primary/20">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Super Admin
                                    </Badge>
                                  ) : r.role === 'admin' ? (
                                    <Badge variant="outline">Admin</Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Utilisateur</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" style={{ color: t.color, borderColor: `${t.color}40`, background: `${t.color}10` }}>
                                    {t.name}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium text-sm">
                                  {fmtXaf(a?.revenue.total ?? 0)}
                                </TableCell>
                                <TableCell className="text-right text-sm">{a?.totals.aiRequests ?? 0}</TableCell>
                                <TableCell className="text-right text-sm">{a?.totals.exports ?? 0}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString('fr-FR') : '—'}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </motion.div>
            )}

            {tab === 'revenue' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Revenu total" value={fmtXaf(stats.totalRevenue)} icon={DollarSign} accent="#10B981" />
                  <StatCard label="30 jours" value={fmtXaf(stats.mrr)} sublabel="Revenu collecté (30j)" icon={TrendingUp} accent="#145DD6" />
                  <StatCard label="Annualisé" value={fmtXaf(stats.arr)} sublabel="Projection 12 mois" icon={TrendingUp} accent="#6D28D9" />
                  <StatCard label="ARPU" value={fmtXaf(stats.arpu)} sublabel="Par utilisateur" icon={Users} accent="#F59E0B" />
                </div>
                <Card className="p-5">
                  <p className="font-semibold mb-4">Revenus par jour (30 derniers jours)</p>
                  {stats.revenueSeries.every((p) => p.revenue === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun revenu enregistré. Les paiements réels apparaîtront ici
                      dès qu'un étudiant passera à un plan payant.
                    </p>
                  ) : (
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
                            <span className="text-sm font-medium w-20 text-right">{fmtXaf(p.revenue)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {tab === 'tiers' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-3 gap-4">
                {TIER_LIST.map((t) => {
                  const count = rows.filter((r) => r.tier === t.id).length
                  const pct = rows.length > 0 ? (count / rows.length) * 100 : 0
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
                        {formatXAF(t.priceXAF)}
                        <span className="text-sm font-normal text-muted-foreground">/ projet</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{t.tagline}</p>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Utilisateurs</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Revenu potentiel</span>
                          <span className="font-medium">{fmtXaf(count * t.priceXAF)}</span>
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

            {tab === 'llm' && (
              <LLMConfigPanel />
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ============================================================================
// LLM Configuration Panel — lets the admin pick provider + set API keys
// ============================================================================
function LLMConfigPanel() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [cfg, setCfg] = React.useState<any>(null)
  const [form, setForm] = React.useState({
    provider: 'zai',
    model: '',
    openaiApiKey: '',
    anthropicApiKey: '',
    mistralApiKey: '',
    openrouterApiKey: '',
    openaiBaseUrl: 'https://api.openai.com/v1',
    localBaseUrl: 'http://localhost:11434/v1',
    localApiKey: '',
  })
  const [testResult, setTestResult] = React.useState<{ ok: boolean; reply?: string; error?: string } | null>(null)
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Load current config on mount
  React.useEffect(() => {
    fetch('/api/admin/llm-config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setCfg(data)
        setForm({
          provider: data.provider || 'zai',
          model: data.model || '',
          openaiApiKey: '',
          anthropicApiKey: '',
          mistralApiKey: '',
          openrouterApiKey: '',
          openaiBaseUrl: data.openai?.baseUrl || 'https://api.openai.com/v1',
          localBaseUrl: data.local?.baseUrl || 'http://localhost:11434/v1',
          localApiKey: '',
        })
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        setToast({ type: 'error', msg: 'Impossible de charger la configuration.' })
      })
  }, [])

  function flash(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function save(opts: { test?: boolean } = {}) {
    setSaving(true)
    setTestResult(null)
    if (opts.test) setTesting(true)
    try {
      const body: any = {
        provider: form.provider,
        model: form.model,
        openaiBaseUrl: form.openaiBaseUrl,
        localBaseUrl: form.localBaseUrl,
        test: opts.test,
      }
      // Only send keys that were entered — empty string = leave unchanged
      for (const [k, v] of Object.entries({
        openaiApiKey: form.openaiApiKey,
        anthropicApiKey: form.anthropicApiKey,
        mistralApiKey: form.mistralApiKey,
        openrouterApiKey: form.openrouterApiKey,
        localApiKey: form.localApiKey,
      })) {
        if (v) body[k] = v
      }
      const res = await fetch('/api/admin/llm-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      if (data.test) setTestResult(data.test)
      // Clear the key fields after successful save (so masked values show next time)
      setForm((f) => ({
        ...f,
        openaiApiKey: '',
        anthropicApiKey: '',
        mistralApiKey: '',
        openrouterApiKey: '',
        localApiKey: '',
      }))
      // Re-load config to refresh masked keys
      const refresh = await fetch('/api/admin/llm-config', { cache: 'no-store' })
      setCfg(await refresh.json())
      flash('success', opts.test ? 'Configuration enregistrée et testée.' : 'Configuration enregistrée.')
    } catch (e: any) {
      flash('error', e?.message || 'Échec de la sauvegarde.')
    } finally {
      setSaving(false)
      setTesting(false)
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Chargement…</div>

  const PROVIDERS = [
    { id: 'zai',        name: 'ZAI (GLM)',                desc: 'Gratuit dans cet environnement. Aucune clé requise.', needsKey: false },
    { id: 'local',      name: 'Modèle local (Ollama, LM Studio, vLLM…)', desc: 'Hébergez votre propre modèle. Aucune limite, gratuit, privé. Nécessite un serveur local.', needsKey: false },
    { id: 'openai',     name: 'OpenAI (GPT-4o, etc.)',    desc: 'Plateforme OpenAI. Clé API requise.', needsKey: true },
    { id: 'anthropic',  name: 'Anthropic (Claude)',       desc: 'Claude 3.5 Sonnet / Haiku. Clé API requise.', needsKey: true },
    { id: 'mistral',    name: 'Mistral AI',               desc: 'Mistral Large / Small. Clé API requise.', needsKey: true },
    { id: 'openrouter', name: 'OpenRouter (multi-IA)',    desc: 'Une seule clé, accès à GPT-4o + Claude + Gemini + Llama + Mistral.', needsKey: true },
  ] as const

  const currentProvider = PROVIDERS.find((p) => p.id === form.provider)!

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-4">
      {toast && (
        <div className={`p-3 rounded-lg text-sm ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Fournisseur d'IA</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Choisissez le moteur d'IA qui alimente Rimiris (rédaction, humanisation, audit, etc.).
          Les changements sont effectifs immédiatement — aucun redémarrage nécessaire.
        </p>

        {/* Provider picker */}
        <div className="space-y-2 mb-5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setForm((f) => ({ ...f, provider: p.id }))}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                form.provider === p.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  form.provider === p.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                }`} />
                <span className="font-medium text-sm">{p.name}</span>
                {!p.needsKey && (
                  <Badge variant="secondary" className="text-[10px] py-0">Gratuit</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">{p.desc}</p>
            </button>
          ))}
        </div>

        {/* Model field */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block">Modèle (optionnel)</label>
          <Input
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            placeholder={
              form.provider === 'zai' ? '(défaut GLM)'
              : form.provider === 'openai' ? 'gpt-4o'
              : form.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022'
              : form.provider === 'mistral' ? 'mistral-large-latest'
              : form.provider === 'openrouter' ? 'anthropic/claude-3.5-sonnet'
              : form.provider === 'local' ? 'llama3.1:8b-instruct  (ou tout nom de modèle Ollama/LM Studio)'
              : ''
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            {form.provider === 'local' ? (
              <>
                Pour <strong>Ollama</strong> : <code>ollama list</code> affiche les noms. Pour <strong>LM Studio</strong> : nom du fichier GGUF.
                Exemples : <code>llama3.1:8b-instruct</code>, <code>mistral:7b-instruct</code>, <code>qwen2.5:14b</code>.
              </>
            ) : (
              'Laisser vide pour utiliser le modèle par défaut du fournisseur.'
            )}
          </p>
        </div>

        {/* Local server config — Base URL + optional API key */}
        {form.provider === 'local' && (
          <div className="mb-5 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">URL du serveur local</label>
              <Input
                value={form.localBaseUrl}
                onChange={(e) => setForm((f) => ({ ...f, localBaseUrl: e.target.value }))}
                placeholder="http://localhost:11434/v1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URLs selon le serveur :<br />
                • <strong>Ollama</strong> : <code>http://localhost:11434/v1</code><br />
                • <strong>LM Studio</strong> : <code>http://localhost:1234/v1</code><br />
                • <strong>vLLM</strong> : <code>http://localhost:8000/v1</code><br />
                • <strong>llama.cpp server</strong> : <code>http://localhost:8080/v1</code><br />
                • <strong>text-generation-webui</strong> : <code>http://localhost:5000/v1</code><br />
                Si le serveur est sur une autre machine, remplacez <code>localhost</code> par son IP.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Clé API (optionnel)</label>
              <Input
                type="password"
                value={form.localApiKey}
                onChange={(e) => setForm((f) => ({ ...f, localApiKey: e.target.value }))}
                placeholder={cfg?.local?.masked ? `Actuelle : ${cfg.local.masked} — laisser vide pour conserver` : 'La plupart des serveurs locaux ne nécessitent pas de clé'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                La plupart des serveurs locaux n'exigent pas de clé. Si le vôtre en demande une (vLLM avec <code>--api-key</code>), saisissez-la ici.
              </p>
            </div>
          </div>
        )}

        {/* OpenAI Base URL (only for openai provider) */}
        {form.provider === 'openai' && (
          <div className="mb-5">
            <label className="text-sm font-medium mb-1.5 block">Base URL OpenAI (avancé)</label>
            <Input
              value={form.openaiBaseUrl}
              onChange={(e) => setForm((f) => ({ ...f, openaiBaseUrl: e.target.value }))}
              placeholder="https://api.openai.com/v1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pour Azure OpenAI, vLLM, LM Studio ou tout autre endpoint compatible OpenAI.
            </p>
          </div>
        )}

        {/* API key field for the chosen provider */}
        {currentProvider.needsKey && (
          <div className="mb-5">
            <label className="text-sm font-medium mb-1.5 block">
              Clé API {currentProvider.name.split(' ')[0]}
            </label>
            <Input
              type="password"
              value={form[currentProvider.id === 'openrouter' ? 'openrouterApiKey' : `${currentProvider.id}ApiKey`]}
              onChange={(e) => {
                const field = currentProvider.id === 'openrouter' ? 'openrouterApiKey' : `${currentProvider.id}ApiKey`
                setForm((f) => ({ ...f, [field]: e.target.value }))
              }}
              placeholder={cfg?.[currentProvider.id]?.masked ? `Actuelle : ${cfg[currentProvider.id].masked} — laisser vide pour conserver` : 'Collez votre clé API ici'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {cfg?.[currentProvider.id]?.hasKey ? (
                <>Clé actuelle : <code className="text-xs">{cfg[currentProvider.id].masked}</code> — laisser vide pour conserver.</>
              ) : (
                <>Aucune clé enregistrée pour ce fournisseur.</>
              )}
            </p>
            <p className="text-xs mt-1">
              Obtenir une clé :{' '}
              {form.provider === 'openai' && <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-primary underline">platform.openai.com/api-keys</a>}
              {form.provider === 'anthropic' && <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-primary underline">console.anthropic.com</a>}
              {form.provider === 'mistral' && <a href="https://console.mistral.ai/" target="_blank" rel="noreferrer" className="text-primary underline">console.mistral.ai</a>}
              {form.provider === 'openrouter' && <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-primary underline">openrouter.ai/keys</a>}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save()} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button variant="outline" onClick={() => save({ test: true })} disabled={saving || testing}>
            {testing ? 'Test en cours…' : 'Enregistrer et tester'}
          </Button>
        </div>

        {testResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm border ${
            testResult.ok
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            <div className="font-medium mb-1">
              {testResult.ok ? '✓ Test réussi' : '✗ Test échoué'}
            </div>
            {testResult.ok ? (
              <p className="font-mono text-xs">Réponse : {testResult.reply}</p>
            ) : (
              <p className="font-mono text-xs">{testResult.error}</p>
            )}
          </div>
        )}
      </Card>

      {/* Other provider keys (optional — for future switches) */}
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Clés API pour les autres fournisseurs</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Pré-enregistrez les clés des autres fournisseurs pour basculer instantanément sans avoir à re-saisir la clé.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {PROVIDERS.filter((p) => p.needsKey && p.id !== form.provider).map((p) => {
            const field = `${p.id}ApiKey`
            return (
              <div key={p.id}>
                <label className="text-xs font-medium mb-1 block">{p.name.split(' ')[0]}</label>
                <Input
                  type="password"
                  value={(form as any)[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={cfg?.[p.id]?.masked ? `Actuelle : ${cfg[p.id].masked}` : 'Non configurée'}
                />
              </div>
            )
          })}
        </div>
      </Card>
    </motion.div>
  )
}
