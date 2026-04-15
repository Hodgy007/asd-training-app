'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type AppFont = 'default' | 'atkinson' | 'lexend' | 'opendyslexic'
export type FontSize = 90 | 95 | 100 | 105 | 110 | 115 | 120 | 125 | 130

export const FONT_SIZE_MIN: FontSize = 90
export const FONT_SIZE_MAX: FontSize = 130
export const FONT_SIZE_STEP = 5
export const FONT_SIZE_DEFAULT: FontSize = 100

const FONT_STORAGE_KEY = 'aaa-font'
const SIZE_STORAGE_KEY = 'aaa-font-size'

const FONT_URLS: Partial<Record<AppFont, string>> = {
  atkinson: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap',
  lexend: 'https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap',
  opendyslexic: 'https://fonts.cdnfonts.com/css/opendyslexic',
}

interface FontContextValue {
  appFont: AppFont
  fontSize: FontSize
  setAppFont: (font: AppFont) => void
  setFontSize: (size: FontSize) => void
}

const FontContext = createContext<FontContextValue>({
  appFont: 'default',
  fontSize: FONT_SIZE_DEFAULT,
  setAppFont: () => {},
  setFontSize: () => {},
})

export function useAppFont() {
  return useContext(FontContext)
}

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [appFont, setAppFontState] = useState<AppFont>('default')
  const [fontSize, setFontSizeState] = useState<FontSize>(FONT_SIZE_DEFAULT)

  useEffect(() => {
    const savedFont = localStorage.getItem(FONT_STORAGE_KEY) as AppFont | null
    const savedSize = localStorage.getItem(SIZE_STORAGE_KEY)

    if (savedFont && savedFont !== 'default') {
      setAppFontState(savedFont)
      applyFont(savedFont)
    }
    if (savedSize) {
      const n = parseInt(savedSize, 10) as FontSize
      if (n >= FONT_SIZE_MIN && n <= FONT_SIZE_MAX) {
        setFontSizeState(n)
        applyFontSize(n)
      }
    }
  }, [])

  function setAppFont(font: AppFont) {
    setAppFontState(font)
    localStorage.setItem(FONT_STORAGE_KEY, font)
    applyFont(font)
  }

  function setFontSize(size: FontSize) {
    setFontSizeState(size)
    localStorage.setItem(SIZE_STORAGE_KEY, String(size))
    applyFontSize(size)
  }

  return (
    <FontContext.Provider value={{ appFont, fontSize, setAppFont, setFontSize }}>
      {children}
    </FontContext.Provider>
  )
}

function applyFont(font: AppFont) {
  const html = document.documentElement
  if (font === 'default') {
    html.removeAttribute('data-font')
  } else {
    html.setAttribute('data-font', font)
    loadFontStylesheet(font)
  }
}

function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = size === FONT_SIZE_DEFAULT ? '' : `${size}%`
}

function loadFontStylesheet(font: AppFont) {
  const url = FONT_URLS[font]
  if (!url) return
  const id = `font-link-${font}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}
