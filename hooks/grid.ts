import { san } from './diff'
import type { Ln } from './diff'

export type Wd = { r: number; a: number; b: number }
export type Gr = { C: number; R: number; g: Uint32Array; f: Uint32Array; b: Uint32Array; w: Wd[]; tg: number[] }

export const DF = 0x01000000

const PAD = 2
const GW = 7
const INK = {
  gut: 0x5c6370,
  '+': { bg: 0x0f2418, mk: 0x2bff88, fg: 0xe6e6e6 },
  '-': { bg: 0x2a1216, mk: 0xff5c7a, fg: 0x8a5a5a },
  ' ': { bg: DF, mk: 0x5c6370, fg: 0x8b8f98 },
}

const pick = (w: Wd[], n: number) => {
  const big = w.flatMap((x, i) => (x.b - x.a >= 3 ? [i] : []))
  const k = Math.min(Math.max(9, Math.ceil(n / 4)), 30, big.length)
  return Array.from({ length: k }, (_, i) => big[Math.floor((i * big.length) / k)]!)
}

export function build(ls: Ln[], C: number): Gr {
  const R = Math.max(8, ls.length + PAD * 2)
  const N = C * R
  const g = new Uint32Array(N).fill(0x20), f = new Uint32Array(N).fill(DF), b = new Uint32Array(N).fill(DF)
  const w: Wd[] = []
  const put = (r: number, c: number, s: string, fg: number) => {
    let i = 0
    for (const ch of s) {
      if (c + i >= C) break
      g[r * C + c + i] = ch.codePointAt(0)!
      f[r * C + c + i] = fg
      i++
    }
  }
  ls.forEach((l, j) => {
    const r = j + PAD
    if (l.k === '~') return put(r, 2, san(l.t), INK.gut)
    const ik = INK[l.k]
    b.fill(ik.bg, r * C, r * C + C)
    put(r, 0, (l.n === null ? '' : String(l.n)).padStart(4), INK.gut)
    put(r, 5, l.k, ik.mk)
    const t = san(l.t)
    put(r, GW, t, ik.fg)
    if (l.k !== '+') return
    for (const m of t.matchAll(/[\w$]+|[^\s\w$]+/g)) {
      const a = GW + m.index!
      if (a < C) w.push({ r, a, b: Math.min(C, a + m[0].length) })
    }
  })
  return { C, R, g, f, b, w, tg: pick(w, ls.length) }
}

export const hit = (gr: Gr, x: number, y: number) => {
  const c = Math.floor(x / 2), r = Math.floor(y / 4)
  return gr.w.findIndex(w => w.r === r && c >= w.a && c < w.b)
}
