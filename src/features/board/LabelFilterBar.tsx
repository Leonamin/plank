import React from 'react'
import type { Label } from '../../types'

interface LabelFilterBarProps {
  labels: Label[]
  activeFilters: string[]
  onToggleFilter: (id: string) => void
  onClearFilters: () => void
}

export default function LabelFilterBar({ labels, activeFilters, onToggleFilter, onClearFilters }: LabelFilterBarProps) {
  if (!labels.length) return null

  return (
    <div className="epic-bar">
      <div className="epic-chips">
        {labels.map(l => {
          const active = activeFilters.includes(l.id)
          return (
            <button
              key={l.id}
              className={`epic-chip${active ? ' active' : ''}`}
              style={{ '--epic-color': l.color } as React.CSSProperties}
              onClick={() => onToggleFilter(l.id)}
            >
              <span className="epic-chip-color" style={{ background: l.color }} />
              <span className="epic-chip-name">{l.name}</span>
            </button>
          )
        })}
        {activeFilters.length > 0 && (
          <button className="epic-chip epic-chip-clear" onClick={onClearFilters}>
            전체 보기
          </button>
        )}
      </div>
    </div>
  )
}
