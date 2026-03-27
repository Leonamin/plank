import React from 'react'
import type { Label, Priority } from '../../types'

interface LabelFilterBarProps {
  labels: Label[]
  priorities: Priority[]
  activeFilters: string[]
  onToggleFilter: (id: string) => void
  onClearFilters: () => void
}

export default function LabelFilterBar({ labels, priorities, activeFilters, onToggleFilter, onClearFilters }: LabelFilterBarProps) {
  if (!labels.length && !priorities.length) return null

  const hasActiveFilter = activeFilters.length > 0

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
        {labels.length > 0 && priorities.length > 0 && (
          <span className="epic-chip-divider" />
        )}
        {priorities.map(p => {
          const filterId = `priority:${p.id}`
          const active = activeFilters.includes(filterId)
          return (
            <button
              key={p.id}
              className={`epic-chip${active ? ' active' : ''}`}
              style={{ '--epic-color': p.color } as React.CSSProperties}
              onClick={() => onToggleFilter(filterId)}
            >
              <span className="epic-chip-color" style={{ background: p.color }} />
              <span className="epic-chip-name">{p.name}</span>
            </button>
          )
        })}
        {hasActiveFilter && (
          <button className="epic-chip epic-chip-clear" onClick={onClearFilters}>
            전체 보기
          </button>
        )}
      </div>
    </div>
  )
}
