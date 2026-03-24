import { useState } from 'react'

const API = '/api'

interface DragState {
  taskId: string | null
  from: string | null
}

interface UseDragDropOptions {
  onAfterMove: () => void
  addToast: (message: string, undoAction?: () => void) => void
}

export function useDragDrop({ onAfterMove, addToast }: UseDragDropOptions) {
  const [dragState, setDragState] = useState<DragState>({ taskId: null, from: null })
  const [dragOver, setDragOver] = useState<string | null>(null)

  const onDragStart = (e: React.DragEvent, taskId: string, fromCol: string) => {
    setDragState({ taskId, from: fromCol })
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    setDragOver(colId)
  }

  const onDragLeave = () => setDragOver(null)

  const onDrop = async (e: React.DragEvent, toCol: string, status?: string) => {
    e.preventDefault()
    setDragOver(null)
    const { taskId, from } = dragState
    if (!taskId || (from === toCol && !status)) return

    const body: Record<string, string> = { taskId, from: from!, to: toCol }
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
        onAfterMove()
      })
    }
    onAfterMove()
  }

  return { dragState, dragOver, setDragOver, onDragStart, onDragOver, onDragLeave, onDrop }
}
