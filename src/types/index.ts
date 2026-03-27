export interface Label {
  id: string
  name: string
  color: string
}

export interface Priority {
  id: string
  name: string
  color: string
  description?: string
}

export interface Epic {
  id: string
  name: string
  color: string
}

export interface Column {
  id: string
  name: string
  description?: string
}

export interface Template {
  id: string
  name: string
  body: string
}

export interface Config {
  board: { columns: Column[] }
  labels?: Label[]
  priorities?: Priority[]
  epics?: Epic[]
  templates?: Template[]
  done_archive?: unknown
}

export interface Task {
  id: string
  title: string
  labels?: string[]
  priority?: string
  epic?: string
  depends_on?: string[]
  refs?: string[]
  content?: string
  status?: string
  created?: string
  // runtime fields added by the client
  _column: string
  _week?: string
  _completedAt?: string
  completed_at?: string
  _file?: string
}

export interface DocNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: DocNode[]
}

export interface FlatDoc {
  path: string
  name: string
  category: string
  content: string
}

export type SearchResult =
  | { type: 'task'; task: Task }
  | { type: 'doc'; doc: FlatDoc }
