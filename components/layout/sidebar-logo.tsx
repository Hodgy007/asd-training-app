/* eslint-disable @next/next/no-img-element */
'use client'

import { clsx } from 'clsx'
import { useColorTheme } from '@/components/providers/color-theme-provider'

interface SidebarLogoProps {
  collapsed: boolean
}

export function SidebarLogo({ collapsed }: SidebarLogoProps) {
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'
  const isDark = colorTheme === 'dark'

  if (!collapsed) {
    return (
      <img
        src="/logo-aaa.svg"
        alt="Ambitious about Autism"
        className={clsx('h-16 w-auto', isDark && 'invert brightness-125')}
      />
    )
  }

  if (isClassic) {
    return (
      <>
        <img
          src="/logo-aaa-mark-light.svg"
          alt="Ambitious about Autism"
          className="block h-10 w-10 dark:hidden"
        />
        <img
          src="/logo-aaa-mark-dark.svg"
          alt="Ambitious about Autism"
          className="hidden h-10 w-10 dark:block"
        />
      </>
    )
  }

  return (
    <img
      src={isDark ? '/logo-aaa-mark-dark.svg' : '/logo-aaa-mark-blue.svg'}
      alt="Ambitious about Autism"
      className="h-10 w-10"
    />
  )
}
