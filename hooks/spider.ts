import { hit } from './grid'
import type { Gr, Wd } from './grid'

type Lg = { fx: number; fy: number; sx: number; sy: number; tx: number; ty: number; st: number }
type Pt = { x: number; y: number; w: number }

export type Sm = {
  bx: number; by: number; vx: number; vy: number; hd: number
  pts: Pt[]; pi: number; lg: Lg[]
  hl: Map<number, number>; nc: number; done: boolean
}

export const ANG = [-35, -75, -110, -145, 35, 75, 110, 145].map(d => (d * Math.PI) / 180)
export const HIP = [1.5, 0.5, -0.5, -1.5, 1.5, 0.5, -0.5, -1.5]
export const L1 = 6
export const L2 = 6.5
export const NPAL = 7

const RCH = 9, SPD = 2.2, STP = 4, THR = 5, LEAD = 3, TURN = 0.25

const grp = (i: number) => (i % 2) ^ (i >= 4 ? 1 : 0)

const rest = (s: Sm, i: number) => {
  const a = s.hd + ANG[i]!, h = HIP[i]!
  return {
    x: s.bx + Math.cos(s.hd) * h + Math.cos(a) * RCH + s.vx * LEAD,
    y: s.by + Math.sin(s.hd) * h + Math.sin(a) * RCH + s.vy * LEAD,
  }
}

const mark = (s: Sm, wi: number) => {
  if (wi < 0 || s.hl.has(wi)) return
  s.hl.set(wi, (s.nc++ * 3 + wi) % NPAL)
}

export function start(gr: Gr): Sm {
  const cy = (w: Wd) => w.r * 4 + 2
  const ws = gr.tg.map(t => gr.w[t]!)
  const mid = gr.R * 2
  const pts: Pt[] = [
    { x: -16, y: ws.length ? cy(ws[0]!) : mid, w: -1 },
    ...gr.tg.map((t, i) => ({ x: ws[i]!.a + ws[i]!.b, y: cy(ws[i]!), w: t })),
    { x: gr.C * 2 + 18, y: ws.length ? cy(ws[ws.length - 1]!) : mid, w: -1 },
  ]
  const s: Sm = {
    bx: pts[0]!.x, by: pts[0]!.y, vx: SPD, vy: 0, hd: 0,
    pts, pi: 1, lg: [], hl: new Map(), nc: 0, done: false,
  }
  for (let i = 0; i < 8; i++) {
    const p = rest(s, i)
    s.lg.push({ fx: p.x, fy: p.y, sx: p.x, sy: p.y, tx: p.x, ty: p.y, st: -1 })
  }
  return s
}

const walk = (s: Sm) => {
  const p = s.pts[s.pi]!
  const dx = p.x - s.bx, dy = p.y - s.by, d = Math.hypot(dx, dy)
  if (d <= SPD) {
    s.bx = p.x
    s.by = p.y
    mark(s, p.w)
    if (++s.pi >= s.pts.length) s.done = true
    return
  }
  s.vx = (dx / d) * SPD
  s.vy = (dy / d) * SPD
  s.bx += s.vx
  s.by += s.vy
  let da = Math.atan2(s.vy, s.vx) - s.hd
  while (da > Math.PI) da -= 2 * Math.PI
  while (da < -Math.PI) da += 2 * Math.PI
  s.hd += da * TURN
}

const gait = (gr: Gr, s: Sm) => {
  const up = [0, 0]
  s.lg.forEach((l, i) => { if (l.st >= 0) up[grp(i)] = 1 })
  s.lg.forEach((l, i) => {
    if (l.st >= 0) {
      const t = ++l.st / STP
      l.fx = l.sx + (l.tx - l.sx) * t
      l.fy = l.sy + (l.ty - l.sy) * t
      if (l.st >= STP) {
        l.st = -1
        mark(s, hit(gr, l.fx, l.fy))
      }
      return
    }
    const q = rest(s, i)
    if (Math.hypot(q.x - l.fx, q.y - l.fy) <= THR || up[1 - grp(i)]) return
    up[grp(i)] = 1
    l.sx = l.fx
    l.sy = l.fy
    l.tx = q.x + s.vx * STP
    l.ty = q.y + s.vy * STP
    l.st = 0
  })
}

export function step(gr: Gr, s: Sm) {
  if (s.done) return
  walk(s)
  if (!s.done) gait(gr, s)
}

export function finish(gr: Gr, s: Sm) {
  for (let n = 0; !s.done && n < 20000; n++) step(gr, s)
  s.done = true
  for (const t of gr.tg) mark(s, t)
}
