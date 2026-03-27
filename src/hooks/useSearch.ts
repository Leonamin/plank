import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { Config, Task, FlatDoc, SearchResult } from '../types'

const API = '/api'

interface ModalOpenState {
  selectedTask: unknown
  showCreate: unknown
  showSettings: boolean
}

interface UseSearchOptions {
  tasks: Record<string, Task[]>
  config: Config | null
  modalOpen: ModalOpenState
  onSelectTask: (task: Task) => void
  onSelectDoc: (docPath: string) => void
}

export function useSearch({ tasks, config, modalOpen, onSelectTask, onSelectDoc }: UseSearchOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [flatDocs, setFlatDocs] = useState<FlatDoc[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const flatDocsLoaded = useRef(false)

  // Lazy-load flatDocs when modal opens
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false

    const fetchFlatDocs = async () => {
      setDocsLoading(true)
      try {
        const res = await fetch(`${API}/docs/flat`)
        if (!cancelled && res.ok) {
          setFlatDocs(await res.json())
          flatDocsLoaded.current = true
        }
      } catch { /* ignore */ }
      if (!cancelled) setDocsLoading(false)
    }

    fetchFlatDocs()

    // Subscribe to SSE docs-change only while modal is open
    const es = new EventSource(`${API}/events`)
    es.addEventListener('docs-change', () => {
      if (!cancelled) fetchFlatDocs()
    })

    return () => {
      cancelled = true
      es.close()
    }
  }, [isOpen])

  // Flatten all tasks from all columns
  const allTasks = useMemo(() =>
    Object.entries(tasks).flatMap(([col, list]) =>
      list.map(t => ({ ...t, _column: col }))
    ),
    [tasks]
  )

  // Search results via useMemo (synchronous, no debounce needed)
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || !config) return []
    const lq = query.toLowerCase()

    const labelMap = Object.fromEntries((config.labels || []).map(l => [l.id, l.name]))
    const epicMap = Object.fromEntries((config.epics || []).map(e => [e.id, e.name]))

    const taskResults: SearchResult[] = allTasks
      .filter(t => {
        if (t.id.toLowerCase().includes(lq)) return true
        if (t.title.toLowerCase().includes(lq)) return true
        if (t.content && t.content.toLowerCase().includes(lq)) return true
        if (t.labels?.some(l => (labelMap[l] || l).toLowerCase().includes(lq))) return true
        if (t.epic && (epicMap[t.epic] || t.epic).toLowerCase().includes(lq)) return true
        return false
      })
      .slice(0, 10)
      .map(task => ({ type: 'task' as const, task }))

    const docResults: SearchResult[] = flatDocs
      .filter(d => {
        if (d.name.toLowerCase().includes(lq)) return true
        if (d.category.toLowerCase().includes(lq)) return true
        if (d.content.toLowerCase().includes(lq)) return true
        return false
      })
      .slice(0, 10)
      .map(doc => ({ type: 'doc' as const, doc }))

    return [...taskResults, ...docResults]
  }, [query, allTasks, flatDocs, config])

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          close()
          return
        }
        // Guard: don't open if another modal is active
        if (modalOpen.selectedTask || modalOpen.showCreate || modalOpen.showSettings) return
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, modalOpen.selectedTask, modalOpen.showCreate, modalOpen.showSettings])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [])

  const handleSelect = useCallback((result: SearchResult) => {
    close()
    if (result.type === 'task') {
      onSelectTask(result.task)
    } else {
      onSelectDoc(result.doc.path)
    }
  }, [close, onSelectTask, onSelectDoc])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % (results.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + (results.length || 1)) % (results.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }, [results, selectedIndex, handleSelect, close])

  return {
    isOpen,
    query,
    setQuery,
    selectedIndex,
    results,
    docsLoading,
    close,
    handleSelect,
    handleKeyDown,
  }
}
