import React from 'react'

interface MarkdownRendererProps {
  content: string
  onCitationClick?: (citation: string) => void
  className?: string
}

interface ListItem {
  text: string
  level: number
}

type BlockToken =
  | { type: 'heading'; level: number; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' }
  | { type: 'math'; equation: string }
  | { type: 'ul'; items: ListItem[] }
  | { type: 'ol'; start: number; items: ListItem[] }
  | { type: 'lead'; text: string }
  | { type: 'p'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }

export function MarkdownRenderer({ content, onCitationClick, className = '' }: MarkdownRendererProps) {
  const blocks = React.useMemo(() => parseBlocks(content), [content])

  return (
    <div className={`prose-answer space-y-3 ${className}`}>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} onCitationClick={onCitationClick} />
      ))}
    </div>
  )
}

function parseBlocks(markdown: string): BlockToken[] {
  if (!markdown) return []
  const lines = markdown.split(/\r?\n/)
  const blocks: BlockToken[] = []
  let i = 0

  while (i < lines.length) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    // 1. Empty lines
    if (!trimmed) {
      i++
      continue
    }

    // 2. Fenced Code Blocks (```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim()
      i++
      const codeLines: string[] = []
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // skip closing ```
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') })
      continue
    }

    // 2b. Block Math ($$ ... $$)
    if (trimmed.startsWith('$$')) {
      if (trimmed.endsWith('$$') && trimmed.length > 2) {
        blocks.push({ type: 'math', equation: trimmed.slice(2, -2).trim() })
        i++
        continue
      }
      i++
      const mathLines: string[] = []
      while (i < lines.length && !lines[i].trim().endsWith('$$')) {
        mathLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // skip closing $$
      blocks.push({ type: 'math', equation: mathLines.join('\n').trim() })
      continue
    }

    // 3. Headings (# to ######)
    const headingMatch = rawLine.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      })
      i++
      continue
    }

    // 4. Horizontal Rule (---, ***, ___)
    if (/^(?:---|\*\*\*|___)\s*$/.test(trimmed)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // 5. Blockquote (> ...)
    if (rawLine.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() && quoteLines.length > 0 && !lines[i].startsWith('#') && !lines[i].trim().startsWith('```')))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n').trim() })
      continue
    }

    // 6. Tables (| col | col |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && lines[i + 1]?.trim().startsWith('|') && lines[i + 1]?.includes('---')) {
      const headerCells = trimmed
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim())
      i += 2 // skip header and delimiter row
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        rows.push(
          lines[i]
            .trim()
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        )
        i++
      }
      blocks.push({ type: 'table', headers: headerCells, rows })
      continue
    }

    // 7. Unordered Lists (*, -, +, •)
    const ulMatch = rawLine.match(/^(\s*)(?:[\*\-\+]|\•)\s+(.+)$/)
    if (ulMatch) {
      const items: ListItem[] = []
      while (i < lines.length) {
        const line = lines[i]
        const m = line.match(/^(\s*)(?:[\*\-\+]|\•)\s+(.+)$/)
        if (m) {
          const indent = m[1].length
          items.push({ level: indent >= 4 ? 2 : indent >= 2 ? 1 : 0, text: m[2].trim() })
          i++
        } else if (line.trim() && !line.match(/^(?:#{1,6}|\d+[\.\)])\s/) && items.length > 0) {
          // Continuation of previous item
          items[items.length - 1].text += ' ' + line.trim()
          i++
        } else {
          break
        }
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // 8. Ordered Lists (1. , 2. )
    const olMatch = rawLine.match(/^(\s*)(\d+)[\.\)]\s+(.+)$/)
    if (olMatch) {
      const startNum = parseInt(olMatch[2], 10) || 1
      const items: ListItem[] = []
      while (i < lines.length) {
        const line = lines[i]
        const m = line.match(/^(\s*)(\d+)[\.\)]\s+(.+)$/)
        if (m) {
          const indent = m[1].length
          items.push({ level: indent >= 4 ? 2 : indent >= 2 ? 1 : 0, text: m[3].trim() })
          i++
        } else if (line.trim() && !line.match(/^(?:#{1,6}|[\*\-\+])\s/) && items.length > 0) {
          items[items.length - 1].text += ' ' + line.trim()
          i++
        } else {
          break
        }
      }
      blocks.push({ type: 'ol', start: startNum, items })
      continue
    }

    // 9. Lead-in / section intro lines (e.g. lines ending with ':' introducing points)
    if (trimmed.endsWith(':') && trimmed.length < 120 && !trimmed.includes('. ')) {
      blocks.push({ type: 'lead', text: trimmed })
      i++
      continue
    }

    // 10. Normal Paragraphs (group consecutive non-empty lines)
    const pLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].match(/^(?:#{1,6}|>|[\*\-\+]|\•|\d+[\.\)])\s/) &&
      !lines[i].trim().endsWith(':')
    ) {
      pLines.push(lines[i].trim())
      i++
    }
    if (pLines.length > 0) {
      blocks.push({ type: 'p', text: pLines.join(' ') })
    } else {
      // Fallback single line increment if none matched
      blocks.push({ type: 'p', text: trimmed })
      i++
    }
  }

  return blocks
}

function BlockView({
  block,
  onCitationClick,
}: {
  block: BlockToken
  onCitationClick?: (citation: string) => void
}) {
  switch (block.type) {
    case 'heading': {
      const content = renderInline(block.text, onCitationClick)
      if (block.level === 1) return <h1 className="text-[21px] font-bold text-ink mt-6 mb-3 tracking-tight">{content}</h1>
      if (block.level === 2) return <h2 className="text-[18px] font-semibold text-ink mt-5 mb-2.5 tracking-tight">{content}</h2>
      if (block.level === 3) return <h3 className="text-[16px] font-semibold text-ink mt-4 mb-2 tracking-tight">{content}</h3>
      if (block.level === 4) return <h4 className="text-[14.5px] font-semibold text-ink mt-3 mb-1.5">{content}</h4>
      return <h5 className="text-[14px] font-semibold text-ink mt-2 mb-1">{content}</h5>
    }

    case 'lead':
      return (
        <p className="font-semibold text-ink text-[15px] pt-2 pb-1 tracking-tight">
          {renderInline(block.text, onCitationClick)}
        </p>
      )

    case 'p':
      return (
        <p className="text-[14.5px] leading-[1.7] text-ink/95 my-2.5">
          {renderInline(block.text, onCitationClick)}
        </p>
      )

    case 'ul':
      return (
        <ul className="my-2.5 space-y-2 pl-5 list-disc marker:text-accent/80 text-[14.5px] leading-[1.65]">
          {block.items.map((item, idx) => (
            <li
              key={idx}
              className={`pl-1.5 ${
                item.level === 1
                  ? 'ml-4 list-[circle] marker:text-muted'
                  : item.level >= 2
                  ? 'ml-8 list-[square] marker:text-muted'
                  : ''
              }`}
            >
              {renderInline(item.text, onCitationClick)}
            </li>
          ))}
        </ul>
      )

    case 'ol':
      return (
        <ol
          start={block.start}
          className="my-2.5 space-y-2 pl-5 list-decimal marker:text-muted marker:font-medium text-[14.5px] leading-[1.65]"
        >
          {block.items.map((item, idx) => (
            <li
              key={idx}
              className={`pl-1.5 ${
                item.level === 1
                  ? 'ml-4 list-[lower-alpha]'
                  : item.level >= 2
                  ? 'ml-8 list-[lower-roman]'
                  : ''
              }`}
            >
              {renderInline(item.text, onCitationClick)}
            </li>
          ))}
        </ol>
      )

    case 'code':
      return (
        <div className="my-3 overflow-hidden rounded-lg border border-line bg-sunken/80">
          {block.lang && (
            <div className="flex items-center justify-between border-b border-line bg-sunken/40 px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted">
              <span>{block.lang}</span>
            </div>
          )}
          <pre className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed text-ink/90">
            <code>{block.code}</code>
          </pre>
        </div>
      )

    case 'blockquote':
      return (
        <blockquote className="my-3 border-l-2 border-accent/70 bg-accent-soft/20 py-2 pl-4 pr-3 text-[14px] italic text-muted rounded-r-md">
          {renderInline(block.text, onCitationClick)}
        </blockquote>
      )

    case 'hr':
      return <hr className="my-5 border-line" />

    case 'math':
      return (
        <div className="my-3 overflow-x-auto rounded-lg border border-line bg-sunken/40 px-4 py-3 text-center text-ink shadow-sm">
          {renderMath(block.equation, true)}
        </div>
      )

    case 'table':
      return (
        <div className="my-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-left text-[13.5px]">
            {block.headers.length > 0 && (
              <thead className="bg-sunken border-b border-line">
                <tr>
                  {block.headers.map((h, hi) => (
                    <th key={hi} className="px-3.5 py-2 font-semibold text-ink">
                      {renderInline(h, onCitationClick)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-line/60 last:border-b-0 hover:bg-sunken/30">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3.5 py-2 text-ink/90">
                      {renderInline(cell, onCitationClick)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    default:
      return null
  }
}

const GREEK_AND_SYMBOLS: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  Gamma: 'Γ',
  delta: 'δ',
  Delta: 'Δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'θ',
  Theta: 'Θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  Lambda: 'Λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  Xi: 'Ξ',
  pi: 'π',
  Pi: 'Π',
  rho: 'ρ',
  sigma: 'σ',
  Sigma: 'Σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  varphi: 'φ',
  Phi: 'Φ',
  chi: 'χ',
  psi: 'ψ',
  Psi: 'Ψ',
  omega: 'ω',
  Omega: 'Ω',
  times: '×',
  cdot: '·',
  div: '÷',
  pm: '±',
  mp: '∓',
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  neq: '≠',
  approx: '≈',
  equiv: '≡',
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  sum: '∑',
  prod: '∏',
  int: '∫',
  in: '∈',
  notin: '∉',
  subset: '⊂',
  subseteq: '⊆',
  cap: '∩',
  cup: '∪',
  forall: '∀',
  exists: '∃',
  to: '→',
  rightarrow: '→',
  leftarrow: '←',
  Rightarrow: '⇒',
  Leftarrow: '⇐',
  leftrightarrow: '↔',
}

function cleanMathSymbols(text: string): string {
  return text.replace(/\\([a-zA-Z]+)/g, (_, word) => {
    return GREEK_AND_SYMBOLS[word] ?? word
  })
}

function cleanScript(s: string): string {
  if (!s) return ''
  let cleaned = s.replace(/\\([a-zA-Z]+)/g, (_, word) => GREEK_AND_SYMBOLS[word] ?? word)
  // remove escaped braces: \{ and \}
  cleaned = cleaned.replace(/\\([{}])/g, '$1')
  // strip redundant outer braces: {abc} -> abc
  while (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  return cleaned
}

function parseMathAtom(s: string): { base: string; sub?: string; sup?: string } {
  let base = ''
  let sub = ''
  let sup = ''
  let str = s.trim()

  if (str.startsWith('{') && str.endsWith('}') && !str.slice(1, -1).includes('{')) {
    str = str.slice(1, -1)
  }

  let i = 0
  if (str.startsWith('\\')) {
    const m = str.match(/^\\([a-zA-Z]+)/)
    if (m) {
      base = '\\' + m[1]
      i = m[0].length
    }
  } else {
    const m = str.match(/^[a-zA-Z0-9]+/)
    if (m) {
      base = m[0]
      i = m[0].length
    }
  }

  while (i < str.length) {
    if (str[i] === '_') {
      i++
      if (str[i] === '{') {
        let depth = 1
        let j = i + 1
        while (j < str.length && depth > 0) {
          if (str[j] === '{') depth++
          else if (str[j] === '}') depth--
          j++
        }
        sub = str.slice(i + 1, j - 1)
        i = j
      } else {
        const m = str.slice(i).match(/^(\\[a-zA-Z]+|[a-zA-Z0-9])/)
        if (m) {
          sub = m[0]
          i += m[0].length
        } else {
          sub = str[i] || ''
          i++
        }
      }
    } else if (str[i] === '^') {
      i++
      if (str[i] === '{') {
        let depth = 1
        let j = i + 1
        while (j < str.length && depth > 0) {
          if (str[j] === '{') depth++
          else if (str[j] === '}') depth--
          j++
        }
        sup = str.slice(i + 1, j - 1)
        i = j
      } else {
        const m = str.slice(i).match(/^(\\[a-zA-Z]+|[a-zA-Z0-9])/)
        if (m) {
          sup = m[0]
          i += m[0].length
        } else {
          sup = str[i] || ''
          i++
        }
      }
    } else {
      if (!base) base = str[i]
      i++
    }
  }

  return { base, sub, sup }
}

function renderMath(raw: string, isBlock = false): React.ReactNode {
  if (!raw) return null
  const clean = raw.trim()

  // 1. Fractions: \frac{num}{den}
  const fracRegex = /\\frac\{([^{}]+)\}\{([^{}]+)\}/g
  if (fracRegex.test(clean)) {
    const parts: React.ReactNode[] = []
    let last = 0
    let m: RegExpExecArray | null
    fracRegex.lastIndex = 0
    while ((m = fracRegex.exec(clean)) !== null) {
      if (m.index > last) {
        parts.push(renderMath(clean.substring(last, m.index)))
      }
      const num = m[1]
      const den = m[2]
      parts.push(
        <span key={m.index} className="inline-flex flex-col items-center align-middle mx-1 text-[0.88em] leading-tight">
          <span className="border-b border-ink/70 px-1 pb-0.5 not-italic text-center">{renderMath(num)}</span>
          <span className="px-1 pt-0.5 not-italic text-center">{renderMath(den)}</span>
        </span>
      )
      last = fracRegex.lastIndex
    }
    if (last < clean.length) {
      parts.push(renderMath(clean.substring(last)))
    }
    return <span className={isBlock ? 'text-[16px]' : 'inline-math'}>{parts}</span>
  }

  // 2. \text{...} or \mathrm{...}
  const textRegex = /\\(?:text|mathrm)\{([^{}]+)\}/g
  if (textRegex.test(clean)) {
    const parts: React.ReactNode[] = []
    let last = 0
    let m: RegExpExecArray | null
    textRegex.lastIndex = 0
    while ((m = textRegex.exec(clean)) !== null) {
      if (m.index > last) {
        parts.push(renderMath(clean.substring(last, m.index)))
      }
      parts.push(
        <span key={m.index} className="font-sans not-italic">
          {m[1]}
        </span>
      )
      last = textRegex.lastIndex
    }
    if (last < clean.length) {
      parts.push(renderMath(clean.substring(last)))
    }
    return <span className={isBlock ? 'text-[16px]' : 'inline-math'}>{parts}</span>
  }

  // 3. Atom-based tokenization for subscripts, superscripts, identifiers, and symbols
  const tokenRegex = /(\\[a-zA-Z]+|[a-zA-Z0-9]+(?:_(?:\{[^{}]*\}|\\[a-zA-Z]+|[a-zA-Z0-9])|\^(?:\{[^{}]*\}|\\[a-zA-Z]+|[a-zA-Z0-9]))+|[a-zA-Z0-9]+|[^\s\w\\]+|\s+)/g
  const atoms: React.ReactNode[] = []
  let match: RegExpExecArray | null
  let idx = 0

  while ((match = tokenRegex.exec(clean)) !== null) {
    const t = match[0]
    if (/^\s+$/.test(t)) {
      atoms.push(' ')
      continue
    }

    if (t.includes('_') || t.includes('^')) {
      const { base, sub, sup } = parseMathAtom(t)
      const cleanBase = cleanMathSymbols(base)
      const cleanSub = sub ? cleanScript(sub) : ''
      const cleanSup = sup ? cleanScript(sup) : ''

      atoms.push(
        <span key={idx++} className="inline-flex items-baseline font-serif italic text-ink font-medium">
          {cleanBase && <span>{cleanBase}</span>}
          {cleanSub && (
            <sub className="font-sans not-italic text-[0.75em] font-normal align-baseline relative -bottom-[0.2em] text-ink/90">
              {cleanSub}
            </sub>
          )}
          {cleanSup && (
            <sup className="font-sans not-italic text-[0.75em] font-normal align-baseline relative -top-[0.38em] text-ink/90">
              {cleanSup}
            </sup>
          )}
        </span>
      )
    } else if (t.startsWith('\\')) {
      atoms.push(
        <span key={idx++} className="font-serif not-italic">
          {cleanMathSymbols(t)}
        </span>
      )
    } else if (/^[a-zA-Z]$/.test(t)) {
      atoms.push(
        <span key={idx++} className="font-serif italic">
          {t}
        </span>
      )
    } else {
      atoms.push(
        <span key={idx++} className="not-italic">
          {t}
        </span>
      )
    }
  }

  return (
    <span className={isBlock ? 'font-serif text-[16px] text-ink' : 'inline-math'}>
      {atoms.length > 0 ? atoms : cleanMathSymbols(clean)}
    </span>
  )
}

/**
 * Parses inline formatting:
 * - Math: $...$ or $$...$$
 * - Bold: **text**
 * - Italic: *text* or _text_
 * - Code: `code`
 * - Citations: [S1], [S2] or [doc_chunk...]
 */
function renderInline(text: string, onCitationClick?: (c: string) => void): React.ReactNode[] {
  if (!text) return []

  // Pre-normalize awkward spacing before punctuation, inside parentheses, and hyphenated suffixes
  const normalizedText = text
    .replace(/\s+([,.:;?!])/g, '$1')
    .replace(/\(\s+(\$[^$]+\$)\s+\)/g, '($1)')
    .replace(/(\$[a-zA-Z0-9_\\^{}]+\$)\s+(-(?:th|st|nd|rd)\b)/gi, '$1$2')

  // Tokenize using regex covering code, math, bold, italic, and citations
  const regex = /(`[^`]+`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\*\*(?:[^*]|\*(?!\*))+\*\*|\*(?:[^*])+\*|__(?:[^_]|_(?!_))+__|\[(?:S\d+|[a-zA-Z0-9_\-\.\s]+)\])/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(normalizedText)) !== null) {
    if (match.index > lastIndex) {
      parts.push(normalizedText.substring(lastIndex, match.index))
    }

    const token = match[0]
    if (token.startsWith('`') && token.endsWith('`')) {
      const inner = token.slice(1, -1)
      parts.push(
        <code
          key={match.index}
          className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[13px] text-accent border border-line/70"
        >
          {inner}
        </code>
      )
    } else if (token.startsWith('$$') && token.endsWith('$$')) {
      const equation = token.slice(2, -2).trim()
      parts.push(
        <span
          key={match.index}
          className="inline-flex items-center rounded border border-line bg-sunken/40 px-2 py-0.5 mx-1 font-serif text-[15px]"
        >
          {renderMath(equation, true)}
        </span>
      )
    } else if (token.startsWith('$') && token.endsWith('$')) {
      const mathText = token.slice(1, -1).trim()
      parts.push(
        <React.Fragment key={match.index}>
          {renderMath(mathText, false)}
        </React.Fragment>
      )
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      const inner = token.slice(2, -2)
      parts.push(
        <strong key={match.index} className="font-semibold text-ink">
          {renderInline(inner, onCitationClick)}
        </strong>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const inner = token.slice(1, -1)
      parts.push(
        <em key={match.index} className="italic text-ink/90">
          {renderInline(inner, onCitationClick)}
        </em>
      )
    } else if (token.startsWith('[') && token.endsWith(']')) {
      const label = token.slice(1, -1).trim()
      if (/^S\d+$/.test(label)) {
        parts.push(
          <button
            key={match.index}
            type="button"
            onClick={() => onCitationClick?.(label)}
            className="inline-flex items-center rounded bg-accent-soft px-1.5 py-px text-[11.5px] font-medium text-accent hover:opacity-80 transition-opacity mx-0.5 align-baseline cursor-pointer"
            title={`View source ${label}`}
          >
            {label}
          </button>
        )
      } else {
        parts.push(
          <span
            key={match.index}
            className="inline-flex items-center rounded bg-sunken px-1.5 py-px text-[11px] font-mono text-muted border border-line/60 mx-0.5 align-baseline"
          >
            {label}
          </span>
        )
      }
    } else {
      parts.push(token)
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}
