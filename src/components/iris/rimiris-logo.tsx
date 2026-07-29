'use client'

import * as React from 'react'
import Image from 'next/image'

/**
 * RimirisLogo — the official Rimiris AI brand mark.
 *
 * Uses the optimized WebP (27 KB) with PNG fallback (77 KB).
 * Renders at multiple sizes:
 *   - 'sm'  → 32px  (mobile header)
 *   - 'md'  → 40px  (default)
 *   - 'lg'  → 48px  (sidebar / welcome header — slightly larger per request)
 *   - 'xl'  → 80px  (large display)
 *   - '2xl' → 120px (welcome hero)
 *
 * Pass `withWordmark` to render "Rimiris AI" inline beside the mark
 * (AI sits to the right of "Rimiris", on the same baseline — NOT stacked).
 *
 * Pass `centered` to center the logo + wordmark combo inside its container.
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
  /** Center the logo + wordmark combo inside its flex container. */
  centered?: boolean
}

const SIZE_PX: Record<NonNullable<RimirisLogoProps['size']>, number> = {
  sm: 32,
  md: 40,
  lg: 48,
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

/** Tailwind text-size classes for the "Rimiris" word — "AI" is sized at 0.62em relative to this. */
const WORDMARK_TEXT: Record<NonNullable<RimirisLogoProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
  '2xl': 'text-4xl',
}

export function RimirisLogo({
  size = 'md',
  withWordmark = false,
  className = '',
  glow = false,
  centered = false,
}: RimirisLogoProps) {
  const px = SIZE_PX[size]
  return (
    <div
      className={`flex items-center gap-2 ${centered ? 'justify-center w-full' : ''} ${className}`}
    >
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
        <div className={`flex items-baseline gap-1 whitespace-nowrap ${WORDMARK_TEXT[size]}`}>
          <span className="font-bold leading-none tracking-tight">Rimiris</span>
          <span
            className="font-semibold text-muted-foreground leading-none"
            style={{ fontSize: '0.62em' }}
          >
            AI
          </span>
        </div>
      )}
    </div>
  )
}
