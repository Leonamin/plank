import React, { useState, useEffect } from 'react'
import type { DocNode } from '../../types'
import { DOC_TYPES } from '../../constants'

const API = '/api'

interface DocTreePickerProps {
  onSelect: (refPath: string) => void
  selectedRefs?: string[]
}

export default function DocTreePicker({ onSelect, selectedRefs = [] }: DocTreePickerProps) {
  const [tree, setTree] = useState<DocNode | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch(`${API}/docs/tree`).then(r => r.json()).then(setTree).catch(() => {})
  }, [])

  const toggleSection = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleDir = (dirPath: string) => setExpandedDirs(prev => ({ ...prev, [dirPath]: !prev[dirPath] }))

  const renderNodes = (nodes: DocNode[], depth = 0): React.ReactNode => {
    if (!nodes) return null
    return nodes.map(node => {
      const refPath = `docs/${node.path}`
      const isSelected = selectedRefs.includes(refPath)
      return (
        <div key={node.path}>
          <div
            className={`dtp-item${node.type === 'dir' ? ' dtp-dir' : ''}${isSelected ? ' dtp-selected' : ''}`}
            style={{ paddingLeft: 8 + depth * 14 }}
            onClick={() => {
              if (node.type === 'dir') toggleDir(node.path)
              else onSelect(refPath)
            }}
          >
            <span className="dtp-icon">{node.type === 'dir' ? (expandedDirs[node.path] ? '▾' : '▸') : isSelected ? '✓' : '─'}</span>
            <span className="dtp-name">{node.name}</span>
          </div>
          {node.type === 'dir' && expandedDirs[node.path] && node.children && renderNodes(node.children, depth + 1)}
        </div>
      )
    })
  }

  if (!tree) return <div style={{ fontSize: 11, color: '#666', padding: 8 }}>문서 로딩중...</div>

  const typeSections = DOC_TYPES.map(dt => {
    const folder = tree.children?.find(n => n.type === 'dir' && n.name === dt.id)
    return { ...dt, children: folder?.children || [] }
  })

  return (
    <div className="dtp-container">
      {typeSections.map(sec => sec.children.length > 0 && (
        <div key={sec.id}>
          <div className="dtp-section" onClick={() => toggleSection(sec.id)}>
            <span>{expandedSections[sec.id] ? '▾' : '▸'} {sec.icon} {sec.label}</span>
          </div>
          {expandedSections[sec.id] && renderNodes(sec.children)}
        </div>
      ))}
      {typeSections.every(s => s.children.length === 0) && (
        <div style={{ fontSize: 11, color: '#666', padding: 8 }}>등록된 문서가 없습니다</div>
      )}
    </div>
  )
}
