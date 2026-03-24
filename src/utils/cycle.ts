import type { Task } from '../types'

export function wouldCreateCycle(taskId: string, candidateId: string, allTasks: Task[]): boolean {
  const taskMap = Object.fromEntries(allTasks.map(t => [t.id, t]))
  const visited = new Set<string>()
  const stack = [candidateId]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === taskId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const deps = taskMap[current]?.depends_on || []
    for (const dep of deps) stack.push(dep)
  }
  return false
}
