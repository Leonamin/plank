import React, { useState } from 'react'
import type { Config, Label, Priority, Epic } from '../../types'

interface SettingsModalProps {
  config: Config
  onSave: (newConfig: Config) => void
  onClose: () => void
}

export default function SettingsModal({ config, onSave, onClose }: SettingsModalProps) {
  const initLabels = config.labels || []
  const initPriorities = config.priorities || []
  const initEpics = config.epics || []
  const [labels, setLabels] = useState<Label[]>(initLabels)
  const [priorities, setPriorities] = useState<Priority[]>(initPriorities)
  const [epics, setEpics] = useState<Epic[]>(initEpics)
  const [history, setHistory] = useState<{ labels: Label[]; priorities: Priority[]; epics: Epic[] }[]>([])

  const pushHistory = () => {
    setHistory(prev => [...prev, {
      labels: JSON.parse(JSON.stringify(labels)),
      priorities: JSON.parse(JSON.stringify(priorities)),
      epics: JSON.parse(JSON.stringify(epics)),
    }])
  }

  const updateLabel = (index: number, field: keyof Label, value: string) => {
    pushHistory()
    setLabels(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  const removeLabel = (index: number) => {
    pushHistory()
    setLabels(prev => prev.filter((_, i) => i !== index))
  }

  const addLabel = () => {
    pushHistory()
    const id = `label-${Date.now()}`
    setLabels(prev => [...prev, { id, name: '', color: '#6B7280' }])
  }

  const updatePriority = (index: number, field: keyof Priority, value: string) => {
    pushHistory()
    setPriorities(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const updateEpic = (index: number, field: keyof Epic, value: string) => {
    pushHistory()
    setEpics(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  const removeEpic = (index: number) => {
    pushHistory()
    setEpics(prev => prev.filter((_, i) => i !== index))
  }

  const addEpic = () => {
    pushHistory()
    const id = `epic-${Date.now()}`
    setEpics(prev => [...prev, { id, name: '', color: '#6B7280' }])
  }

  const undo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setLabels(prev.labels)
    setPriorities(prev.priorities)
    setEpics(prev.epics)
    setHistory(h => h.slice(0, -1))
  }

  const resetAll = () => {
    pushHistory()
    setLabels(initLabels)
    setPriorities(initPriorities)
    setEpics(initEpics)
  }

  const handleSave = () => {
    const cleanLabels = labels
      .filter(l => l.name.trim())
      .map(l => ({
        ...l,
        id: l.id.startsWith('label-') ? l.name.trim().toLowerCase().replace(/\s+/g, '-') : l.id,
        name: l.name.trim(),
      }))
    const cleanEpics = epics
      .filter(e => e.name.trim())
      .map(e => ({
        ...e,
        id: e.id.startsWith('epic-') ? e.name.trim().toLowerCase().replace(/\s+/g, '-') : e.id,
        name: e.name.trim(),
      }))
    onSave({ ...config, labels: cleanLabels, priorities, epics: cleanEpics })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2>보드 설정</h2>
        </div>
        <div className="modal-body">
        <div className="modal-field">
          <label>라벨</label>
          <div className="settings-list" style={{ padding: '0 4px' }}>
            {labels.map((l, i) => (
              <div key={i} className="settings-row">
                <input type="color" value={l.color} onChange={e => updateLabel(i, 'color', e.target.value)} className="color-input" />
                <input value={l.name} onChange={e => updateLabel(i, 'name', e.target.value)} placeholder="라벨 이름" className="settings-name-input" />
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
                <input type="color" value={p.color} onChange={e => updatePriority(i, 'color', e.target.value)} className="color-input" />
                <span className="settings-id">{p.id}</span>
                <input value={p.name} onChange={e => updatePriority(i, 'name', e.target.value)} className="settings-name-input" />
                {p.name && <span className="card-priority-badge" style={{ background: p.color, marginLeft: 0 }}>{p.name}</span>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            우선순위 항목 수/ID 변경은 config.yml 직접 편집
          </div>
        </div>

        <div className="modal-field">
          <label>에픽</label>
          <div className="settings-list" style={{ padding: '0 4px' }}>
            {epics.map((e, i) => (
              <div key={i} className="settings-row">
                <input type="color" value={e.color} onChange={ev => updateEpic(i, 'color', ev.target.value)} className="color-input" />
                <input value={e.name} onChange={ev => updateEpic(i, 'name', ev.target.value)} placeholder="에픽 이름" className="settings-name-input" />
                {e.name && <span className="card-epic-badge" style={{ borderColor: e.color, color: e.color }}>{e.name}</span>}
                <button className="btn-icon" onClick={() => removeEpic(i)} title="삭제">&times;</button>
              </div>
            ))}
            <button className="btn-add" onClick={addEpic}>+ 에픽 추가</button>
          </div>
        </div>

        </div>
        <div className="modal-footer">
          <div className="modal-actions" style={{ marginTop: 0 }}>
            <button className="btn" onClick={resetAll} disabled={JSON.stringify(labels) === JSON.stringify(initLabels) && JSON.stringify(priorities) === JSON.stringify(initPriorities)}>전체 되돌리기</button>
            <button className="btn" onClick={undo} disabled={history.length === 0}>되돌리기</button>
            <div style={{ flex: 1 }} />
            <button className="btn" onClick={onClose}>취소</button>
            <button className="btn btn-primary" onClick={handleSave}>저장</button>
          </div>
        </div>
      </div>
    </div>
  )
}
