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

  useEffect(() => {
    fetchData()

    // SSE for live reload
    const es = new EventSource(`${API}/events`)
    es.onmessage = () => fetchData()
    return () => es.close()
  }, [fetchData])

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

  const onDrop = async (e, toCol) => {
    e.preventDefault()
    setDragOver(null)
    const { taskId, from } = dragState
    if (!taskId || from === toCol) return

    const res = await fetch(`${API}/tasks/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, from, to: toCol }),
    })
    if (res.ok) {
      addToast(`"${taskId}" → ${toCol}`, async () => {
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
    await fetch(`${API}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    })
    setShowSettings(false)
    fetchData()
  }

  return (
    <>
      <header className="header">
        <h1>Plank</h1>
        <div className="header-actions">
          <button className="btn" onClick={() => setShowSettings(true)}>설정</button>
        </div>
      </header>

      <div className="board">
        {columns.map(col => (
          <Column
            key={col.id}
            column={col}
            tasks={tasks[col.id] || []}
            labelMap={labelMap}
            priorityMap={priorityMap}
            dragOver={dragOver === col.id}
            onDragStart={onDragStart}
            onDragOver={(e) => onDragOver(e, col.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, col.id)}
            onCardClick={(task) => setSelectedTask({ ...task, _column: col.id })}
            onAddClick={() => setShowCreate(col.id)}
          />
        ))}
      </div>

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
function Column({ column, tasks, labelMap, priorityMap, dragOver, onDragStart, onDragOver, onDragLeave, onDrop, onCardClick, onAddClick }) {
  // Group done tasks by week
  const isDone = column.id === 'done'
  let grouped = null
  if (isDone && tasks.some(t => t._week)) {
    grouped = {}
    for (const t of tasks) {
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
        className={`column-body${dragOver ? ' drag-over' : ''}`}
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
          tasks.map(task => (
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
        <button className="btn-add" onClick={onAddClick}>+ 태스크 추가</button>
      </div>
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
function TaskDetail({ task, labelMap, priorityMap, labels, priorities, allTasks, onSave, onDelete, onClose }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editLabels, setEditLabels] = useState(task.labels || [])
  const [editPriority, setEditPriority] = useState(task.priority || 'p1')
  const [editDeps, setEditDeps] = useState(task.depends_on || [])
  const [editBody, setEditBody] = useState(task.content || '')

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

    return lines.map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i}>{line.slice(3)}</h2>
      }
      if (line.match(/^\s*- \[x\]:? /)) {
        const indent = (line.match(/^(\s*)/)[1].length / 2) | 0
        const text = line.replace(/^\s*- \[x\]:? /, '')
        return (
          <div key={i} className="checklist-item clickable" style={{ paddingLeft: indent * 20 }} onClick={() => toggleCheckline(i)}>
            <span className="check-box checked" />
            <span style={{ textDecoration: 'line-through', color: '#666' }}>{text}</span>
          </div>
        )
      }
      if (line.match(/^\s*- \[ \]:? /)) {
        const indent = (line.match(/^(\s*)/)[1].length / 2) | 0
        const text = line.replace(/^\s*- \[ \]:? /, '')
        return (
          <div key={i} className="checklist-item clickable" style={{ paddingLeft: indent * 20 }} onClick={() => toggleCheckline(i)}>
            <span className="check-box" />
            <span>{text}</span>
          </div>
        )
      }
      if (line.startsWith('- ')) {
        return <div key={i} style={{ paddingLeft: 12 }}>{line}</div>
      }
      if (line.trim() === '') return <br key={i} />
      return <div key={i}>{line}</div>
    })
  }

  const handleSave = () => {
    onSave({
      title: editTitle.trim(),
      labels: editLabels,
      priority: editPriority,
      depends_on: editDeps,
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
                {allTasks.filter(t => t.id !== task.id).map(t => (
                  <div
                    key={t.id}
                    className={`dep-item${editDeps.includes(t.id) ? ' selected' : ''}`}
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
  const [labels, setLabels] = useState(config.labels || [])
  const [priorities, setPriorities] = useState(config.priorities || [])

  const updateLabel = (index, field, value) => {
    setLabels(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  const removeLabel = (index) => {
    setLabels(prev => prev.filter((_, i) => i !== index))
  }

  const addLabel = () => {
    const id = `label-${Date.now()}`
    setLabels(prev => [...prev, { id, name: '', color: '#6B7280' }])
  }

  const updatePriority = (index, field, value) => {
    setPriorities(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
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
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h2>보드 설정</h2>

        <div className="modal-field">
          <label>라벨</label>
          <div className="settings-list">
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
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            우선순위 항목 수/ID 변경은 config.yml 직접 편집
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  )
}

// ===== Create Task Modal =====
function CreateModal({ column, labels, priorities, allTasks, onSubmit, onClose }) {
  const [title, setTitle] = useState('')
  const [selectedLabels, setSelectedLabels] = useState([])
  const [priority, setPriority] = useState('p1')
  const [selectedDeps, setSelectedDeps] = useState([])
  const [body, setBody] = useState('')

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
      body: body.trim(),
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
        <h2>새 태스크</h2>
        <form onSubmit={handleSubmit}>
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
                  {allTasks.map(t => (
                    <div
                      key={t.id}
                      className={`dep-item${selectedDeps.includes(t.id) ? ' selected' : ''}`}
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

export default App
