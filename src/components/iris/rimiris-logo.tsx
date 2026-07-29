'use client'

import * as React from 'react'
import Image from 'next/image'

/**
 * RimirisLogo — the official Rimiris AI brand mark.
 *
 * Uses the optimized WebP (27 KB) with PNG fallback (77 KB).
 * Renders at multiple sizes:
 *   - 'sm'  → 28px  (mobile header)
 *   - 'md'  → 36px  (default — sidebar, onboarding header, plan review header)
 *   - 'lg'  → 44px  (welcome screen hero)
 *   - 'xl'  → 80px  (large display)
 *
 * Pass `withWordmark` to render "Rimiris" + "AI" label beside the mark.
 *
 * The logo file was converted from a 1.4 MB PNG to a 27 KB WebP — a 98%
 * reduction — making it safe to render in performance-sensitive contexts.
 */
export type RimirisLogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  withWordmark?: boolean
  className?: string
  /** Adds the iris-glow halo (use on the welcome screen hero). */
  glow?: boolean
}

const SIZE_PX: Record<NonNullable<RimirisLogoProps['size']>, number> = {
  sm: 28,
  md: 36,
  lg: 44,
  xl: 80,
  '2xl': 120,
}

const ROUNDED: Record<NonNullable<RimirisLogoProps['size']>, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl',
}

export function RimirisLogo({
  size = 'md',
  withWordmark = false,
  className = '',
  glow = false,
}: RimirisLogoProps) {
  const px = SIZE_PX[size]
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`relative ${ROUNDED[size]} overflow-hidden flex-shrink-0 ${glow ? 'iris-glow' : ''}`}
        style={{ width: px, height: px }}
      >
        <Image
          src="/logo.webp"
          alt="Rimiris AI"
          width={px}
          height={px}
          priority={size === 'xl' || size === '2xl'}
          className="w-full h-full object-cover"
        />
      </div>
      {withWordmark && (
        <div className="leading-none">
          <p className="font-bold text-base leading-none">Rimiris</p>
          <p className="text-xs text-muted-foreground leading-none mt-0.5">AI</p>
        </div>
      )}
    </div>
  )
}
