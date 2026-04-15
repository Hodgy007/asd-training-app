'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type ColorTheme = 'classic' | 'blue' | 'dark'

const STORAGE_KEY = 'aaa-color-theme'

interface ColorThemeContextValue {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const ColorThemeContext = createContext<ColorThemeContextValue>({
  colorTheme: 'classic',
  setColorTheme: () => {},
})

export function useColorTheme() {
  return useContext(ColorThemeContext)
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('classic')

  // Read saved preference on mount (before first paint via suppressHydrationWarning on <html>)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorTheme | null
    if (saved === 'blue' || saved === 'classic' || saved === 'dark') {
      setColorThemeState(saved)
      applyTheme(saved)
    }
  }, [])

  function setColorTheme(theme: ColorTheme) {
    setColorThemeState(theme)
    localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
  }

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  )
}

function applyTheme(theme: ColorTheme) {
  const html = document.documentElement
  if (theme === 'blue' || theme === 'dark') {
    html.setAttribute('data-color-theme', theme)
  } else {
    html.removeAttribute('data-color-theme')
  }
}
