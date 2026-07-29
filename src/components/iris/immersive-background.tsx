'use client'

import * as React from 'react'

/**
 * ImmersiveBackground — animated AI academic background.
 *
 * Composed of 3 GPU-accelerated layers:
 *
 * 1. Breathing gradient mesh (CSS only — pure transform animations).
 * 2. Particle network (canvas) — nodes connected by lines that respond to
 *    the cursor. Evokes an AI brain / knowledge graph. Particles drift
 *    slowly. Lines fade by distance.
 * 3. Floating academic glyphs (DOM, transformed) — Greek letters, math
 *    symbols, French research words ("mémoire", "thèse", "plan", etc.)
 *    drift across the screen at very low opacity.
 *
 * Performance guarantees (ultra-smooth on mobile too):
 * - requestAnimationFrame loop, never setInterval.
 * - DPR capped at 2 (retina-crisp without melting the GPU).
 * - Pauses when document.hidden or out of viewport (IntersectionObserver).
 * - Respects prefers-reduced-motion (renders static gradient only).
 * - Pointer-events: none — never blocks UI.
 * - Particle count adapts to viewport area (mobile = ~30, desktop = ~90).
 * - All animations use transform/opacity (compositor-only, 60fps).
 * - Cursor interaction is throttled via rAF (no event storm).
 *
 * Brand palette: navy #0C244F, blue #145DD6, accent violet #6D28D9.
 */

// ============================================================================
// Layer 1 — Breathing gradient mesh
// ============================================================================
function BreathingMesh() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-30 pointer-events-none overflow-hidden"
    >
      {/* Deep gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 20% 10%, rgba(20, 93, 214, 0.18), transparent 60%), ' +
            'radial-gradient(ellipse at 85% 90%, rgba(109, 40, 217, 0.18), transparent 60%), ' +
            'radial-gradient(ellipse at 50% 50%, rgba(12, 36, 79, 0.10), transparent 70%)',
        }}
      />
      {/* Floating blobs — slow drift, GPU transforms only */}
      <div
        className="absolute -top-32 -left-32 w-[42rem] h-[42rem] rounded-full blur-3xl opacity-40"
        style={{
          background:
            'radial-gradient(circle, rgba(20, 93, 214, 0.35), transparent 70%)',
          animation: 'rimiris-drift-1 18s ease-in-out infinite alternate',
          willChange: 'transform',
        }}
      />
      <div
        className="absolute -bottom-40 -right-32 w-[38rem] h-[38rem] rounded-full blur-3xl opacity-35"
        style={{
          background:
            'radial-gradient(circle, rgba(109, 40, 217, 0.40), transparent 70%)',
          animation: 'rimiris-drift-2 22s ease-in-out infinite alternate',
          willChange: 'transform',
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-25"
        style={{
          background:
            'radial-gradient(circle, rgba(12, 36, 79, 0.30), transparent 70%)',
          animation: 'rimiris-drift-3 26s ease-in-out infinite alternate',
          willChange: 'transform',
        }}
      />
    </div>
  )
}

// ============================================================================
// Layer 2 — Particle network (canvas)
// ============================================================================
type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

function ParticleNetwork() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const particlesRef = React.useRef<Particle[]>([])
  const cursorRef = React.useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  })
  const sizeRef = React.useRef<{ w: number; h: number; dpr: number }>({
    w: 0,
    h: 0,
    dpr: 1,
  })

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Respect reduced-motion preference.
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReduced) return

    // ---------- Sizing ----------
    function resize() {
      if (!canvas || !ctx) return
      const parent = canvas.parentElement
      if (!parent) return
      const w = parent.clientWidth
      const h = parent.clientHeight
      // Cap DPR at 2 for retina without melting the GPU.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      sizeRef.current = { w, h, dpr }
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initParticles(w, h)
    }

    function initParticles(w: number, h: number) {
      // Density: ~1 particle per 14,000 px², clamped to [25, 110].
      const target = Math.round((w * h) / 14000)
      const count = Math.max(25, Math.min(110, target))
      const particles: Particle[] = []
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.6 + 0.6,
        })
      }
      particlesRef.current = particles
    }

    // ---------- Cursor ----------
    function onMove(e: PointerEvent) {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      cursorRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      }
    }
    function onLeave() {
      cursorRef.current.active = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerout', onLeave, { passive: true })

    // ---------- Visibility ----------
    let isVisible = true
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
        if (isVisible && !rafRef.current) loop()
      },
      { threshold: 0 },
    )
    io.observe(canvas)

    function onVisibility() {
      if (document.hidden && rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      } else if (!document.hidden && isVisible && !rafRef.current) {
        loop()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // ---------- Draw loop ----------
    const MAX_DIST = 140 // px — connection distance
    const CURSOR_DIST = 200 // px — cursor attraction radius
    const CURSOR_FORCE = 0.04 // attraction strength

    function draw() {
      if (!ctx) return
      const { w, h } = sizeRef.current
      const particles = particlesRef.current
      const cursor = cursorRef.current

      // Trail-free clear (transparent — let the mesh show through).
      ctx.clearRect(0, 0, w, h)

      // Update + draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        // Cursor attraction (subtle)
        if (cursor.active) {
          const dx = cursor.x - p.x
          const dy = cursor.y - p.y
          const d2 = dx * dx + dy * dy
          if (d2 < CURSOR_DIST * CURSOR_DIST) {
            const d = Math.sqrt(d2) || 1
            const force = (1 - d / CURSOR_DIST) * CURSOR_FORCE
            p.vx += (dx / d) * force
            p.vy += (dy / d) * force
          }
        }
        // Velocity damping (so cursor attraction doesn't accumulate)
        p.vx *= 0.98
        p.vy *= 0.98
        // Re-inject tiny drift so it never stops moving
        p.vx += (Math.random() - 0.5) * 0.005
        p.vy += (Math.random() - 0.5) * 0.005
        // Clamp velocity
        const sp = Math.hypot(p.vx, p.vy)
        const maxSp = 0.6
        if (sp > maxSp) {
          p.vx = (p.vx / sp) * maxSp
          p.vy = (p.vy / sp) * maxSp
        }
        // Move
        p.x += p.vx
        p.y += p.vy
        // Wrap (toroidal — no visible reset jumps)
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10
        // Draw particle (soft glow)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(20, 93, 214, 0.55)'
        ctx.fill()
      }

      // Draw connections (O(n²) but n ≤ 110 → 6,000 pairs max, fine)
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < MAX_DIST * MAX_DIST) {
            const d = Math.sqrt(d2)
            const alpha = (1 - d / MAX_DIST) * 0.22
            // Gradient line — alternate blue and violet
            const useViolet = (i + j) % 5 === 0
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = useViolet
              ? `rgba(109, 40, 217, ${alpha})`
              : `rgba(20, 93, 214, ${alpha})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      // Cursor halo (drawn last so it sits on top)
      if (cursor.active) {
        const grad = ctx.createRadialGradient(
          cursor.x,
          cursor.y,
          0,
          cursor.x,
          cursor.y,
          CURSOR_DIST,
        )
        grad.addColorStop(0, 'rgba(20, 93, 214, 0.10)')
        grad.addColorStop(1, 'rgba(20, 93, 214, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cursor.x, cursor.y, CURSOR_DIST, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function loop() {
      if (document.hidden || !isVisible) {
        rafRef.current = null
        return
      }
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }

    // ---------- Boot ----------
    resize()
    window.addEventListener('resize', resize, { passive: true })
    loop()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerout', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      io.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 -z-20 pointer-events-none w-full h-full"
    />
  )
}

// ============================================================================
// Layer 3 — Floating academic glyphs (DOM, GPU transforms)
// ============================================================================
const GLYPHS: { char: string; weight: number }[] = [
  // Greek letters (math/research vibe)
  { char: 'α', weight: 1.2 },
  { char: 'β', weight: 0.9 },
  { char: 'γ', weight: 1.0 },
  { char: 'λ', weight: 1.1 },
  { char: 'μ', weight: 0.9 },
  { char: 'σ', weight: 1.0 },
  { char: 'θ', weight: 0.9 },
  { char: 'Φ', weight: 1.2 },
  { char: 'Ψ', weight: 1.1 },
  { char: 'Ω', weight: 1.3 },
  // Math / logic symbols
  { char: '∑', weight: 1.2 },
  { char: '∫', weight: 1.2 },
  { char: '√', weight: 1.0 },
  { char: '∞', weight: 1.3 },
  { char: '∂', weight: 1.0 },
  { char: '∇', weight: 1.1 },
  // French academic words (very low opacity — context reinforcement)
  { char: 'mémoire', weight: 0.7 },
  { char: 'thèse', weight: 0.6 },
  { char: 'recherche', weight: 0.6 },
  { char: 'plan', weight: 0.5 },
  { char: 'hypothèse', weight: 0.6 },
  { char: 'méthode', weight: 0.6 },
  { char: 'analyse', weight: 0.5 },
  { char: 'synthèse', weight: 0.6 },
  { char: 'bibliographie', weight: 0.7 },
  { char: 'problématique', weight: 0.7 },
  { char: 'soutenance', weight: 0.6 },
]

function FloatingGlyphs() {
  // Generate positions once (stable across re-renders).
  const items = React.useMemo(() => {
    const seed = 42
    let rng = seed
    function rand() {
      rng = (rng * 1664525 + 1013904223) % 4294967296
      return rng / 4294967296
    }
    return Array.from({ length: 18 }, (_, i) => {
      const g = GLYPHS[Math.floor(rand() * GLYPHS.length)]
      return {
        id: i,
        char: g.char,
        weight: g.weight,
        // Position in viewport percentages
        top: rand() * 100,
        left: rand() * 100,
        // Sizes 1.2rem → 3.5rem
        size: 1.2 + rand() * 2.3,
        // Duration 16s → 32s (slow drift)
        duration: 16 + rand() * 16,
        // Phase offset 0 → 1
        delay: -rand() * 30,
        // Slight rotation
        rotate: (rand() - 0.5) * 20,
        // Color variant (blue vs violet vs navy)
        color: rand() < 0.5 ? '#145DD6' : rand() < 0.7 ? '#6D28D9' : '#0C244F',
      }
    })
  }, [])

  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 pointer-events-none overflow-hidden"
    >
      {items.map((it) => {
        const isWord = it.char.length > 1
        return (
          <span
            key={it.id}
            className="absolute font-serif select-none"
            style={{
              top: `${it.top}%`,
              left: `${it.left}%`,
              fontSize: `${it.size}rem`,
              color: it.color,
              opacity: 0,
              transform: 'translate(-50%, -50%)',
              animation: `rimiris-float ${it.duration}s ease-in-out ${it.delay}s infinite`,
              willChange: 'transform, opacity',
              fontWeight: isWord ? 400 : 500,
              letterSpacing: isWord ? '0.05em' : 'normal',
              // Soft glow for emphasis
              textShadow: `0 0 24px ${it.color}30`,
            }}
          >
            {it.char}
          </span>
        )
      })}
    </div>
  )
}

// ============================================================================
// Combined component
// ============================================================================
export function ImmersiveBackground({
  className = '',
}: {
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      <BreathingMesh />
      <ParticleNetwork />
      <FloatingGlyphs />
    </div>
  )
}
