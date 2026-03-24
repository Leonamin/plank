import React, { useState } from 'react'
import type { Column as ColumnType, Task, Label, Priority, Epic } from '../../types'
import { DONE_GROUP_OPTIONS } from '../../constants'
import { getDoneGroupKey, getDoneGroupLabel } from '../../utils/dates'
import Card from './Card'

interface ColumnProps {
  column: ColumnType
  tasks: Task[]
  labelMap: Record<string, Label>
  priorityMap: Record<string, Priority>
  epicMap: Record<string, Epic>
  dragOver: string | null
  onDragStart: (e: React.DragEvent, taskId: string, fromCol: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onDropWithStatus: (e: React.DragEvent, status: string) => void
  onCardClick: (task: Task) => void
  onAddClick: () => void
  expandedZones: Record<string, boolean>
  setExpandedZones: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setDragOver: React.Dispatch<React.SetStateAction<string | null>>
}

export default function Column({
  column, tasks, labelMap, priorityMap, epicMap,
  dragOver, onDragStart, onDragOver, onDragLeave, onDrop, onDropWithStatus,
  onCardClick, onAddClick, expandedZones, setExpandedZones, setDragOver,
}: ColumnProps) {
  const [doneGroupBy, setDoneGroupBy] = useState('week')
  const isDone = column.id === 'done'

  const doneTasks = isDone ? tasks.filter(t => !t.status || t.status === 'done') : tasks
  const closedTasks = isDone ? tasks.filter(t => t.status === 'closed') : []
  const holdTasks = isDone ? tasks.filter(t => t.status === 'hold') : []
  const mainTasks = isDone ? doneTasks : tasks

  let grouped: Record<string, Task[]> | null = null
  if (isDone && mainTasks.length > 0) {
    grouped = {}
    for (const t of mainTasks) {
      const key = getDoneGroupKey(t._completedAt || t.completed_at, t._week, doneGroupBy)
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    }
  }

  return (
    <div className="column">
      <div className="column-header">
        <h2>{column.name}</h2>
        <span className="column-count">{tasks.length}</span>
      </div>
      {isDone && (
        <div className="done-group-filter">
          {DONE_GROUP_OPTIONS.map(opt => (
            <span key={opt.id} className={`done-group-chip${doneGroupBy === opt.id ? ' active' : ''}`} onClick={() => setDoneGroupBy(opt.id)}>{opt.label}</span>
          ))}
        </div>
      )}
      <div
        className={`column-body${dragOver === column.id ? ' drag-over' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {grouped ? (
          Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([key, groupTasks]) => (
              <div key={key} className="week-group">
                <div className="week-label">{getDoneGroupLabel(key, doneGroupBy)}</div>
                {groupTasks.map(task => (
                  <Card
                    key={task.id}
                    task={task}
                    labelMap={labelMap}
                    priorityMap={priorityMap}
                    epicMap={epicMap}
                    columnId={column.id}
                    onDragStart={onDragStart}
                    onClick={() => onCardClick(task)}
                  />
                ))}
              </div>
            ))
        ) : (
          mainTasks.map(task => (
            <Card
              key={task.id}
              task={task}
              labelMap={labelMap}
              priorityMap={priorityMap}
              epicMap={epicMap}
              columnId={column.id}
              onDragStart={onDragStart}
              onClick={() => onCardClick(task)}
            />
          ))
        )}
      </div>
      <div className="column-footer">
        <button className="btn-add" onClick={onAddClick}>+ 태스크 추가</button>
      </div>
      {isDone && (
        <div className="done-zones">
          {(['closed', 'hold'] as const).map(zone => {
            const zoneTasks = zone === 'closed' ? closedTasks : holdTasks
            const zoneLabel = zone === 'closed' ? '취소됨' : '보류'
            const expanded = expandedZones[zone]
            return (
              <div
                key={zone}
                className={`done-zone${dragOver === `done-${zone}` ? ' drag-over' : ''}`}
                data-status={zone}
                onDragOver={(e) => { e.preventDefault(); setDragOver(`done-${zone}`) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => onDropWithStatus(e, zone)}
              >
                <div className="done-zone-header" onClick={() => setExpandedZones(prev => ({ ...prev, [zone]: !prev[zone] }))}>
                  <span>{expanded ? '▾' : '▸'} {zoneLabel}</span>
                  <span className="done-zone-count">{zoneTasks.length}</span>
                </div>
                {expanded && (
                  <div className="done-zone-body">
                    {zoneTasks.map(task => (
                      <Card
                        key={task.id}
                        task={task}
                        labelMap={labelMap}
                        priorityMap={priorityMap}
                        epicMap={epicMap}
                        columnId={column.id}
                        onDragStart={onDragStart}
                        onClick={() => onCardClick(task)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
