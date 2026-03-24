import React from 'react'
import type { Epic, Task } from '../../types'

interface EpicProgressBarProps {
  epics: Epic[]
  allTasks: Task[]
  activeFilters: string[]
  onToggleFilter: (id: string) => void
  onViewDoc?: (epicId: string) => void
}

export default function EpicProgressBar({ epics, allTasks, activeFilters, onToggleFilter, onViewDoc }: EpicProgressBarProps) {
  const activeTasks = allTasks.filter(t => t._column !== 'done')

  const epicStats = epics.map(epic => {
    const epicTasks = activeTasks.filter(t => t.epic === epic.id)
    const total = epicTasks.length
    const done = epicTasks.filter(t => {
      const checkTotal = (t.content?.match(/^\s*- \[[ x]\]/gm) || []).length
      const checkDone = (t.content?.match(/^\s*- \[x\]/gm) || []).length
      return checkTotal > 0 && checkDone === checkTotal
    }).length
    return { ...epic, total, done }
  }).filter(e => e.total > 0)

  if (epicStats.length === 0) return null

  return (
    <div className="epic-progress-bar">
      {epicStats.map(epic => {
        const pct = epic.total > 0 ? Math.round((epic.done / epic.total) * 100) : 0
        const isFiltered = activeFilters.includes(`epic:${epic.id}`)
        return (
          <div key={epic.id} className={`epic-progress-item${isFiltered ? ' active' : ''}`} onClick={() => onToggleFilter(`epic:${epic.id}`)}>
            <div className="epic-progress-header">
              <span className="epic-progress-dot" style={{ background: epic.color }} />
              <span className="epic-progress-name" onClick={(e) => { e.stopPropagation(); onViewDoc?.(epic.id) }} title="에픽 문서 보기">{epic.name}</span>
              <span className="epic-progress-count">{epic.done}/{epic.total}</span>
            </div>
            <div className="epic-progress-track">
              <div className="epic-progress-fill" style={{ width: `${pct}%`, background: epic.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
