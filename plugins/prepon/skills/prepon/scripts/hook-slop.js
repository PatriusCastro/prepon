#!/usr/bin/env node
// Prepon hook: after Claude edits a UI file, run the slop detector on that file and report findings back.
// Off unless the project opts in: create .prepon/hook-on in the project root, or set PREPON_HOOK=1.
// Wired as a PostToolUse hook in the plugin's hooks/hooks.json. Reads the hook event as JSON on stdin.
// Exit 0 = nothing to report; exit 2 = findings, written to stderr so Claude sees them and can fix or justify them.
'use strict';

const fs = require('fs');
const path = require('path');
const { scan } = require('./detect-slop.js');

const UI = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html']);

function main(raw) {
  let event;
  try { event = JSON.parse(raw); } catch { return 0; }
  const cwd = event.cwd || process.cwd();
  const on = process.env.PREPON_HOOK === '1' || fs.existsSync(path.join(cwd, '.prepon', 'hook-on'));
  if (!on) return 0;
  const file = event.tool_input && (event.tool_input.file_path || event.tool_input.path);
  if (!file || !UI.has(path.extname(file).toLowerCase()) || !fs.existsSync(file)) return 0;
  if (/[\\/](?:node_modules|dist|build|\.next|\.prepon)[\\/]/.test(file)) return 0;
  const findings = scan(file);
  if (!findings.length) return 0;
  const lines = findings.map((f) => `- ${f.rule} at line ${f.line}: ${f.match}\n  ${f.suggestion}`);
  process.stderr.write(`Prepon found ${findings.length} slop tell(s) in ${path.basename(file)}. Fix them, or keep a deliberate one with a prepon-ignore comment and a reason:\n${lines.join('\n')}\n`);
  return 2;
}

if (require.main === module) {
  let raw = '';
  process.stdin.on('data', (d) => (raw += d));
  process.stdin.on('end', () => { process.exitCode = main(raw); });
}
module.exports = { main };
