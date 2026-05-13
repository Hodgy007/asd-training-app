/* eslint-disable @next/next/no-img-element */
'use client'

import { clsx } from 'clsx'
import { useColorTheme } from '@/components/providers/color-theme-provider'

interface SidebarLogoProps {
  collapsed: boolean
}

export function SidebarLogo({ collapsed }: SidebarLogoProps) {
  const { colorTheme } = useColorTheme()
  const isDark = colorTheme === 'dark'

  if (collapsed) {
    return (
      <img
        src="/logo-aaa-mark.svg"
        alt="Ambitious about Autism"
        className="h-10 w-10"
      />
    )
  }

  return (
    <img
      src="/logo-aaa.svg"
      alt="Ambitious about Autism"
      className={clsx('h-16 w-auto', isDark && 'invert brightness-125')}
    />
  )
}
