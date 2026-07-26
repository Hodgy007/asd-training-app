/* eslint-disable @next/next/no-img-element */
'use client'

import { useColorTheme } from '@/components/providers/color-theme-provider'

interface SidebarLogoProps {
  collapsed: boolean
}

/**
 * The wordmark needs to flip to white on a dark or coloured sidebar, but the
 * brand mark beside it must not.
 *
 * A CSS `invert` filter can't express that — it inverts the whole image, so the
 * six brand colours (#f48220 orange, #3bb14a green, #49c7ed cyan …) come out as
 * their opposites and the logo renders off-brand. `logo-aaa-white.svg` is the
 * purpose-made asset: white wordmark, brand colours untouched.
 *
 * Three backgrounds to cover: classic is white (or slate-900 under OS dark
 * mode), dark is slate-800, and the default theme is primary-500. Only classic
 * in light mode gets the dark wordmark.
 */
export function SidebarLogo({ collapsed }: SidebarLogoProps) {
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'

  if (collapsed) {
    // Mark only, no wordmark — it's all brand colours and reads on any background.
    return (
      <img
        src="/logo-aaa-mark.svg"
        alt="Ambitious about Autism"
        className="h-10 w-10"
      />
    )
  }

  if (!isClassic) {
    return (
      <img src="/logo-aaa-white.svg" alt="Ambitious about Autism" className="h-16 w-auto" />
    )
  }

  // Classic follows the OS light/dark preference, which is a CSS-only signal —
  // hence two elements toggled by `dark:` rather than a single conditional src.
  return (
    <>
      <img
        src="/logo-aaa.svg"
        alt="Ambitious about Autism"
        className="h-16 w-auto dark:hidden"
      />
      <img
        src="/logo-aaa-white.svg"
        alt=""
        aria-hidden="true"
        className="hidden h-16 w-auto dark:block"
      />
    </>
  )
}
