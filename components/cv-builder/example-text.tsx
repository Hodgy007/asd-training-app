'use client'

interface ExampleTextProps {
  children: React.ReactNode
}

export function ExampleText({ children }: ExampleTextProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-300 dark:border-amber-700 p-4 rounded-r-xl text-sm text-amber-800 dark:text-amber-200">
      {children}
    </div>
  )
}
