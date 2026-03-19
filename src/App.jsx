import React, { useState, useEffect, useCallback } from 'react'

const API = '/api'

function App() {
  const [config, setConfig] = useState(null)
  const [tasks, setTasks] = useState({})
  const [selectedTask, setSelectedTask] = useState(null)
  const [showCreate, setShowCreate] = useState(null) // column id
  const [dragState, setDragState] = useState({ taskId: null, from: null })
  const [dragOver, setDragOver] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [toasts, setToasts] = useState([])
  const [activeView, setActiveView] = useState('board')
  const [docsTree, setDocsTree] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [docEditing, setDocEditing] = useState(false)
  const [expandedZones, setExpandedZones] = useState({ closed: false, hold: false })
  const [activeFilters, setActiveFilters] = useState([])

  const addToast = (message, undoAction) => {
    const id = Date.now()
    setToasts(prev => [{ id, message, undoAction }, ...prev].slice(0, 5))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  const fetchData = useCallback(async () => {
    const [cfgRes, taskRes] = await Promise.all([
      fetch(`${API}/config`),
      fetch(`${API}/tasks`),
    ])
    setConfig(await cfgRes.json())
    setTasks(await taskRes.json())
  }, [])

  const fetchDocsTree = useCallback(async () => {
    const res = await fetch(`${API}/docs/tree`)
    setDocsTree(await res.json())
  }, [])

  useEffect(() => {
    fetchData()
    fetchDocsTree()

    // SSE for live reload
    const es = new EventSource(`${API}/events`)
    es.addEventListener('task-change', () => fetchData())
    es.addEventListener('docs-change', () => fetchDocsTree())
    es.onmessage = () => fetchData()
    return () => es.close()
  }, [fetchData, fetchDocsTree])

  // --- Drag & Drop ---
  const onDragStart = (e, taskId, fromCol) => {
    setDragState({ taskId, from: fromCol })
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e, colId) => {
    e.preventDefault()
    setDragOver(colId)
  }

  const onDragLeave = () => setDragOver(null)

  const onDrop = async (e, toCol, status) => {
    e.preventDefault()
    setDragOver(null)
    const { taskId, from } = dragState
    if (!taskId || (from === toCol && !status)) return

    const body = { taskId, from, to: toCol }
    if (status) body.status = status

    const res = await fetch(`${API}/tasks/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      addToast(`"${taskId}" → ${toCol}${status ? ` (${status})` : ''}`, async () => {
        await fetch(`${API}/tasks/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, from: toCol, to: from }),
        })
        fetchData()
      })
    }
    fetchData()
  }

  // --- Create Task ---
  const handleCreate = async (formData) => {
    await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    setShowCreate(null)
    fetchData()
  }

  if (!config) return <div style={{ padding: 40, color: '#888' }}>Loading...</div>

  const columns = config.board.columns
  const labelMap = Object.fromEntries((config.labels || []).map(l => [l.id, l]))
  const priorityMap = Object.fromEntries((config.priorities || []).map(p => [p.id, p]))

  // Flatten all tasks for dependency picker
  const allTasks = Object.entries(tasks).flatMap(([col, list]) =>
    list.map(t => ({ ...t, _column: col }))
  )

  // --- Edit Task ---
  const handleEdit = async (task, updates, { keepOpen = false } = {}) => {
    await fetch(`${API}/tasks/${task._column}/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (keepOpen) {
      const res = await fetch(`${API}/tasks/${task._column}/${task.id}`)
      if (res.ok) {
        setSelectedTask(await res.json())
      }
    } else {
      setSelectedTask(null)
    }
    fetchData()
  }

  // --- Delete Task ---
  const handleDelete = async (task) => {
    if (!confirm(`"${task.title}" 태스크를 삭제할까요?`)) return
    await fetch(`${API}/tasks/${task._column}/${task.id}`, { method: 'DELETE' })
    setSelectedTask(null)
    fetchData()
  }

  // --- Save config ---
  const handleSaveConfig = async (newConfig) => {
    const res = await fetch(`${API}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    })
    if (!res.ok) {
      alert('설정 저장 실패')
      return
    }
    setShowSettings(false)
    await fetchData()
  }

  return (
    <>
      <header className="header">
        <h1>Plank</h1>
        <div className="header-tabs">
          <button className={`header-tab${activeView === 'board' ? ' active' : ''}`} onClick={() => setActiveView('board')}>보드</button>
          <button className={`header-tab${activeView === 'docs' ? ' active' : ''}`} onClick={() => { setActiveView('docs'); fetchDocsTree() }}>문서</button>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => setShowSettings(true)}>설정</button>
        </div>
      </header>

      {activeView === 'board' ? (
        <>
        <LabelFilterBar
          labels={config.labels || []}
          activeFilters={activeFilters}
          onToggleFilter={(id) => setActiveFilters(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
          )}
          onClearFilters={() => setActiveFilters([])}
        />
        <div className="board">
          {columns.map(col => {
            const colTasks = tasks[col.id] || []
            const filtered = activeFilters.length > 0
              ? colTasks.filter(t => (t.labels || []).some(l => activeFilters.includes(l)))
              : colTasks
            return (
            <Column
              key={col.id}
              column={col}
              tasks={filtered}
              labelMap={labelMap}
              priorityMap={priorityMap}
              dragOver={dragOver}
              onDragStart={onDragStart}
              onDragOver={(e) => onDragOver(e, col.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, col.id)}
              onDropWithStatus={(e, status) => onDrop(e, col.id, status)}
              onCardClick={(task) => setSelectedTask({ ...task, _column: col.id })}
              onAddClick={() => setShowCreate(col.id)}
              expandedZones={expandedZones}
              setExpandedZones={setExpandedZones}
              setDragOver={setDragOver}
            />
            )
          })}
        </div>
        </>
      ) : (
        <DocsView
          tree={docsTree}
          selectedDoc={selectedDoc}
          editing={docEditing}
          onSelectDoc={async (docPath) => {
            const res = await fetch(`${API}/docs/${docPath}`)
            if (res.ok) setSelectedDoc(await res.json())
          }}
          onCreateDoc={async (docPath, body) => {
            await fetch(`${API}/docs/${docPath}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
            fetchDocsTree()
          }}
          onUpdateDoc={async (docPath, body) => {
            await fetch(`${API}/docs/${docPath}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
            const res = await fetch(`${API}/docs/${docPath}`)
            if (res.ok) setSelectedDoc(await res.json())
            fetchDocsTree()
          }}
          onDeleteDoc={async (docPath) => {
            if (!confirm('이 문서를 삭제할까요?')) return
            await fetch(`${API}/docs/${docPath}`, { method: 'DELETE' })
            setSelectedDoc(null)
            fetchDocsTree()
          }}
          onEdit={() => setDocEditing(true)}
          onCancelEdit={() => setDocEditing(false)}
          onRefresh={fetchDocsTree}
        />
      )}

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          labelMap={labelMap}
          priorityMap={priorityMap}
          labels={config.labels || []}
          priorities={config.priorities || []}
          allTasks={allTasks}
          onSave={(updates, opts) => handleEdit(selectedTask, updates, opts)}
          onDelete={() => handleDelete(selectedTask)}
          onClose={() => setSelectedTask(null)}
          onViewDoc={(docPath) => { setActiveView('docs'); fetchDocsTree(); fetch(`${API}/docs/${docPath}`).then(r => r.json()).then(setSelectedDoc) }}
        />
      )}

      {showSettings && (
        <SettingsModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showCreate && (
        <CreateModal
          column={showCreate}
          labels={config.labels || []}
          priorities={config.priorities || []}
          templates={config.templates || []}
          allTasks={allTasks}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(null)}
        />
      )}

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className="toast">
              <span>{t.message}</span>
              <button className="toast-undo" onClick={() => { t.undoAction(); dismissToast(t.id) }}>되돌리기</button>
              <button className="toast-dismiss" onClick={() => dismissToast(t.id)}>&times;</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ===== Column =====
function Column({ column, tasks, labelMap, priorityMap, dragOver, onDragStart, onDragOver, onDragLeave, onDrop, onDropWithStatus, onCardClick, onAddClick, expandedZones, setExpandedZones, setDragOver }) {
  // Group done tasks by week
  const isDone = column.id === 'done'

  // Split done tasks into sub-groups
  const doneTasks = isDone ? tasks.filter(t => !t.status || t.status === 'done') : tasks
  const closedTasks = isDone ? tasks.filter(t => t.status === 'closed') : []
  const holdTasks = isDone ? tasks.filter(t => t.status === 'hold') : []
  const mainTasks = isDone ? doneTasks : tasks

  let grouped = null
  if (isDone && mainTasks.some(t => t._week)) {
    grouped = {}
    for (const t of mainTasks) {
      const week = t._week || 'other'
      if (!grouped[week]) grouped[week] = []
      grouped[week].push(t)
    }
  }

  return (
    <div className="column">
      <div className="column-header">
        <h2>{column.name}</h2>
        <span className="column-count">{tasks.length}</span>
      </div>
      <div
        className={`column-body${dragOver === column.id ? ' drag-over' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {grouped ? (
          Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([week, weekTasks]) => (
              <div key={week} className="week-group">
                <div className="week-label">{week}</div>
                {weekTasks.map(task => (
                  <Card
                    key={task.id}
                    task={task}
                    labelMap={labelMap}
                    priorityMap={priorityMap}
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
          {['closed', 'hold'].map(zone => {
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

// ===== Card =====
function Card({ task, labelMap, priorityMap, columnId, onDragStart, onClick }) {
  const [dragging, setDragging] = useState(false)

  const checkTotal = (task.content?.match(/^\s*- \[[ x]\]/gm) || []).length
  const checkDone = (task.content?.match(/^\s*- \[x\]/gm) || []).length
  const prio = priorityMap[task.priority]

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
      {task.depends_on?.length > 0 && (
        <div className="card-deps">
          선행: {task.depends_on.join(', ')}
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

// ===== Task Detail Modal (view + edit) =====
function TaskDetail({ task, labelMap, priorityMap, labels, priorities, allTasks, onSave, onDelete, onClose, onViewDoc }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editLabels, setEditLabels] = useState(task.labels || [])
  const [editPriority, setEditPriority] = useState(task.priority || 'p1')
  const [editDeps, setEditDeps] = useState(task.depends_on || [])
  const [editRefs, setEditRefs] = useState(task.refs || [])
  const [editRefInput, setEditRefInput] = useState('')
  const [editBody, setEditBody] = useState(task.content || '')
  const [showDoneTasks, setShowDoneTasks] = useState(false)

  const prio = priorityMap[task.priority]

  const toggleCheckline = (lineIndex) => {
    const lines = (task.content || '').split('\n')
    const line = lines[lineIndex]
    if (line.match(/^\s*- \[x\]:? /)) {
      lines[lineIndex] = line.replace(/- \[x\](:? )/, '- [ ]$1')
    } else if (line.match(/^\s*- \[ \]:? /)) {
      lines[lineIndex] = line.replace(/- \[ \](:? )/, '- [x]$1')
    }
    onSave({ content: lines.join('\n') }, { keepOpen: true })
  }

  const renderContent = (content) => {
    if (!content) return <p style={{ color: '#666' }}>내용 없음</p>
    const lines = content.split('\n')
    const elements = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      // Fenced code block
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim()
        const codeLines = []
        i++
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i])
          i++
        }
        i++
        elements.push(
          <pre key={`pre${i}`} className="md-code-block">
            {lang && <div className="md-code-lang">{lang}</div>}
            <code>{codeLines.join('\n')}</code>
          </pre>
        )
        continue
      }

      // Table
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines = []
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i])
          i++
        }
        const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim())
        const headers = parseRow(tableLines[0])
        const isSep = (row) => /^\|[\s\-:|]+\|$/.test(row.trim())
        const bodyStart = tableLines.length > 1 && isSep(tableLines[1]) ? 2 : 1
        const bodyRows = tableLines.slice(bodyStart).map(parseRow)
        elements.push(
          <table key={`t${i}`} className="md-table">
            <thead><tr>{headers.map((h, j) => <th key={j}>{renderInline(h)}</th>)}</tr></thead>
            <tbody>{bodyRows.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{renderInline(cell)}</td>)}</tr>
            ))}</tbody>
          </table>
        )
        continue
      }

      if (line.startsWith('### ')) {
        elements.push(<h3 key={i}>{renderInline(line.slice(4))}</h3>)
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={i}>{renderInline(line.slice(3))}</h2>)
      } else if (line.startsWith('# ')) {
        elements.push(<h1 key={i}>{renderInline(line.slice(2))}</h1>)
      } else if (line.startsWith('> ')) {
        elements.push(<blockquote key={i} className="md-blockquote">{renderInline(line.slice(2))}</blockquote>)
      } else if (/^---+$/.test(line.trim())) {
        elements.push(<hr key={i} className="md-hr" />)
      } else if (line.match(/^\s*- \[x\]:? /)) {
        const indent = (line.match(/^(\s*)/)[1].length / 2) | 0
        const text = line.replace(/^\s*- \[x\]:? /, '')
        elements.push(
          <div key={i} className="checklist-item clickable" style={{ paddingLeft: indent * 20 }} onClick={() => toggleCheckline(i)}>
            <span className="check-box checked" />
            <span style={{ textDecoration: 'line-through', color: '#666' }}>{renderInline(text)}</span>
          </div>
        )
      } else if (line.match(/^\s*- \[ \]:? /)) {
        const indent = (line.match(/^(\s*)/)[1].length / 2) | 0
        const text = line.replace(/^\s*- \[ \]:? /, '')
        elements.push(
          <div key={i} className="checklist-item clickable" style={{ paddingLeft: indent * 20 }} onClick={() => toggleCheckline(i)}>
            <span className="check-box" />
            <span>{renderInline(text)}</span>
          </div>
        )
      } else if (line.startsWith('- ')) {
        elements.push(<div key={i} style={{ paddingLeft: 12 }}>{renderInline(line)}</div>)
      } else if (line.trim() === '') {
        elements.push(<br key={i} />)
      } else {
        elements.push(<div key={i}>{renderInline(line)}</div>)
      }
      i++
    }
    return elements
  }

  const handleSave = () => {
    onSave({
      title: editTitle.trim(),
      labels: editLabels,
      priority: editPriority,
      depends_on: editDeps,
      refs: editRefs,
      content: editBody,
    })
  }

  if (editing) {
    return (
      <div className="modal-overlay">
        <div className="modal" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
          <h2>태스크 편집</h2>
          <div className="modal-field">
            <label>제목</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>라벨 (복수 선택)</label>
            <div className="picker-group">
              {labels.map(l => (
                <span
                  key={l.id}
                  className={`picker-chip${editLabels.includes(l.id) ? ' active' : ''}`}
                  style={{
                    background: editLabels.includes(l.id) ? l.color : 'transparent',
                    borderColor: l.color,
                    color: editLabels.includes(l.id) ? 'white' : l.color,
                  }}
                  onClick={() => setEditLabels(prev =>
                    prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id]
                  )}
                >
                  {l.name}
                </span>
              ))}
            </div>
          </div>
          <div className="modal-field">
            <label>우선순위</label>
            <div className="picker-group">
              {priorities.map(p => (
                <span
                  key={p.id}
                  className={`picker-chip${editPriority === p.id ? ' active' : ''}`}
                  style={{
                    background: editPriority === p.id ? p.color : 'transparent',
                    borderColor: p.color,
                    color: editPriority === p.id ? 'white' : p.color,
                  }}
                  onClick={() => setEditPriority(p.id)}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
          <div className="modal-field">
            <details>
              <summary style={{ cursor: 'pointer', userSelect: 'none' }}>선행 조건 {editDeps.length > 0 && `(${editDeps.length}개 선택)`}</summary>
              <div className="dep-picker" style={{ marginTop: 8 }}>
                <label className="dep-toggle" style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, padding: '4px 10px' }}>
                  <input type="checkbox" checked={showDoneTasks} onChange={e => setShowDoneTasks(e.target.checked)} />
                  완료된 태스크도 보기
                </label>
                {allTasks.filter(t => t.id !== task.id && (showDoneTasks || t._column !== 'done' || editDeps.includes(t.id))).map(t => (
                  <div
                    key={t.id}
                    className={`dep-item${editDeps.includes(t.id) ? ' selected' : ''}${t._column === 'done' ? ' done-task' : ''}`}
                    onClick={() => setEditDeps(prev =>
                      prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                    )}
                  >
                    <span className="dep-check">{editDeps.includes(t.id) ? '\u2713' : ''}</span>
                    <span className="dep-title">{t.title}</span>
                    <span className="dep-col">{t._column}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
          <div className="modal-field">
            <details>
              <summary style={{ cursor: 'pointer', userSelect: 'none' }}>참고 문서 {editRefs.length > 0 && `(${editRefs.length}개)`}</summary>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    value={editRefInput}
                    onChange={e => setEditRefInput(e.target.value)}
                    placeholder="파일 경로 (예: docs/api-spec.md)"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn" onClick={() => {
                    if (editRefInput.trim() && !editRefs.includes(editRefInput.trim())) {
                      setEditRefs(prev => [...prev, editRefInput.trim()])
                      setEditRefInput('')
                    }
                  }}>추가</button>
                </div>
                {editRefs.length > 0 && (
                  <div className="refs-chips">
                    {editRefs.map(r => (
                      <span key={r} className="ref-chip">
                        {r}
                        <button type="button" className="ref-chip-remove" onClick={() => setEditRefs(prev => prev.filter(x => x !== r))}>&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>
          <div className="modal-field">
            <label>내용 (마크다운)</label>
            <textarea
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              style={{ minHeight: 180 }}
            />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setEditing(false)}>취소</button>
            <button className="btn btn-primary" onClick={handleSave}>저장</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
        <h2>{task.title}</h2>
        <div className="card-meta" style={{ marginBottom: 16 }}>
          {task.id && (
            <span className="task-id-badge">
              {task.id}
            </span>
          )}
          {(task.labels || []).length > 0 ? (
            (task.labels || []).map(lid => {
              const label = labelMap[lid]
              return label ? (
                <span key={lid} className="card-label" style={{ background: label.color }}>
                  {label.name}
                </span>
              ) : null
            })
          ) : (
            <span style={{ fontSize: 11, color: '#555' }}>라벨 없음</span>
          )}
          {prio ? (
            <span className="card-priority-badge" style={{ background: prio.color }}>
              {prio.name}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: '#555' }}>우선순위 없음</span>
          )}
          {task.created && (
            <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>
              생성: {task.created}
            </span>
          )}
        </div>
        {task.depends_on?.length > 0 && (
          <div className="card-deps" style={{ marginBottom: 12 }}>
            선행 조건: {task.depends_on.join(', ')}
          </div>
        )}
        {(task.refs?.length > 0) && (
          <div className="task-refs" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#888' }}>참고 문서:</span>
            <div className="refs-chips" style={{ marginTop: 4 }}>
              {task.refs.map(r => (
                <span key={r} className="ref-chip ref-chip-readonly"
                  onClick={() => {
                    if (r.startsWith('docs/') && onViewDoc) {
                      onViewDoc(r)
                      onClose()
                    } else {
                      navigator.clipboard.writeText(r)
                    }
                  }}
                  title={r.startsWith('docs/') ? '클릭하여 문서 보기' : '클릭하여 경로 복사'}
                >
                  {r.startsWith('docs/') ? '📄 ' : '📁 '}{r}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="task-detail-content">
          {renderContent(task.content)}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={() => setEditing(true)}>편집</button>
          <button className="btn btn-danger" onClick={onDelete}>삭제</button>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}

// ===== Settings Modal =====
function SettingsModal({ config, onSave, onClose }) {
  const initLabels = config.labels || []
  const initPriorities = config.priorities || []
  const [labels, setLabels] = useState(initLabels)
  const [priorities, setPriorities] = useState(initPriorities)
  const [history, setHistory] = useState([])

  const pushHistory = () => {
    setHistory(prev => [...prev, { labels: JSON.parse(JSON.stringify(labels)), priorities: JSON.parse(JSON.stringify(priorities)) }])
  }

  const updateLabel = (index, field, value) => {
    pushHistory()
    setLabels(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  const removeLabel = (index) => {
    pushHistory()
    setLabels(prev => prev.filter((_, i) => i !== index))
  }

  const addLabel = () => {
    pushHistory()
    const id = `label-${Date.now()}`
    setLabels(prev => [...prev, { id, name: '', color: '#6B7280' }])
  }

  const updatePriority = (index, field, value) => {
    pushHistory()
    setPriorities(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const undo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setLabels(prev.labels)
    setPriorities(prev.priorities)
    setHistory(h => h.slice(0, -1))
  }

  const resetAll = () => {
    pushHistory()
    setLabels(initLabels)
    setPriorities(initPriorities)
  }

  const handleSave = () => {
    // Derive id from name for new labels
    const cleanLabels = labels
      .filter(l => l.name.trim())
      .map(l => ({
        ...l,
        id: l.id.startsWith('label-') ? l.name.trim().toLowerCase().replace(/\s+/g, '-') : l.id,
        name: l.name.trim(),
      }))
    onSave({ ...config, labels: cleanLabels, priorities })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, overflow: 'hidden' }}>
        <h2>보드 설정</h2>

        <div className="modal-field">
          <label>라벨</label>
          <div className="settings-list" style={{ padding: '0 4px' }}>
            {labels.map((l, i) => (
              <div key={i} className="settings-row">
                <input
                  type="color"
                  value={l.color}
                  onChange={e => updateLabel(i, 'color', e.target.value)}
                  className="color-input"
                />
                <input
                  value={l.name}
                  onChange={e => updateLabel(i, 'name', e.target.value)}
                  placeholder="라벨 이름"
                  className="settings-name-input"
                />
                {l.name && <span className="card-label" style={{ background: l.color }}>{l.name}</span>}
                <button className="btn-icon" onClick={() => removeLabel(i)} title="삭제">&times;</button>
              </div>
            ))}
            <button className="btn-add" onClick={addLabel}>+ 라벨 추가</button>
          </div>
        </div>

        <div className="modal-field">
          <label>우선순위</label>
          <div className="settings-list">
            {priorities.map((p, i) => (
              <div key={i} className="settings-row">
                <input
                  type="color"
                  value={p.color}
                  onChange={e => updatePriority(i, 'color', e.target.value)}
                  className="color-input"
                />
                <span className="settings-id">{p.id}</span>
                <input
                  value={p.name}
                  onChange={e => updatePriority(i, 'name', e.target.value)}
                  className="settings-name-input"
                />
                {p.name && <span className="card-priority-badge" style={{ background: p.color, marginLeft: 0 }}>{p.name}</span>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            우선순위 항목 수/ID 변경은 config.yml 직접 편집
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={resetAll} disabled={JSON.stringify(labels) === JSON.stringify(initLabels) && JSON.stringify(priorities) === JSON.stringify(initPriorities)}>전체 되돌리기</button>
          <button className="btn" onClick={undo} disabled={history.length === 0}>되돌리기</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  )
}

// ===== Create Task Modal =====
function CreateModal({ column, labels, priorities, templates, allTasks, onSubmit, onClose }) {
  const [title, setTitle] = useState('')
  const [selectedLabels, setSelectedLabels] = useState([])
  const [priority, setPriority] = useState('p1')
  const [selectedDeps, setSelectedDeps] = useState([])
  const [refs, setRefs] = useState([])
  const [refInput, setRefInput] = useState('')
  const [body, setBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [showDoneTasks, setShowDoneTasks] = useState(false)

  const applyTemplate = (templateId) => {
    setSelectedTemplate(templateId)
    if (!templateId) { setBody(''); return }
    const tmpl = templates.find(t => t.id === templateId)
    if (tmpl) setBody(tmpl.body)
  }

  const toggleLabel = (id) => {
    setSelectedLabels(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    )
  }

  const toggleDep = (id) => {
    setSelectedDeps(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      column,
      title: title.trim(),
      labels: selectedLabels,
      priority,
      depends_on: selectedDeps,
      refs,
      body: body.trim(),
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
        <h2>새 태스크</h2>
        <form onSubmit={handleSubmit}>
          {templates.length > 0 && (
            <div className="modal-field">
              <label>템플릿</label>
              <div className="picker-group">
                <span
                  className={`picker-chip${!selectedTemplate ? ' active' : ''}`}
                  style={{
                    background: !selectedTemplate ? '#374151' : 'transparent',
                    borderColor: '#374151',
                    color: !selectedTemplate ? 'white' : '#9CA3AF',
                  }}
                  onClick={() => applyTemplate('')}
                >
                  자유 형식
                </span>
                {templates.map(t => (
                  <span
                    key={t.id}
                    className={`picker-chip${selectedTemplate === t.id ? ' active' : ''}`}
                    style={{
                      background: selectedTemplate === t.id ? '#374151' : 'transparent',
                      borderColor: '#374151',
                      color: selectedTemplate === t.id ? 'white' : '#9CA3AF',
                    }}
                    onClick={() => applyTemplate(t.id)}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="modal-field">
            <label>제목</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="태스크 제목"
            />
          </div>

          <div className="modal-field">
            <label>라벨 (복수 선택)</label>
            <div className="picker-group">
              {labels.map(l => (
                <span
                  key={l.id}
                  className={`picker-chip${selectedLabels.includes(l.id) ? ' active' : ''}`}
                  style={{
                    '--chip-color': l.color,
                    background: selectedLabels.includes(l.id) ? l.color : 'transparent',
                    borderColor: l.color,
                    color: selectedLabels.includes(l.id) ? 'white' : l.color,
                  }}
                  onClick={() => toggleLabel(l.id)}
                >
                  {l.name}
                </span>
              ))}
            </div>
          </div>

          <div className="modal-field">
            <label>우선순위</label>
            <div className="picker-group">
              {priorities.map(p => (
                <span
                  key={p.id}
                  className={`picker-chip${priority === p.id ? ' active' : ''}`}
                  style={{
                    '--chip-color': p.color,
                    background: priority === p.id ? p.color : 'transparent',
                    borderColor: p.color,
                    color: priority === p.id ? 'white' : p.color,
                  }}
                  onClick={() => setPriority(p.id)}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          <div className="modal-field">
            <details>
              <summary style={{ cursor: 'pointer', userSelect: 'none' }}>선행 조건 {selectedDeps.length > 0 && `(${selectedDeps.length}개 선택)`}</summary>
              {allTasks.length > 0 ? (
                <div className="dep-picker" style={{ marginTop: 8 }}>
                  <label className="dep-toggle" style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, padding: '4px 10px' }}>
                    <input type="checkbox" checked={showDoneTasks} onChange={e => setShowDoneTasks(e.target.checked)} />
                    완료된 태스크도 보기
                  </label>
                  {allTasks.filter(t => showDoneTasks || t._column !== 'done' || selectedDeps.includes(t.id)).map(t => (
                    <div
                      key={t.id}
                      className={`dep-item${selectedDeps.includes(t.id) ? ' selected' : ''}${t._column === 'done' ? ' done-task' : ''}`}
                      onClick={() => toggleDep(t.id)}
                    >
                      <span className="dep-check">{selectedDeps.includes(t.id) ? '\u2713' : ''}</span>
                      <span className="dep-title">{t.title}</span>
                      <span className="dep-col">{t._column}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>등록된 태스크가 없습니다</div>
              )}
            </details>
          </div>

          <div className="modal-field">
            <details>
              <summary style={{ cursor: 'pointer', userSelect: 'none' }}>참고 문서 {refs.length > 0 && `(${refs.length}개)`}</summary>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    value={refInput}
                    onChange={e => setRefInput(e.target.value)}
                    placeholder="파일 경로 (예: docs/api-spec.md)"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn" onClick={() => {
                    if (refInput.trim() && !refs.includes(refInput.trim())) {
                      setRefs(prev => [...prev, refInput.trim()])
                      setRefInput('')
                    }
                  }}>추가</button>
                </div>
                {refs.length > 0 && (
                  <div className="refs-chips">
                    {refs.map(r => (
                      <span key={r} className="ref-chip">
                        {r}
                        <button type="button" className="ref-chip-remove" onClick={() => setRefs(prev => prev.filter(x => x !== r))}>&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>

          <div className="modal-field">
            <label>내용 (마크다운)</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={"## 목표\n\n## 구현 항목\n- [ ] 항목1\n- [ ] 항목2\n\n## 메모"}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-primary">생성</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===== Label Filter Bar =====
function LabelFilterBar({ labels, activeFilters, onToggleFilter, onClearFilters }) {
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
              style={{ '--epic-color': l.color }}
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

// ===== Shared markdown rendering =====
function renderInline(text) {
  // Process inline markdown: bold, italic, inline code
  const parts = []
  let remaining = text
  let key = 0
  while (remaining.length > 0) {
    // Inline code `...`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/)
    if (codeMatch) {
      if (codeMatch[1]) parts.push(...renderInlineBoldItalic(codeMatch[1], key++))
      parts.push(<code key={`c${key++}`} className="md-inline-code">{codeMatch[2]}</code>)
      remaining = codeMatch[3]
      continue
    }
    parts.push(...renderInlineBoldItalic(remaining, key++))
    break
  }
  return parts
}

function renderInlineBoldItalic(text, baseKey) {
  const parts = []
  let remaining = text
  let key = 0
  while (remaining.length > 0) {
    // Bold **...**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/)
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={`${baseKey}b${key++}`}>{boldMatch[1]}</span>)
      parts.push(<strong key={`${baseKey}b${key++}`}>{boldMatch[2]}</strong>)
      remaining = boldMatch[3]
      continue
    }
    // Italic *...*
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/)
    if (italicMatch) {
      if (italicMatch[1]) parts.push(<span key={`${baseKey}i${key++}`}>{italicMatch[1]}</span>)
      parts.push(<em key={`${baseKey}i${key++}`}>{italicMatch[2]}</em>)
      remaining = italicMatch[3]
      continue
    }
    if (remaining) parts.push(<span key={`${baseKey}t${key++}`}>{remaining}</span>)
    break
  }
  return parts.length ? parts : [remaining]
}

function renderMarkdownLines(lines) {
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block ```
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <pre key={`pre${i}`} className="md-code-block">
          {lang && <div className="md-code-lang">{lang}</div>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      continue
    }

    // Table
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim())
      const headers = parseRow(tableLines[0])
      const isSep = (row) => /^\|[\s\-:|]+\|$/.test(row.trim())
      const bodyStart = tableLines.length > 1 && isSep(tableLines[1]) ? 2 : 1
      const bodyRows = tableLines.slice(bodyStart).map(parseRow)
      elements.push(
        <table key={`t${i}`} className="md-table">
          <thead><tr>{headers.map((h, j) => <th key={j}>{renderInline(h)}</th>)}</tr></thead>
          <tbody>{bodyRows.map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{renderInline(cell)}</td>)}</tr>
          ))}</tbody>
        </table>
      )
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(<blockquote key={i} className="md-blockquote">{renderInline(line.slice(2))}</blockquote>)
    }
    // Headings
    else if (line.startsWith('### ')) elements.push(<h3 key={i}>{renderInline(line.slice(4))}</h3>)
    else if (line.startsWith('## ')) elements.push(<h2 key={i}>{renderInline(line.slice(3))}</h2>)
    else if (line.startsWith('# ')) elements.push(<h1 key={i}>{renderInline(line.slice(2))}</h1>)
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) elements.push(<hr key={i} className="md-hr" />)
    // List item
    else if (line.startsWith('- ')) elements.push(<div key={i} style={{ paddingLeft: 12 }}>{renderInline(line)}</div>)
    // Empty line
    else if (line.trim() === '') elements.push(<br key={i} />)
    // Normal text with inline formatting
    else elements.push(<div key={i}>{renderInline(line)}</div>)
    i++
  }
  return elements
}

// ===== Docs View =====
const DOC_TYPES = [
  { id: 'global', label: '글로벌', icon: '🌐' },
  { id: 'epics', label: '에픽', icon: '🎯' },
  { id: 'api', label: 'API', icon: '📡' },
  { id: 'schema', label: '스키마', icon: '🗂️' },
  { id: 'flows', label: '플로우', icon: '🔄' },
  { id: 'issues', label: '이슈', icon: '⚠️' },
]

function DocsView({ tree, selectedDoc, editing, onSelectDoc, onCreateDoc, onUpdateDoc, onDeleteDoc, onEdit, onCancelEdit, onRefresh }) {
  const [expandedSections, setExpandedSections] = useState(() => Object.fromEntries(DOC_TYPES.map(t => [t.id, true])))
  const [expandedDirs, setExpandedDirs] = useState({})
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [newDocType, setNewDocType] = useState('global')
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    if (editing && selectedDoc) {
      setEditContent(selectedDoc.content || '')
      setEditTitle(selectedDoc.data?.title || '')
    }
  }, [editing, selectedDoc])

  const toggleSection = (id) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleDir = (dirPath) => setExpandedDirs(prev => ({ ...prev, [dirPath]: !prev[dirPath] }))

  // Render sub-tree inside a type section (skips the type folder itself)
  const renderSubTree = (nodes, depth = 0) => {
    if (!nodes) return null
    return nodes.map(node => (
      <div key={node.path}>
        <div
          className={`docs-tree-item${node.type === 'dir' ? ' docs-tree-folder' : ''}${selectedDoc?.path === node.path ? ' active' : ''}`}
          style={{ paddingLeft: 16 + depth * 16 }}
          onClick={() => {
            if (node.type === 'dir') toggleDir(node.path)
            else onSelectDoc(node.path)
          }}
        >
          <span className="docs-tree-icon">{node.type === 'dir' ? (expandedDirs[node.path] ? '▾' : '▸') : '─'}</span>
          <span>{node.name}</span>
        </div>
        {node.type === 'dir' && expandedDirs[node.path] && node.children && renderSubTree(node.children, depth + 1)}
      </div>
    ))
  }

  // Group tree children by doc type folders
  const typeSections = DOC_TYPES.map(dt => {
    const folder = tree?.children?.find(n => n.type === 'dir' && n.name === dt.id)
    return { ...dt, children: folder?.children || [] }
  })
  // Uncategorized files (at docs root, not in type folders)
  const uncategorized = tree?.children?.filter(n => !DOC_TYPES.some(dt => dt.id === n.name)) || []

  const breadcrumb = selectedDoc?.path?.split('/') || []

  return (
    <div className="docs-view">
      <div className="docs-sidebar">
        <div className="flex-between" style={{ padding: '8px 12px' }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>문서</span>
          <button className="btn btn-sm" onClick={() => setShowCreateForm(true)}>+ 새 문서</button>
        </div>
        {showCreateForm && (
          <div style={{ padding: '4px 12px 8px' }}>
            <div className="picker-group" style={{ marginBottom: 6 }}>
              {DOC_TYPES.map(dt => (
                <span
                  key={dt.id}
                  className={`picker-chip${newDocType === dt.id ? ' active' : ''}`}
                  style={{ background: newDocType === dt.id ? '#374151' : 'transparent', borderColor: '#374151', color: newDocType === dt.id ? 'white' : '#9CA3AF', fontSize: 11, padding: '2px 6px' }}
                  onClick={() => setNewDocType(dt.id)}
                >{dt.icon} {dt.label}</span>
              ))}
            </div>
            <div className="modal-field" style={{ marginBottom: 4 }}>
              <input
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                placeholder="파일명 (예: booking-api)"
                style={{ fontSize: 12 }}
                autoFocus
              />
            </div>
            <div className="text-hint" style={{ marginBottom: 4 }}>→ {newDocType}/{newDocName || '...'}.md</div>
            <div className="flex-row" style={{ gap: 4 }}>
              <button className="btn btn-sm" onClick={() => {
                if (newDocName.trim()) {
                  const name = newDocName.trim().replace(/\.md$/, '')
                  const p = `${newDocType}/${name}.md`
                  const defaultContent = newDocType === 'epics'
                    ? '## 왜 (Why)\n이 에픽을 만드는 이유.\n\n## 결정된 것\n- YYYY-MM-DD: 결정 내용\n\n## 아직 안 정한 것\n- 미결 사항\n\n## 태스크 목록\n- [ ] 태스크 1\n\n## 떠오른 생각\n- 메모'
                    : ''
                  onCreateDoc(p, { title: name, content: defaultContent })
                  setNewDocName('')
                  setShowCreateForm(false)
                }
              }}>생성</button>
              <button className="btn btn-sm" onClick={() => { setShowCreateForm(false); setNewDocName('') }}>취소</button>
            </div>
          </div>
        )}
        <div className="docs-tree">
          {tree ? (
            <>
              {typeSections.map(sec => (
                <div key={sec.id} className="docs-section">
                  <div className="docs-section-header" onClick={() => toggleSection(sec.id)}>
                    <span>{sec.icon} {sec.label}</span>
                    <span className="docs-section-count">{sec.children.length}</span>
                  </div>
                  {expandedSections[sec.id] && sec.children.length > 0 && renderSubTree(sec.children)}
                  {expandedSections[sec.id] && sec.children.length === 0 && (
                    <div className="text-hint" style={{ padding: '2px 16px' }}>비어있음</div>
                  )}
                </div>
              ))}
              {uncategorized.length > 0 && (
                <div className="docs-section">
                  <div className="docs-section-header">📄 기타</div>
                  {renderSubTree(uncategorized)}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted" style={{ padding: 12 }}>로딩 중...</div>
          )}
        </div>
      </div>
      <div className="docs-content">
        {selectedDoc ? (
          <>
            <div className="docs-breadcrumb">
              {breadcrumb.map((seg, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ margin: '0 4px', color: '#555' }}>/</span>}
                  <span style={{ color: i === breadcrumb.length - 1 ? '#E5E7EB' : '#888' }}>{seg}</span>
                </span>
              ))}
              <div style={{ marginLeft: 'auto' }} className="flex-row">
                {!editing && <button className="btn btn-sm" onClick={onEdit}>편집</button>}
                <button className="btn btn-danger btn-sm" onClick={() => onDeleteDoc(selectedDoc.path)}>삭제</button>
              </div>
            </div>
            {editing ? (
              <div className="docs-content-body">
                <div className="modal-field">
                  <label>제목</label>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                </div>
                <div className="modal-field">
                  <label>내용</label>
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ minHeight: 300 }} />
                </div>
                <div className="modal-actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={() => {
                    onUpdateDoc(selectedDoc.path, { title: editTitle, content: editContent })
                    onCancelEdit()
                  }}>저장</button>
                  <button className="btn" onClick={onCancelEdit}>취소</button>
                </div>
              </div>
            ) : (
              <div className="docs-content-body">
                {selectedDoc.data?.title && <h2>{selectedDoc.data.title}</h2>}
                <div className="task-detail-content">
                  {selectedDoc.content ? renderMarkdownLines(selectedDoc.content.split('\n')) : <p className="text-muted">내용 없음</p>}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>왼쪽 파일 트리에서 문서를 선택하세요</p>
            <p className="text-muted" style={{ marginTop: 8 }}>또는 "새 문서" 버튼으로 문서를 생성하세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
