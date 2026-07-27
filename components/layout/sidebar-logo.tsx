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
 * Three backgrounds to cover: classic is white (or slate-900 in dark mode),
 * dark is slate-800, and the default theme is primary-500. Only classic in
 * light mode gets the dark wordmark.
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

  // Light/dark is a separate axis from the colour theme: next-themes puts a
  // `dark` class on <html> (system preference by default, user-overridable) and
  // Tailwind is configured with darkMode: 'class'. That's a CSS-only signal, so
  // this needs two elements toggled by `dark:` rather than a conditional src.
  //
  // Both carry the real alt text. Only one is ever displayed, and `display:none`
  // takes the other out of the accessibility tree, so there's no double
  // announcement — whereas marking one aria-hidden left the sidebar with no
  // accessible name at all whenever that was the visible one.
  return (
    <>
      <img
        src="/logo-aaa.svg"
        alt="Ambitious about Autism"
        className="h-16 w-auto dark:hidden"
      />
      <img
        src="/logo-aaa-white.svg"
        alt="Ambitious about Autism"
        className="hidden h-16 w-auto dark:block"
      />
    </>
  )
}
