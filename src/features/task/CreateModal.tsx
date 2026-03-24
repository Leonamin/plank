import React, { useState } from 'react'
import type { Label, Priority, Epic, Template, Task } from '../../types'
import DocTreePicker from './DocTreePicker'

interface CreateModalProps {
  column: string
  labels: Label[]
  priorities: Priority[]
  epics: Epic[]
  templates: Template[]
  allTasks: Task[]
  onSubmit: (data: Record<string, unknown>) => void
  onClose: () => void
}

export default function CreateModal({ column, labels, priorities, epics, templates, allTasks, onSubmit, onClose }: CreateModalProps) {
  const [title, setTitle] = useState('')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [priority, setPriority] = useState('p1')
  const [selectedEpic, setSelectedEpic] = useState('')
  const [selectedDeps, setSelectedDeps] = useState<string[]>([])
  const [refs, setRefs] = useState<string[]>([])
  const [refInput, setRefInput] = useState('')
  const [showDocPicker, setShowDocPicker] = useState(false)
  const [body, setBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [depExcludedCols, setDepExcludedCols] = useState<string[]>(['done'])
  const [depLabelFilter, setDepLabelFilter] = useState<string[]>([])

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    if (!templateId) { setBody(''); return }
    const tmpl = templates.find(t => t.id === templateId)
    if (tmpl) setBody(tmpl.body)
  }

  const toggleLabel = (id: string) => {
    setSelectedLabels(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  const toggleDep = (id: string) => {
    setSelectedDeps(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const data: Record<string, unknown> = {
      column,
      title: title.trim(),
      labels: selectedLabels,
      priority,
      depends_on: selectedDeps,
      refs,
      body: body.trim(),
    }
    if (selectedEpic) data.epic = selectedEpic
    onSubmit(data)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--legacy" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
        <h2>새 태스크</h2>
        <form onSubmit={handleSubmit}>
          {templates.length > 0 && (
            <div className="modal-field">
              <label>템플릿</label>
              <div className="picker-group">
                <span
                  className={`picker-chip${!selectedTemplate ? ' active' : ''}`}
                  style={{ background: !selectedTemplate ? '#374151' : 'transparent', borderColor: '#374151', color: !selectedTemplate ? 'white' : '#9CA3AF' }}
                  onClick={() => applyTemplate('')}
                >자유 형식</span>
                {templates.map(t => (
                  <span
                    key={t.id}
                    className={`picker-chip${selectedTemplate === t.id ? ' active' : ''}`}
                    style={{ background: selectedTemplate === t.id ? '#374151' : 'transparent', borderColor: '#374151', color: selectedTemplate === t.id ? 'white' : '#9CA3AF' }}
                    onClick={() => applyTemplate(t.id)}
                  >{t.name}</span>
                ))}
              </div>
            </div>
          )}

          <div className="modal-field">
            <label>제목</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="태스크 제목" />
          </div>

          <div className="modal-field">
            <label>라벨 (복수 선택)</label>
            <div className="picker-group">
              {labels.map(l => (
                <span
                  key={l.id}
                  className={`picker-chip${selectedLabels.includes(l.id) ? ' active' : ''}`}
                  style={{ '--chip-color': l.color, background: selectedLabels.includes(l.id) ? l.color : 'transparent', borderColor: l.color, color: selectedLabels.includes(l.id) ? 'white' : l.color } as React.CSSProperties}
                  onClick={() => toggleLabel(l.id)}
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
                  className={`picker-chip${priority === p.id ? ' active' : ''}`}
                  style={{ '--chip-color': p.color, background: priority === p.id ? p.color : 'transparent', borderColor: p.color, color: priority === p.id ? 'white' : p.color } as React.CSSProperties}
                  onClick={() => setPriority(p.id)}
                >{p.name}</span>
              ))}
            </div>
          </div>

          {epics.length > 0 && (
            <div className="modal-field">
              <label>에픽</label>
              <div className="picker-group">
                <span
                  className={`picker-chip${!selectedEpic ? ' active' : ''}`}
                  style={{ borderColor: '#6B7280', background: !selectedEpic ? '#374151' : 'transparent', color: !selectedEpic ? '#E5E7EB' : '#6B7280' }}
                  onClick={() => setSelectedEpic('')}
                >없음</span>
                {epics.map(e => (
                  <span
                    key={e.id}
                    className={`picker-chip${selectedEpic === e.id ? ' active' : ''}`}
                    style={{ background: selectedEpic === e.id ? e.color : 'transparent', borderColor: e.color, color: selectedEpic === e.id ? 'white' : e.color }}
                    onClick={() => setSelectedEpic(e.id)}
                  >{e.name}</span>
                ))}
              </div>
            </div>
          )}

          <div className="modal-field">
            <details>
              <summary style={{ cursor: 'pointer', userSelect: 'none' }}>선행 조건 {selectedDeps.length > 0 && `(${selectedDeps.length}개 선택)`}</summary>
              {allTasks.length > 0 ? (
                <div className="dep-picker" style={{ marginTop: 8 }}>
                  {(() => {
                    const columns = [...new Set(allTasks.map(t => t._column))]
                    const allLabelsSet = new Set<string>()
                    allTasks.forEach(t => (t.labels || []).forEach(l => allLabelsSet.add(l)))
                    const allLabelsList = [...allLabelsSet]
                    const toggleCol = (c: string) => setDepExcludedCols(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
                    const toggleLbl = (l: string) => setDepLabelFilter(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
                    const filtered = allTasks.filter(t => {
                      if (depExcludedCols.includes(t._column) && !selectedDeps.includes(t.id)) return false
                      if (depLabelFilter.length > 0 && !(t.labels || []).some(l => depLabelFilter.includes(l)) && !selectedDeps.includes(t.id)) return false
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
                        {allLabelsList.length > 0 && (
                          <div className="dep-filter-row">
                            <span className="dep-filter-label">라벨</span>
                            {allLabelsList.map(l => (
                              <span key={l} className={`dep-filter-chip${depLabelFilter.includes(l) ? ' active' : ''}`} onClick={() => toggleLbl(l)}>{l}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {filtered.map(t => (
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
                    </>
                  })()}
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
                    placeholder="파일 경로 직접 입력"
                    style={{ flex: 1 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (refInput.trim() && !refs.includes(refInput.trim())) {
                          setRefs(prev => [...prev, refInput.trim()])
                          setRefInput('')
                        }
                      }
                    }}
                  />
                  <button type="button" className="btn" onClick={() => {
                    if (refInput.trim() && !refs.includes(refInput.trim())) {
                      setRefs(prev => [...prev, refInput.trim()])
                      setRefInput('')
                    }
                  }}>추가</button>
                  <button type="button" className={`btn${showDocPicker ? ' btn-active' : ''}`} onClick={() => setShowDocPicker(v => !v)}>문서 선택</button>
                </div>
                {showDocPicker && (
                  <DocTreePicker
                    selectedRefs={refs}
                    onSelect={refPath => {
                      setRefs(prev => prev.includes(refPath) ? prev.filter(x => x !== refPath) : [...prev, refPath])
                    }}
                  />
                )}
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
