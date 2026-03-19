'use client'

import { useState, useEffect } from 'react'
import { Plus, Users } from 'lucide-react'
import { ChildCard } from '@/components/children/child-card'
import { AddChildForm } from '@/components/children/add-child-form'

interface Child {
  id: string
  name: string
  dateOfBirth: string
  observations: { domain: string; date: string }[]
  _count: { observations: number }
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  async function fetchChildren() {
    try {
      const res = await fetch('/api/children')
      if (res.ok) {
        const data = await res.json()
        setChildren(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChildren()
  }, [])

  function handleClose() {
    setShowAddForm(false)
    fetchChildren()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Children</h1>
          <p className="text-slate-500 mt-1">Track observations for each child in your care.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add child
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-calm-200 rounded-full" />
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-calm-200 rounded" />
                  <div className="h-3 w-16 bg-calm-200 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-calm-100 rounded mb-2" />
              <div className="h-3 w-2/3 bg-calm-100 rounded" />
            </div>
          ))}
        </div>
      ) : children.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-calm-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No children added yet</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            Add a child to begin logging observations and tracking behavioural patterns over time.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add your first child
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => (
            <ChildCard
              key={child.id}
              child={{
                ...child,
                dateOfBirth: new Date(child.dateOfBirth),
                observations: child.observations.map((o) => ({
                  ...o,
                  date: new Date(o.date),
                })),
              }}
            />
          ))}
          <button
            onClick={() => setShowAddForm(true)}
            className="border-2 border-dashed border-calm-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
          >
            <div className="w-12 h-12 bg-calm-100 group-hover:bg-primary-100 rounded-full flex items-center justify-center transition-colors">
              <Plus className="h-6 w-6 text-slate-300 group-hover:text-primary-500 transition-colors" />
            </div>
            <span className="text-sm text-slate-400 group-hover:text-primary-600 font-medium transition-colors">
              Add another child
            </span>
          </button>
        </div>
      )}

      {showAddForm && <AddChildForm onClose={handleClose} />}
    </div>
  )
}
