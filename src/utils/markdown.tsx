import React from 'react'

export function renderInlineBoldItalic(text: string, baseKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0
  while (remaining.length > 0) {
    // Bold **...**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/)
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={`${baseKey}b${key++}`}>{boldMatch[1]}</span>)
      parts.push(<strong key={`${baseKey}b${key++}`}>{boldMatch[2]}</strong>)
      remaining = boldMatch[3]
      continue
    }
    // Italic *...*
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/)
    if (italicMatch) {
      if (italicMatch[1]) parts.push(<span key={`${baseKey}i${key++}`}>{italicMatch[1]}</span>)
      parts.push(<em key={`${baseKey}i${key++}`}>{italicMatch[2]}</em>)
      remaining = italicMatch[3]
      continue
    }
    if (remaining) parts.push(<span key={`${baseKey}t${key++}`}>{remaining}</span>)
    break
  }
  return parts.length ? parts : [remaining]
}

export function renderInline(text: string): React.ReactNode[] {
  // Process inline markdown: bold, italic, inline code
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0
  while (remaining.length > 0) {
    // Inline code `...`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/)
    if (codeMatch) {
      if (codeMatch[1]) parts.push(...renderInlineBoldItalic(codeMatch[1], key++))
      parts.push(<code key={`c${key++}`} className="md-inline-code">{codeMatch[2]}</code>)
      remaining = codeMatch[3]
      continue
    }
    parts.push(...renderInlineBoldItalic(remaining, key++))
    break
  }
  return parts
}

export function renderMarkdownLines(lines: string[]): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block ```
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <pre key={`pre${i}`} className="md-code-block">
          {lang && <div className="md-code-lang">{lang}</div>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      continue
    }

    // Table
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const parseRow = (row: string) => row.split('|').slice(1, -1).map(c => c.trim())
      const headers = parseRow(tableLines[0])
      const isSep = (row: string) => /^\|[\s\-:|]+\|$/.test(row.trim())
      const bodyStart = tableLines.length > 1 && isSep(tableLines[1]) ? 2 : 1
      const bodyRows = tableLines.slice(bodyStart).map(parseRow)
      elements.push(
        <table key={`t${i}`} className="md-table">
          <thead><tr>{headers.map((h, j) => <th key={j}>{renderInline(h)}</th>)}</tr></thead>
          <tbody>{bodyRows.map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{renderInline(cell)}</td>)}</tr>
          ))}</tbody>
        </table>
      )
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(<blockquote key={i} className="md-blockquote">{renderInline(line.slice(2))}</blockquote>)
    }
    // Headings
    else if (line.startsWith('### ')) elements.push(<h3 key={i}>{renderInline(line.slice(4))}</h3>)
    else if (line.startsWith('## ')) elements.push(<h2 key={i}>{renderInline(line.slice(3))}</h2>)
    else if (line.startsWith('# ')) elements.push(<h1 key={i}>{renderInline(line.slice(2))}</h1>)
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) elements.push(<hr key={i} className="md-hr" />)
    // List item
    else if (line.startsWith('- ')) elements.push(<div key={i} style={{ paddingLeft: 12 }}>{renderInline(line)}</div>)
    // Empty line
    else if (line.trim() === '') elements.push(<br key={i} />)
    // Normal text with inline formatting
    else elements.push(<div key={i}>{renderInline(line)}</div>)
    i++
  }
  return elements
}
