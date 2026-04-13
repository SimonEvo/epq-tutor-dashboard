import { useRef } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  rows?: number
}

/**
 * Smart Markdown editor for mind maps.
 *
 * Keyboard shortcuts:
 * - Tab              : add 2 spaces at LINE START (indent whole line)
 * - Shift+Tab        : remove 2 spaces from line start (unindent)
 * - Tab (selection)  : indent every selected line
 * - Shift+Tab (sel.) : unindent every selected line
 * - Cmd/Ctrl+1       : set current line to `# ` (root node)
 * - Cmd/Ctrl+2       : set current line to `## ` (branch)
 * - Cmd/Ctrl+3       : set current line to `### ` (sub-branch)
 * - Enter after `- ` : auto-continue list; empty bullet removes itself
 */
export default function MindMapEditor({ value, onChange, rows = 14 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const getLineRange = (val: string, pos: number) => {
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1
    const lineEndRaw = val.indexOf('\n', pos)
    const lineEnd = lineEndRaw === -1 ? val.length : lineEndRaw
    return { lineStart, lineEnd }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = ref.current!
    const start = el.selectionStart
    const end = el.selectionEnd

    // ── Cmd/Ctrl + 1 / 2 / 3 — set heading level ────────────────────────
    if ((e.metaKey || e.ctrlKey) && ['1', '2', '3'].includes(e.key)) {
      e.preventDefault()
      const level = parseInt(e.key)
      const prefix = '#'.repeat(level) + ' '
      const { lineStart, lineEnd } = getLineRange(value, start)
      const line = value.slice(lineStart, lineEnd)

      // Strip any existing heading prefix, then apply new one
      const stripped = line.replace(/^#{1,6}\s*/, '')
      const oldPrefixLen = line.length - stripped.length
      const newLine = prefix + stripped

      const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd)
      onChange(next)

      // Keep cursor at same position relative to content (after prefix)
      const newCursor = lineStart + prefix.length + Math.max(0, (start - lineStart) - oldPrefixLen)
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = Math.min(newCursor, lineStart + newLine.length)
      }, 0)
      return
    }

    // ── Tab / Shift+Tab ───────────────────────────────────────────────────
    if (e.key === 'Tab') {
      e.preventDefault()

      if (start === end) {
        // Single cursor: always indent/unindent at LINE START
        const { lineStart } = getLineRange(value, start)

        if (e.shiftKey) {
          // Remove up to 2 leading spaces
          const leading = value.slice(lineStart).match(/^ */)?.[0].length ?? 0
          const remove = Math.min(leading, 2)
          if (remove > 0) {
            const next = value.slice(0, lineStart) + value.slice(lineStart + remove)
            onChange(next)
            setTimeout(() => {
              el.selectionStart = el.selectionEnd = Math.max(lineStart, start - remove)
            }, 0)
          }
        } else {
          // Add 2 spaces at line start
          const next = value.slice(0, lineStart) + '  ' + value.slice(lineStart)
          onChange(next)
          setTimeout(() => {
            el.selectionStart = el.selectionEnd = start + 2
          }, 0)
        }
      } else {
        // Multi-line selection: indent/unindent each line
        const firstLineStart = value.lastIndexOf('\n', start - 1) + 1
        const block = value.slice(firstLineStart, end)
        const lines = block.split('\n')

        let newBlock: string
        let deltaStart: number

        if (e.shiftKey) {
          newBlock = lines.map(l => l.replace(/^  /, '')).join('\n')
          deltaStart = lines[0].startsWith('  ') ? -2 : lines[0].startsWith(' ') ? -1 : 0
        } else {
          newBlock = lines.map(l => '  ' + l).join('\n')
          deltaStart = 2
        }

        const next = value.slice(0, firstLineStart) + newBlock + value.slice(end)
        onChange(next)
        setTimeout(() => {
          el.selectionStart = Math.max(firstLineStart, start + deltaStart)
          el.selectionEnd = firstLineStart + newBlock.length
        }, 0)
      }
      return
    }

    // ── Enter: auto-continue list items ──────────────────────────────────
    if (e.key === 'Enter') {
      const { lineStart } = getLineRange(value, start)
      const lineContent = value.slice(lineStart, start)
      const match = lineContent.match(/^(\s*)-\s(.*)/)
      if (!match) return

      e.preventDefault()
      const [, indent, content] = match

      if (!content.trim() && start === end) {
        // Empty bullet → remove it
        const next = value.slice(0, lineStart) + '\n' + value.slice(start)
        onChange(next)
        setTimeout(() => { el.selectionStart = el.selectionEnd = lineStart + 1 }, 0)
      } else {
        const insertion = '\n' + indent + '- '
        const next = value.slice(0, start) + insertion + value.slice(end)
        onChange(next)
        setTimeout(() => { el.selectionStart = el.selectionEnd = start + insertion.length }, 0)
      }
    }
  }

  const insertAtLineStart = (insert: string) => {
    const el = ref.current!
    const s = el.selectionStart
    const en = el.selectionEnd
    const { lineStart } = getLineRange(value, s)
    // Replace any existing heading prefix on the line, then insert
    const { lineEnd } = getLineRange(value, s)
    const line = value.slice(lineStart, lineEnd)
    const stripped = line.replace(/^#{1,6}\s*|-\s/, '')
    const newLine = insert + stripped
    const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd)
    onChange(next)
    const oldPrefixLen = line.length - stripped.length
    setTimeout(() => {
      el.selectionStart = lineStart + insert.length + Math.max(0, (s - lineStart) - oldPrefixLen)
      el.selectionEnd = lineStart + insert.length + Math.max(0, (en - lineStart) - oldPrefixLen)
    }, 0)
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-300">
      {/* Mini toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-wrap">
        {[
          { label: '# 根节点', insert: '# ', hint: '⌘1' },
          { label: '## 分支', insert: '## ', hint: '⌘2' },
          { label: '### 子分支', insert: '### ', hint: '⌘3' },
          { label: '- 要点', insert: '- ', hint: '' },
        ].map(({ label, insert, hint }) => (
          <button
            key={label}
            type="button"
            onMouseDown={e => {
              e.preventDefault()
              insertAtLineStart(insert)
            }}
            className="text-xs px-2 py-0.5 rounded font-mono text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors flex items-center gap-1"
          >
            {label}
            {hint && <span className="text-gray-300">{hint}</span>}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-300 shrink-0">Tab = 行首缩进 · Shift+Tab = 减缩进</span>
      </div>

      {/* Editor */}
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        spellCheck={false}
        className="w-full text-sm font-mono text-gray-700 bg-white px-3 py-2.5 resize-y focus:outline-none leading-relaxed"
        placeholder={'# 根节点\n\n## 分支一\n\n- 要点 A\n- 要点 B\n\n## 分支二\n\n- 要点 C'}
      />
    </div>
  )
}
