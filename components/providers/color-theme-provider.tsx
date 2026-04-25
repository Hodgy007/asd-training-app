'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type ColorTheme = 'classic' | 'blue' | 'dark'

const STORAGE_KEY = 'aaa-color-theme'

interface ColorThemeContextValue {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const ColorThemeContext = createContext<ColorThemeContextValue>({
  colorTheme: 'blue',
  setColorTheme: () => {},
})

export function useColorTheme() {
  return useContext(ColorThemeContext)
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('blue')

  // Read saved preference on mount (before first paint via suppressHydrationWarning on <html>)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorTheme | null
    if (saved === 'blue' || saved === 'classic' || saved === 'dark') {
      setColorThemeState(saved)
      applyTheme(saved)
    } else {
      applyTheme('blue')
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
  if (theme === 'classic') {
    // Classic is the legacy orange CSS — applied when the attribute is absent.
    html.removeAttribute('data-color-theme')
  } else {
    html.setAttribute('data-color-theme', theme)
  }
}
