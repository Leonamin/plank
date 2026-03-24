import { useState, useEffect, useCallback } from 'react'
import type { Config, Task, DocNode } from '../types'

const API = '/api'

export function usePlankData() {
  const [config, setConfig] = useState<Config | null>(null)
  const [tasks, setTasks] = useState<Record<string, Task[]>>({})
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [docsTree, setDocsTree] = useState<DocNode | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<{ path: string; content?: string; data?: { title?: string } } | null>(null)
  const [docEditing, setDocEditing] = useState(false)
  const [activeView, setActiveView] = useState<'board' | 'docs'>('board')
  const [showCreate, setShowCreate] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({ closed: false, hold: false })

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

    const es = new EventSource(`${API}/events`)
    es.addEventListener('task-change', () => fetchData())
    es.addEventListener('docs-change', () => fetchDocsTree())
    es.onmessage = () => fetchData()
    return () => es.close()
  }, [fetchData, fetchDocsTree])

  // --- Task CRUD ---
  const handleEdit = async (task: Task, updates: Partial<Task>, { keepOpen = false } = {}) => {
    await fetch(`${API}/tasks/${task._column}/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (keepOpen) {
      const res = await fetch(`${API}/tasks/${task._column}/${task.id}`)
      if (res.ok) setSelectedTask(await res.json())
    } else {
      setSelectedTask(null)
    }
    fetchData()
  }

  const handleCreate = async (formData: Record<string, unknown>) => {
    await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    setShowCreate(null)
    fetchData()
  }

  const handleDelete = async (task: Task) => {
    if (!confirm(`"${task.title}" 태스크를 삭제할까요?`)) return
    await fetch(`${API}/tasks/${task._column}/${task.id}`, { method: 'DELETE' })
    setSelectedTask(null)
    fetchData()
  }

  const handleSaveConfig = async (newConfig: Config) => {
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

  // --- Doc CRUD ---
  const selectDoc = async (docPath: string) => {
    const res = await fetch(`${API}/docs/${docPath}`)
    if (res.ok) setSelectedDoc(await res.json())
  }

  const createDoc = async (docPath: string, body: Record<string, unknown>) => {
    await fetch(`${API}/docs/${docPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    fetchDocsTree()
  }

  const updateDoc = async (docPath: string, body: Record<string, unknown>) => {
    await fetch(`${API}/docs/${docPath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const res = await fetch(`${API}/docs/${docPath}`)
    if (res.ok) setSelectedDoc(await res.json())
    fetchDocsTree()
  }

  const deleteDoc = async (docPath: string) => {
    if (!confirm('이 문서를 삭제할까요?')) return
    await fetch(`${API}/docs/${docPath}`, { method: 'DELETE' })
    setSelectedDoc(null)
    fetchDocsTree()
  }

  const viewDoc = async (docPath: string) => {
    setActiveView('docs')
    fetchDocsTree()
    const res = await fetch(`${API}/docs/${docPath}`)
    if (res.ok) setSelectedDoc(await res.json())
  }

  return {
    // state
    config,
    tasks,
    selectedTask,
    docsTree,
    selectedDoc,
    docEditing,
    activeView,
    showCreate,
    showSettings,
    activeFilters,
    expandedZones,
    // setters
    setSelectedTask,
    setSelectedDoc,
    setDocEditing,
    setActiveView,
    setShowCreate,
    setShowSettings,
    setActiveFilters,
    setExpandedZones,
    // data helpers
    fetchData,
    fetchDocsTree,
    // task CRUD
    handleEdit,
    handleCreate,
    handleDelete,
    handleSaveConfig,
    // doc CRUD
    selectDoc,
    createDoc,
    updateDoc,
    deleteDoc,
    viewDoc,
  }
}
