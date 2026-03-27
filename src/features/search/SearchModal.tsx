import React, { useRef, useEffect } from 'react'
import type { Label, Priority, Epic, SearchResult } from '../../types'

interface SearchModalProps {
  isOpen: boolean
  query: string
  onQueryChange: (q: string) => void
  results: SearchResult[]
  selectedIndex: number
  docsLoading: boolean
  labelMap: Record<string, Label>
  priorityMap: Record<string, Priority>
  epicMap: Record<string, Epic>
  columnMap: Record<string, string>
  onSelect: (result: SearchResult) => void
  onClose: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export default function SearchModal({
  isOpen,
  query,
  onQueryChange,
  results,
  selectedIndex,
  docsLoading,
  labelMap,
  priorityMap,
  epicMap,
  columnMap,
  onSelect,
  onClose,
  onKeyDown,
}: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const taskResults = results.filter((r): r is Extract<SearchResult, { type: 'task' }> => r.type === 'task')
  const docResults = results.filter((r): r is Extract<SearchResult, { type: 'doc' }> => r.type === 'doc')

  let flatIndex = 0

  const isMac = navigator.platform.toUpperCase().includes('MAC')
  const shortcutKey = isMac ? '⌘K' : 'Ctrl+K'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal search-modal"
        onClick={e => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="태스크와 문서를 검색하세요..."
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />

        <div className="search-results">
          {docsLoading && !results.length && (
            <div className="search-loading">문서를 불러오는 중...</div>
          )}

          {!query.trim() && (
            <div className="search-empty">ID, 제목, 내용으로 태스크와 문서를 검색할 수 있습니다</div>
          )}

          {query.trim() && !results.length && !docsLoading && (
            <div className="search-empty">검색 결과 없음</div>
          )}

          {taskResults.length > 0 && (
            <>
              <div className="search-section-header">태스크</div>
              {taskResults.map(r => {
                const idx = flatIndex++
                const task = r.task
                return (
                  <div
                    key={`task-${task.id}`}
                    ref={idx === selectedIndex ? selectedRef : undefined}
                    className={`search-result-item${idx === selectedIndex ? ' selected' : ''}`}
                    onClick={() => onSelect(r)}
                  >
                    <span className="search-result-title">{task.title}</span>
                    <div className="search-meta">
                      {task._column && columnMap[task._column] && (
                        <span className="search-badge" style={{ background: '#374151', color: '#9CA3AF' }}>
                          {columnMap[task._column]}
                        </span>
                      )}
                      {task.priority && priorityMap[task.priority] && (
                        <span className="search-badge" style={{ background: priorityMap[task.priority].color + '22', color: priorityMap[task.priority].color }}>
                          {priorityMap[task.priority].name}
                        </span>
                      )}
                      {task.labels?.map(l => labelMap[l] && (
                        <span key={l} className="search-badge" style={{ background: labelMap[l].color + '22', color: labelMap[l].color }}>
                          {labelMap[l].name}
                        </span>
                      ))}
                      {task.epic && epicMap[task.epic] && (
                        <span className="search-badge" style={{ background: epicMap[task.epic].color + '22', color: epicMap[task.epic].color }}>
                          {epicMap[task.epic].name}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {docResults.length > 0 && (
            <>
              <div className="search-section-header">문서</div>
              {docResults.map(r => {
                const idx = flatIndex++
                const doc = r.doc
                return (
                  <div
                    key={`doc-${doc.path}`}
                    ref={idx === selectedIndex ? selectedRef : undefined}
                    className={`search-result-item${idx === selectedIndex ? ' selected' : ''}`}
                    onClick={() => onSelect(r)}
                  >
                    <span className="search-result-title">{doc.name}</span>
                    <div className="search-meta">
                      {doc.category && (
                        <span className="search-badge" style={{ background: '#374151', color: '#9CA3AF' }}>
                          {doc.category}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        <div className="search-footer">
          {shortcutKey} 열기 · ↑↓ 이동 · Enter 선택 · ESC 닫기
        </div>
      </div>
    </div>
  )
}
