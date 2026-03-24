import React, { useState } from 'react'
import type { Task, Label, Priority, Epic } from '../../types'

interface CardProps {
  task: Task
  labelMap: Record<string, Label>
  priorityMap: Record<string, Priority>
  epicMap: Record<string, Epic>
  columnId: string
  onDragStart: (e: React.DragEvent, taskId: string, fromCol: string) => void
  onClick: () => void
}

export default function Card({ task, labelMap, priorityMap, epicMap, columnId, onDragStart, onClick }: CardProps) {
  const [dragging, setDragging] = useState(false)

  const checkTotal = (task.content?.match(/^\s*- \[[ x]\]/gm) || []).length
  const checkDone = (task.content?.match(/^\s*- \[x\]/gm) || []).length
  const prio = priorityMap[task.priority || '']
  const epic = task.epic && epicMap?.[task.epic]

  return (
    <div
      className={`card${dragging ? ' dragging' : ''}`}
      draggable
      onDragStart={(e) => {
        setDragging(true)
        onDragStart(e, task.id, columnId)
      }}
      onDragEnd={() => setDragging(false)}
      onClick={onClick}
    >
      <div className="card-title">{task.title}</div>
      <div className="card-meta">
        {epic && (
          <span className="card-epic-badge" style={{ borderColor: epic.color, color: epic.color }}>
            {epic.name}
          </span>
        )}
        {(task.labels || []).map(lid => {
          const label = labelMap[lid]
          return label ? (
            <span key={lid} className="card-label" style={{ background: label.color }}>
              {label.name}
            </span>
          ) : null
        })}
        {prio && (
          <span className="card-priority-badge" style={{ background: prio.color }}>
            {prio.name}
          </span>
        )}
      </div>
      {(task.depends_on?.length ?? 0) > 0 && (
        <div className="card-deps">
          선행: {task.depends_on!.join(', ')}
        </div>
      )}
      {checkTotal > 0 && (
        <div className="card-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(checkDone / checkTotal) * 100}%` }} />
          </div>
          <span className="progress-text">{checkDone}/{checkTotal}</span>
        </div>
      )}
    </div>
  )
}
