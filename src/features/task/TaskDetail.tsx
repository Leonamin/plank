import React, { useState } from 'react'
import type { Task, Label, Priority, Epic } from '../../types'
import { renderInline } from '../../utils/markdown'
import { wouldCreateCycle } from '../../utils/cycle'
import DocTreePicker from './DocTreePicker'

interface TaskDetailProps {
  task: Task
  labelMap: Record<string, Label>
  priorityMap: Record<string, Priority>
  epicMap: Record<string, Epic>
  labels: Label[]
  priorities: Priority[]
  epics: Epic[]
  allTasks: Task[]
  onSave: (updates: Partial<Task>, opts?: { keepOpen?: boolean }) => void
  onDelete: () => void
  onClose: () => void
  onViewDoc?: (docPath: string) => void
  addToast?: (message: string) => void
}

export default function TaskDetail({ task, labelMap, priorityMap, epicMap, labels, priorities, epics, allTasks, onSave, onDelete, onClose, onViewDoc, addToast }: TaskDetailProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editLabels, setEditLabels] = useState(task.labels || [])
  const [editPriority, setEditPriority] = useState(task.priority || 'p1')
  const [editEpic, setEditEpic] = useState(task.epic || '')
  const [editDeps, setEditDeps] = useState(task.depends_on || [])
  const [editRefs, setEditRefs] = useState(task.refs || [])
  const [editRefInput, setEditRefInput] = useState('')
  const [editBody, setEditBody] = useState(task.content || '')
  const [showDocPicker, setShowDocPicker] = useState(false)
  const [depExcludedCols, setDepExcludedCols] = useState<string[]>(['done'])
  const [depLabelFilter, setDepLabelFilter] = useState<string[]>([])
  const [expandedEditor, setExpandedEditor] = useState(false)

  const startEditing = () => {
    setEditTitle(task.title)
    setEditLabels(task.labels || [])
    setEditPriority(task.priority || 'p1')
    setEditEpic(task.epic || '')
    setEditDeps(task.depends_on || [])
    setEditRefs(task.refs || [])
    setEditRefInput('')
    setEditBody(task.content || '')
    setExpandedEditor(false)
    setEditing(true)
  }

  const prio = priorityMap[task.priority || '']

  const toggleCheckline = (lineIndex: number) => {
    const lines = (task.content || '').split('\n')
    const line = lines[lineIndex]
    if (line.match(/^\s*- \[x\]:? /)) {
      lines[lineIndex] = line.replace(/- \[x\](:? )/, '- [ ]$1')
    } else if (line.match(/^\s*- \[ \]:? /)) {
      lines[lineIndex] = line.replace(/- \[ \](:? )/, '- [x]$1')
    }
    onSave({ content: lines.join('\n') }, { keepOpen: true })
  }

  const renderContent = (content: string | undefined) => {
    if (!content) return <p style={{ color: '#666' }}>내용 없음</p>
    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]
      const lineIdx = i

      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim()
        const codeLines: string[] = []
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

      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = []
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i])
          i++
        }
        const parseRow = (row: string) => row.split('|').slice(1, -1).map(c => c.trim())
        const headers = parseRow(tableLines[0])
        const isSep = (row: string) => /^\|[\s\-:|]+\|$/.test(row.trim())
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
        const indent = (line.match(/^(\s*)/)![1].length / 2) | 0
        const text = line.replace(/^\s*- \[x\]:? /, '')
        elements.push(
          <div key={lineIdx} className="checklist-item clickable" style={{ paddingLeft: indent * 20 }} onClick={() => toggleCheckline(lineIdx)}>
            <span className="check-box checked" />
            <span style={{ textDecoration: 'line-through', color: '#666' }}>{renderInline(text)}</span>
          </div>
        )
      } else if (line.match(/^\s*- \[ \]:? /)) {
        const indent = (line.match(/^(\s*)/)![1].length / 2) | 0
        const text = line.replace(/^\s*- \[ \]:? /, '')
        elements.push(
          <div key={lineIdx} className="checklist-item clickable" style={{ paddingLeft: indent * 20 }} onClick={() => toggleCheckline(lineIdx)}>
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
    const updates: Partial<Task> = {
      title: editTitle.trim(),
      labels: editLabels,
      priority: editPriority,
      depends_on: editDeps,
      refs: editRefs,
      content: editBody,
      epic: editEpic || '',
    }
    onSave(updates, { keepOpen: true })
    setEditing(false)
    setExpandedEditor(false)
  }

  if (editing) {
    return (
      <div className="modal-overlay" onClick={() => setEditing(false)}>
        <div className={`modal modal--legacy${expandedEditor ? ' modal--expanded' : ''}`} onClick={e => e.stopPropagation()} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { setEditing(false); setExpandedEditor(false) } }}>
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
                  style={{ background: editLabels.includes(l.id) ? l.color : 'transparent', borderColor: l.color, color: editLabels.includes(l.id) ? 'white' : l.color }}
                  onClick={() => setEditLabels(prev => prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id])}
                >{l.name}</span>
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
                  style={{ background: editPriority === p.id ? p.color : 'transparent', borderColor: p.color, color: editPriority === p.id ? 'white' : p.color }}
                  onClick={() => setEditPriority(p.id)}
                >{p.name}</span>
              ))}
            </div>
          </div>
          {epics.length > 0 && (
            <div className="modal-field">
              <label>에픽</label>
              <div className="picker-group">
                <span
                  className={`picker-chip${!editEpic ? ' active' : ''}`}
                  style={{ borderColor: '#6B7280', background: !editEpic ? '#374151' : 'transparent', color: !editEpic ? '#E5E7EB' : '#6B7280' }}
                  onClick={() => setEditEpic('')}
                >없음</span>
                {epics.map(e => (
                  <span
                    key={e.id}
                    className={`picker-chip${editEpic === e.id ? ' active' : ''}`}
                    style={{ background: editEpic === e.id ? e.color : 'transparent', borderColor: e.color, color: editEpic === e.id ? 'white' : e.color }}
                    onClick={() => setEditEpic(e.id)}
                  >{e.name}</span>
                ))}
              </div>
            </div>
          )}
          <div className="modal-field">
            <details>
              <summary style={{ cursor: 'pointer', userSelect: 'none' }}>선행 조건 {editDeps.length > 0 && `(${editDeps.length}개 선택)`}</summary>
              <div className="dep-picker" style={{ marginTop: 8 }}>
                {(() => {
                  const columns = [...new Set(allTasks.filter(t => t.id !== task.id).map(t => t._column))]
                  const allLabelsSet = new Set<string>()
                  allTasks.filter(t => t.id !== task.id).forEach(t => (t.labels || []).forEach(l => allLabelsSet.add(l)))
                  const allLabels = [...allLabelsSet]
                  const toggleCol = (c: string) => setDepExcludedCols(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
                  const toggleLabel = (l: string) => setDepLabelFilter(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
                  const filtered = allTasks.filter(t => {
                    if (t.id === task.id) return false
                    if (depExcludedCols.includes(t._column) && !editDeps.includes(t.id)) return false
                    if (depLabelFilter.length > 0 && !(t.labels || []).some(l => depLabelFilter.includes(l)) && !editDeps.includes(t.id)) return false
                    return true
                  })
                  return <>
                    <div className="dep-filters">
                      <div className="dep-filter-row">
                        <span className="dep-filter-label">컬럼</span>
                        {columns.map(c => (
                          <span key={c} className={`dep-filter-chip${!depExcludedCols.includes(c) ? ' active' : ''}`} onClick={() => toggleCol(c)}>{c}</span>
                        ))}
                      </div>
                      {allLabels.length > 0 && (
                        <div className="dep-filter-row">
                          <span className="dep-filter-label">라벨</span>
                          {allLabels.map(l => (
                            <span key={l} className={`dep-filter-chip${depLabelFilter.includes(l) ? ' active' : ''}`} onClick={() => toggleLabel(l)}>{l}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {filtered.map(t => {
                      const isCycle = !editDeps.includes(t.id) && wouldCreateCycle(task.id, t.id, allTasks)
                      return (
                        <div
                          key={t.id}
                          className={`dep-item${editDeps.includes(t.id) ? ' selected' : ''}${t._column === 'done' ? ' done-task' : ''}${isCycle ? ' disabled' : ''}`}
                          title={isCycle ? '순환 참조가 발생합니다' : ''}
                          onClick={() => {
                            if (isCycle) return
                            setEditDeps(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])
                          }}
                        >
                          <span className="dep-check">{editDeps.includes(t.id) ? '\u2713' : isCycle ? '⊘' : ''}</span>
                          <span className="dep-title">{t.title}</span>
                          <span className="dep-col">{t._column}</span>
                        </div>
                      )
                    })}
                  </>
                })()}
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
                    placeholder="파일 경로 직접 입력"
                    style={{ flex: 1 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (editRefInput.trim() && !editRefs.includes(editRefInput.trim())) {
                          setEditRefs(prev => [...prev, editRefInput.trim()])
                          setEditRefInput('')
                        }
                      }
                    }}
                  />
                  <button type="button" className="btn" onClick={() => {
                    if (editRefInput.trim() && !editRefs.includes(editRefInput.trim())) {
                      setEditRefs(prev => [...prev, editRefInput.trim()])
                      setEditRefInput('')
                    }
                  }}>추가</button>
                  <button type="button" className={`btn${showDocPicker ? ' btn-active' : ''}`} onClick={() => setShowDocPicker(v => !v)}>문서 선택</button>
                </div>
                {showDocPicker && (
                  <DocTreePicker
                    selectedRefs={editRefs}
                    onSelect={refPath => {
                      setEditRefs(prev => prev.includes(refPath) ? prev.filter(x => x !== refPath) : [...prev, refPath])
                    }}
                  />
                )}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label>내용 (마크다운)</label>
              <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setExpandedEditor(v => !v)}>
                {expandedEditor ? '축소' : '확장'}
              </button>
            </div>
            <textarea value={editBody} onChange={e => setEditBody(e.target.value)} style={{ minHeight: expandedEditor ? '50vh' : 180 }} />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => { setEditing(false); setExpandedEditor(false) }}>취소</button>
            <button className="btn btn-primary" onClick={handleSave}>저장</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') onClose() }} tabIndex={-1}>
        <div className="modal-header">
          <h2>{task.title}</h2>
          <div className="card-meta" style={{ marginBottom: 0 }}>
            {task.id && <span className="task-id-badge copyable" onClick={() => { navigator.clipboard.writeText(task.id); addToast?.('ID 복사됨') }} title="클릭하여 ID 복사">{task.id}</span>}
            {task.epic && epicMap[task.epic] && (
              <span className="card-epic-badge" style={{ borderColor: epicMap[task.epic].color, color: epicMap[task.epic].color }}>
                {epicMap[task.epic].name}
              </span>
            )}
            {(task.labels || []).length > 0 ? (
              (task.labels || []).map(lid => {
                const label = labelMap[lid]
                return label ? (
                  <span key={lid} className="card-label" style={{ background: label.color }}>{label.name}</span>
                ) : null
              })
            ) : (
              <span style={{ fontSize: 11, color: '#555' }}>라벨 없음</span>
            )}
            {prio ? (
              <span className="card-priority-badge" style={{ background: prio.color }}>{prio.name}</span>
            ) : (
              <span style={{ fontSize: 11, color: '#555' }}>우선순위 없음</span>
            )}
            {task.created && (
              <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>생성: {task.created}</span>
            )}
          </div>
        </div>
        <div className="modal-body">
          {(task.depends_on?.length ?? 0) > 0 && (
            <div className="card-deps" style={{ marginBottom: 12 }}>
              선행 조건: {task.depends_on!.map((dep, i) => (
                <React.Fragment key={dep}>
                  {i > 0 && ', '}
                  <span className="task-id-badge copyable" onClick={() => { navigator.clipboard.writeText(dep); addToast?.('ID 복사됨') }} title="클릭하여 ID 복사">{dep}</span>
                </React.Fragment>
              ))}
            </div>
          )}
          {(task.refs?.length ?? 0) > 0 && (
            <div className="task-refs" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#888' }}>참고 문서:</span>
              <div className="refs-chips" style={{ marginTop: 4 }}>
                {task.refs!.map(r => (
                  <span key={r} className="ref-chip ref-chip-readonly"
                    onClick={() => {
                      if (r.startsWith('docs/') && onViewDoc) {
                        onViewDoc(r)
                        onClose()
                      } else {
                        navigator.clipboard.writeText(r)
                        addToast?.('경로 복사됨')
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
        </div>
        <div className="modal-footer">
          <div className="modal-actions" style={{ marginTop: 0 }}>
            <button className="btn" onClick={startEditing}>편집</button>
            <button className="btn btn-danger" onClick={onDelete}>삭제</button>
            <button className="btn" onClick={onClose}>닫기</button>
          </div>
        </div>
      </div>
    </div>
  )
}
