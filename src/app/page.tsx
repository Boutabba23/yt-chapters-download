'use client'

import { useState, useEffect } from 'react'
import { CommandBuilder } from '@/components/CommandBuilder'
import { InstallGuide } from '@/components/InstallGuide'

export default function Home() {
  const [theme, setTheme] = useState('midnight')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme])

  return (
    <div className="container">
      <div className="theme-selector">
        {['midnight', 'obsidian', 'aurora', 'frost'].map(t => (
          <div
            key={t}
            className={`theme-dot ${t} ${theme === t ? 'active' : ''}`}
            onClick={() => setTheme(t)}
            title={t.charAt(0).toUpperCase() + t.slice(1)}
          />
        ))}
      </div>

      <header className="mb-8">
        <h1>Antigravity Chapters</h1>
        <p>Local Download Command Generator & Script Builder</p>
      </header>

      <main className="glass-panel py-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Generate Your Download Script</h2>
            <p className="text-muted-foreground">
              Paste a URL, choose your options, and we'll give you a ready-to-run script.
            </p>
          </div>

          <CommandBuilder />

          <div className="mt-16 pt-8 border-t border-border">
            <InstallGuide />
          </div>
        </div>
      </main>

      <footer className="mt-12 opacity-60">
        <p>&copy; 2026 Antigravity - Privacy First: All processing happens on your machine.</p>
      </footer>
    </div>
  )
}
