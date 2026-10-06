export type Ln = { k: '+' | '-' | ' ' | '~'; n: number | null; t: string }

type Hk = { oldStart: number; newStart: number; lines: string[] }
type Out = { structuredPatch?: Hk[]; content?: string }

export const MAXL = 250

const ok = (c: number) => (c >= 0x20 && c <= 0x7e) || (c >= 0xa1 && c <= 0x17f)

export const san = (s: string) => {
  let o = ''
  for (const ch of s.replace(/\t/g, '  ')) o += ok(ch.codePointAt(0)!) ? ch : '·'
  return o
}

const hunks = (hs: Hk[]) => {
  const ls: Ln[] = []
  hs.forEach((h, i) => {
    if (i) ls.push({ k: '~', n: null, t: '···' })
    let on = h.oldStart, nn = h.newStart
    for (const l of h.lines) {
      const c = l[0], t = l.slice(1)
      if (c === '+') ls.push({ k: '+', n: nn++, t })
      else if (c === '-') ls.push({ k: '-', n: on++, t })
      else if (c === ' ') { ls.push({ k: ' ', n: nn++, t }); on++ }
    }
  })
  return ls
}

const clip = (ls: Ln[]) => {
  if (ls.length <= MAXL) return ls
  const fp = Math.max(0, ls.findIndex(l => l.k === '+'))
  const s = Math.max(0, Math.min(fp - 2, ls.length - MAXL))
  const cut = ls.slice(s, s + MAXL - 1)
  cut.push({ k: '~', n: null, t: `… ${ls.length - cut.length} more lines` })
  return cut
}

export function lines(out: unknown): Ln[] | null {
  if (!out || typeof out !== 'object') return null
  const o = out as Out
  const hs = Array.isArray(o.structuredPatch) ? o.structuredPatch : []
  const ls = hs.length
    ? hunks(hs)
    : typeof o.content === 'string'
      ? o.content.replace(/\n$/, '').split('\n').map((t, i): Ln => ({ k: '+', n: i + 1, t }))
      : []
  return ls.length ? clip(ls) : null
}
