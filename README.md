<p align="center">
  <img src="assets/spider.gif" alt="A braille spider crawling over a line of code" width="560">
</p>

<h1 align="center">diffspider</h1>

<p align="center">
  A tiny spider crawls over every diff Claude Code writes and marks the changed words.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-plugin-d97757" alt="Claude Code plugin">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="Zero dependencies">
</p>

## What it does

Whenever Claude runs `Edit` or `Write`, diffspider replaces the plain diff with its own view.
A braille spider walks in from the left, steps from word to word on the added lines, and every
word a foot lands on lights up. When it is done it leaves to the right and the marks stay.

<p align="center">
  <img src="assets/demo.gif" alt="diffspider crawling over an Edit diff" width="690">
</p>

After the crawl:

<p align="center">
  <img src="assets/after.png" alt="Diff with highlighted words after the spider left" width="690">
</p>

## Install

Type this at the Claude Code prompt:

```
/plugin install diffspider --marketplace Silvertree2010/diffspider
```

Answer `y` to add the marketplace and press Enter to install it for your user. It is active right away, no restart needed.

## Good to know

- Terminal only. Other surfaces (desktop, VS Code) keep the normal diff.
- Collapsed tool groups unfold while a spider is crawling and fold back when it is done.
- Diffs show up to 250 lines.
- Edits from earlier turns skip the animation and show the final marks.
- Built on the Claude Code function hooks API, which is still in early access and may change between releases.

## How it works

| File | Job |
| --- | --- |
| `hooks/diff.ts` | turns the tool result into numbered diff lines |
| `hooks/grid.ts` | lays out the text cells and picks the words to visit |
| `hooks/spider.ts` | body path, gait and steps |
| `hooks/paint.ts` | two-bone IK legs and braille body, packed into a `Raster` |
| `hooks/register.tsx` | the hooks: `tool.call`, `ui.render` for `ToolUse` and `ToolGroup` |

Each leg has a resting spot next to the body. A foot stays planted until it drifts too far from that spot, then it steps ahead. The legs move in two alternating groups, so four feet are always on the ground.

## Develop

```
claude --plugin-dir ./diffspider
claude plugin validate ./diffspider
claude plugin test ./diffspider
```

## License

[MIT](LICENSE)
