import { expect, test } from 'claude-code/testing'

import { lines, MAXL } from '../hooks/diff'
import { build } from '../hooks/grid'
import { frame } from '../hooks/paint'
import { finish, start } from '../hooks/spider'

const hk = { oldStart: 1, oldLines: 1, newStart: 1, newLines: 2, lines: ['-let a = 1', '+const answer = 42', '+console.log(answer)'] }
const out = { filePath: '/tmp/a.ts', oldString: 'a', newString: 'b', originalFile: null, userModified: false, replaceAll: false, structuredPatch: [hk] }
const use = (tool: string, output: unknown, id: string) => ({
  plugin: 'diffspider', surface: 'terminal' as const, component: 'ToolUse' as const, requestId: id,
  props: { tool_use_id: id, tool, input: {}, output, isRunning: false, isErrored: false, isInterrupted: false },
})

test('parses a structured patch into numbered lines', () => {
  const ls = lines(out)!
  expect(ls.map(l => l.k).join('')).toBe('-++')
  expect(ls.map(l => l.n)).toEqual([1, 1, 2])
})

test('falls back to the content of a created file', () => {
  const ls = lines({ type: 'create', filePath: '/tmp/b.ts', content: 'a\nb\n', structuredPatch: [] })!
  expect(ls.length).toBe(2)
  expect(ls.every(l => l.k === '+')).toBe(true)
})

test('clips huge blocks at the line limit', () => {
  const big = { structuredPatch: [{ oldStart: 1, newStart: 1, lines: Array.from({ length: 400 }, (_, i) => `+line ${i}`) }] }
  const ls = lines(big)!
  expect(ls.length).toBe(MAXL)
  expect(ls[ls.length - 1]!.k).toBe('~')
})

test('the spider marks every target and leaves the grid', () => {
  const gr = build(lines(out)!, 60), s = start(gr)
  finish(gr, s)
  expect(s.done).toBe(true)
  for (const t of gr.tg) expect(s.hl.has(t)).toBe(true)
})

test('a frame packs three words per cell', () => {
  const gr = build(lines(out)!, 60), s = start(gr)
  const bytes = atob(frame(gr, s)).length
  expect(bytes).toBe(gr.C * gr.R * 12)
})

test('draws the crawler for an Edit on the terminal', async $ => {
  const m = await $.ui.mount(use('Edit', out, 't1'))
  expect(await m.find({ key: 'crawler' })).toBeDefined()
})

test('leaves other tools to the engine', async ($, on) => {
  let hit = false
  on('ui.render', ($$, e) => {
    hit = true
    const { Text } = $$.ui.resolve(e)
    return h(Text, {}, 'engine') as never
  })
  const m = await $.ui.mount(use('Bash', { stdout: 'x', stderr: '' }, 't2'))
  expect(await m.find({ key: 'crawler' })).toBeUndefined()
  expect(hit).toBe(true)
})

test('unfolds a tool group while a fresh edit crawls', async ($, on) => {
  let id = ''
  let seen: boolean | undefined
  on('tool.call', ($$, e) => {
    id = e.tool_use_id ?? ''
    return { result: out } as never
  })
  on('ui.render', ($$, e) => {
    if (e.component === 'ToolGroup') seen = e.props.isExpanded
    const { Text } = $$.ui.resolve(e)
    return h(Text, {}, 'engine') as never
  })
  await $.tool.call({ tool: 'Edit', file_path: '/tmp/a.ts', old_string: 'a', new_string: 'b' } as never)
  await $.ui.mount({
    plugin: 'diffspider', surface: 'terminal', component: 'ToolGroup', requestId: 'g1',
    props: { calls: [{ tool_use_id: id, tool: 'Edit', input: {}, isRunning: false, isErrored: false, isInterrupted: false }], isActive: true, isExpanded: false } as never,
  })
  expect(id).not.toBe('')
  expect(seen).toBe(true)
})
