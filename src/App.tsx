import React from 'react'
import { usePlankData } from './hooks/usePlankData'
import { useToasts } from './hooks/useToasts'
import { useDragDrop } from './hooks/useDragDrop'
import LabelFilterBar from './features/board/LabelFilterBar'
import EpicProgressBar from './features/board/EpicProgressBar'
import Column from './features/board/Column'
import TaskDetail from './features/task/TaskDetail'
import CreateModal from './features/task/CreateModal'
import SettingsModal from './features/settings/SettingsModal'
import DocsView from './features/docs/DocsView'
import SearchModal from './features/search/SearchModal'
import { useSearch } from './hooks/useSearch'

const API = '/api'

function App() {
  const {
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
    setSelectedTask,
    setSelectedDoc,
    setDocEditing,
    setActiveView,
    setShowCreate,
    setShowSettings,
    setActiveFilters,
    setExpandedZones,
    fetchData,
    fetchDocsTree,
    handleEdit,
    handleCreate,
    handleDelete,
    handleSaveConfig,
    selectDoc,
    createDoc,
    updateDoc,
    deleteDoc,
    viewDoc,
  } = usePlankData()

  const { toasts, addToast, dismissToast } = useToasts()

  const search = useSearch({
    tasks,
    config,
    modalOpen: { selectedTask, showCreate, showSettings },
    onSelectTask: (task) => setSelectedTask(task),
    onSelectDoc: (docPath) => viewDoc(docPath),
  })

  const { dragOver, setDragOver, onDragStart, onDragOver, onDragLeave, onDrop } = useDragDrop({
    onAfterMove: fetchData,
    addToast,
  })

  if (!config) return <div style={{ padding: 40, color: '#888' }}>Loading...</div>

  const columns = config.board.columns
  const labelMap = Object.fromEntries((config.labels || []).map(l => [l.id, l]))
  const priorityMap = Object.fromEntries((config.priorities || []).map(p => [p.id, p]))
  const epics = config.epics || []
  const epicMap = Object.fromEntries(epics.map(e => [e.id, e]))
  const columnMap = Object.fromEntries(columns.map(c => [c.id, c.name]))

  const allTasks = Object.entries(tasks).flatMap(([col, list]) =>
    list.map(t => ({ ...t, _column: col }))
  )

  return (
    <>
      <header className="header">
        <h1>Plank</h1>
        <div className="header-tabs">
          <button className={`header-tab${activeView === 'board' ? ' active' : ''}`} onClick={() => setActiveView('board')}>보드</button>
          <button className={`header-tab${activeView === 'docs' ? ' active' : ''}`} onClick={() => { setActiveView('docs'); fetchDocsTree() }}>문서</button>
        </div>
        <div className="header-actions">
          <button className="btn search-trigger" onClick={() => search.open()}>
            <span className="search-trigger-text">검색</span>
            <kbd className="search-trigger-kbd">{navigator.platform?.toUpperCase().includes('MAC') ? '⌘K' : 'Ctrl+K'}</kbd>
          </button>
          <button className="btn" onClick={() => setShowSettings(true)}>설정</button>
        </div>
      </header>

      {activeView === 'board' ? (
        <>
          <LabelFilterBar
            labels={config.labels || []}
            activeFilters={activeFilters}
            onToggleFilter={(id) => setActiveFilters(prev =>
              prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
            )}
            onClearFilters={() => setActiveFilters([])}
          />
          {epics.length > 0 && (
            <EpicProgressBar
              epics={epics}
              allTasks={allTasks}
              activeFilters={activeFilters}
              onToggleFilter={(id) => setActiveFilters(prev =>
                prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
              )}
              onViewDoc={(epicId) => {
                setActiveView('docs')
                fetchDocsTree()
                fetch(`${API}/docs/epics/${epicId}.md`).then(r => r.ok ? r.json() : null).then(doc => { if (doc) setSelectedDoc(doc) })
              }}
            />
          )}
          <div className="board">
            {columns.map(col => {
              const colTasks = tasks[col.id] || []
              const filtered = activeFilters.length > 0
                ? colTasks.filter(t => (t.labels || []).some(l => activeFilters.includes(l)) || activeFilters.includes(`epic:${t.epic}`))
                : colTasks
              return (
                <Column
                  key={col.id}
                  column={col}
                  tasks={filtered}
                  labelMap={labelMap}
                  priorityMap={priorityMap}
                  epicMap={epicMap}
                  dragOver={dragOver}
                  onDragStart={onDragStart}
                  onDragOver={(e) => onDragOver(e, col.id)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, col.id)}
                  onDropWithStatus={(e, status) => onDrop(e, col.id, status)}
                  onCardClick={(task) => setSelectedTask({ ...task, _column: col.id })}
                  onAddClick={() => setShowCreate(col.id)}
                  expandedZones={expandedZones}
                  setExpandedZones={setExpandedZones}
                  setDragOver={setDragOver}
                />
              )
            })}
          </div>
        </>
      ) : (
        <DocsView
          tree={docsTree}
          selectedDoc={selectedDoc}
          editing={docEditing}
          allTasks={allTasks}
          epicMap={epicMap}
          onSelectDoc={selectDoc}
          onCreateDoc={createDoc}
          onUpdateDoc={updateDoc}
          onDeleteDoc={deleteDoc}
          onEdit={() => setDocEditing(true)}
          onCancelEdit={() => setDocEditing(false)}
          onRefresh={fetchDocsTree}
        />
      )}

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          labelMap={labelMap}
          priorityMap={priorityMap}
          epicMap={epicMap}
          labels={config.labels || []}
          priorities={config.priorities || []}
          epics={epics}
          allTasks={allTasks}
          onSave={(updates, opts) => handleEdit(selectedTask, updates, opts)}
          onDelete={() => handleDelete(selectedTask)}
          onClose={() => setSelectedTask(null)}
          onViewDoc={viewDoc}
          addToast={addToast}
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
          epics={epics}
          templates={config.templates || []}
          allTasks={allTasks}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(null)}
        />
      )}

      <SearchModal
        isOpen={search.isOpen}
        query={search.query}
        onQueryChange={search.setQuery}
        results={search.results}
        selectedIndex={search.selectedIndex}
        docsLoading={search.docsLoading}
        labelMap={labelMap}
        priorityMap={priorityMap}
        epicMap={epicMap}
        columnMap={columnMap}
        onSelect={search.handleSelect}
        onClose={search.close}
        onKeyDown={search.handleKeyDown}
      />

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className="toast">
              <span>{t.message}</span>
              {t.undoAction && (
                <button className="toast-undo" onClick={() => { t.undoAction!(); dismissToast(t.id) }}>되돌리기</button>
              )}
              <button className="toast-dismiss" onClick={() => dismissToast(t.id)}>&times;</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default App
