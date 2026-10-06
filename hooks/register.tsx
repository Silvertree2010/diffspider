import type { EngineInterface, Register } from 'claude-code'

import { lines } from './diff'
import type { Ln } from './diff'
import { build } from './grid'
import type { Gr } from './grid'
import { frame } from './paint'
import { finish, start, step } from './spider'
import type { Sm } from './spider'

type Rn = { gr: Gr; s: Sm; cl: string; tm?: { cancel: () => void } }
type Out = { filePath?: string; type?: string }

const TL = new Set(['Edit', 'Write', 'MultiEdit'])
const KEY = 'crawler'
const FPS = 33
const KEEP = 200

const cols = (n?: number) => Math.max(30, Math.min(160, (n ?? 100) - 6))
const cnt = (ls: Ln[], k: Ln['k']) => ls.reduce((n, l) => n + (l.k === k ? 1 : 0), 0)

function end($: EngineInterface, id: string, r: Rn, fr: Set<string>) {
  r.tm?.cancel()
  r.tm = undefined
  finish(r.gr, r.s)
  r.cl = frame(r.gr, r.s)
  fr.delete(id)
  $.ui.invalidate('ui.render')
}

function run($: EngineInterface, id: string, r: Rn, fr: Set<string>) {
  r.tm = $.clock.every(FPS, () => {
    if (r.s.done) return
    step(r.gr, r.s)
    if (r.s.done) return end($, id, r, fr)
    r.cl = frame(r.gr, r.s)
    void $.ui.blit({ requestId: id, key: KEY, cells: r.cl }).then(x => {
      if ('deny' in x && x.deny && !r.s.done) end($, id, r, fr)
    })
  })
}

export const register: Register = on => {
  const runs = new Map<string, Rn>()
  const fr = new Set<string>()

  const trim = () => {
    for (const [id, r] of runs) {
      if (runs.size <= KEEP) break
      if (r.s.done) runs.delete(id)
    }
  }

  on('tool.call', ($, e, next) => {
    if (TL.has(e.tool) && e.tool_use_id) fr.add(e.tool_use_id)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'ToolGroup' }, ($, e, next) => {
    if (e.props.isExpanded) return next(e)
    const hot = e.props.calls.some(c => c.tool_use_id && fr.has(c.tool_use_id) && !runs.get(c.tool_use_id)?.s.done)
    return next(hot ? { ...e, props: { ...e.props, isExpanded: true } } : e)
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const p = e.props
    if (e.surface !== 'terminal' || p.isRunning || p.isErrored || p.isInterrupted || !TL.has(p.tool)) return next(e)
    const ls = lines(p.output)
    if (!ls) return next(e)
    const id = e.requestId, C = cols(e.viewport?.columns)
    let r = runs.get(id)
    if (!r || r.gr.C !== C) {
      const gr = build(ls, C), s = start(gr)
      if (r || !fr.has(id)) {
        finish(gr, s)
        fr.delete(id)
      }
      r?.tm?.cancel()
      r = { gr, s, cl: frame(gr, s) }
      runs.set(id, r)
      trim()
    }
    if (!r.s.done && !r.tm) run($, id, r, fr)
    const o = p.output as Out
    const vb = p.tool === 'Write' && o.type === 'create' ? 'Create' : 'Update'
    const { Box, Text, Raster } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold>{vb}</Text>({o.filePath ?? ''})
        </Text>
        <Text dimColor>
          {'  ⎿  '}crawled {cnt(ls, '+')} added, {cnt(ls, '-')} removed
        </Text>
        <Raster key={KEY} columns={r.gr.C} rows={r.gr.R} cells={r.cl} />
      </Box>
    )
  })
}
