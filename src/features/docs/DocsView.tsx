import React, { useState, useEffect } from 'react'
import type { DocNode, Task, Epic } from '../../types'
import { DOC_TYPES } from '../../constants'
import { renderMarkdownLines } from '../../utils/markdown'

interface SelectedDoc {
  path: string
  content?: string
  data?: { title?: string }
}

interface DocsViewProps {
  tree: DocNode | null
  selectedDoc: SelectedDoc | null
  editing: boolean
  allTasks: Task[]
  epicMap: Record<string, Epic>
  onSelectDoc: (docPath: string) => void
  onCreateDoc: (docPath: string, body: Record<string, unknown>) => void
  onUpdateDoc: (docPath: string, body: Record<string, unknown>) => void
  onDeleteDoc: (docPath: string) => void
  onEdit: () => void
  onCancelEdit: () => void
  onRefresh: () => void
}

export default function DocsView({ tree, selectedDoc, editing, allTasks, epicMap, onSelectDoc, onCreateDoc, onUpdateDoc, onDeleteDoc, onEdit, onCancelEdit }: DocsViewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => Object.fromEntries(DOC_TYPES.map(t => [t.id, true])))
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({})
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

  const toggleSection = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleDir = (dirPath: string) => setExpandedDirs(prev => ({ ...prev, [dirPath]: !prev[dirPath] }))

  const renderSubTree = (nodes: DocNode[], depth = 0): React.ReactNode => {
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

  const typeSections = DOC_TYPES.map(dt => {
    const folder = tree?.children?.find(n => n.type === 'dir' && n.name === dt.id)
    return { ...dt, children: folder?.children || [] }
  })
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
                {(() => {
                  const pathMatch = selectedDoc.path?.match(/^epics\/(.+)\.md$/)
                  if (!pathMatch) return null
                  const epicId = pathMatch[1]
                  const epic = epicMap?.[epicId]
                  if (!epic) return null
                  const linkedTasks = (allTasks || []).filter(t => t.epic === epicId)
                  if (linkedTasks.length === 0) return (
                    <div className="epic-linked-tasks">
                      <h3 style={{ color: epic.color }}>연결된 태스크</h3>
                      <p className="text-muted" style={{ fontSize: 12 }}>이 에픽에 연결된 태스크가 없습니다</p>
                    </div>
                  )
                  const byColumn: Record<string, Task[]> = {}
                  for (const t of linkedTasks) {
                    const col = t._column || 'unknown'
                    if (!byColumn[col]) byColumn[col] = []
                    byColumn[col].push(t)
                  }
                  const colOrder = ['in-progress', 'todo', 'backlog', 'waiting', 'done']
                  return (
                    <div className="epic-linked-tasks">
                      <h3 style={{ color: epic.color }}>연결된 태스크 ({linkedTasks.length})</h3>
                      {colOrder.filter(c => byColumn[c]).map(col => (
                        <div key={col} className="epic-task-group">
                          <div className="epic-task-col-label">{col}</div>
                          {byColumn[col].map(t => {
                            const checkTotal = (t.content?.match(/^\s*- \[[ x]\]/gm) || []).length
                            const checkDone = (t.content?.match(/^\s*- \[x\]/gm) || []).length
                            return (
                              <div key={t.id} className="epic-task-item">
                                <span className="epic-task-title">{t.title}</span>
                                {checkTotal > 0 && <span className="epic-task-progress">{checkDone}/{checkTotal}</span>}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )
                })()}
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
