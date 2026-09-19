/**
 * 本地「照抄工作流跑一遍」：解析 .github/workflows/check.yml，按顺序执行每个 run 步骤。
 * 这样能发现"我手写等价步骤"掩盖掉的问题（路径、heredoc 缩进等）。
 *   node tools/local-ci.mjs
 *
 * 用途：推之前先在本地把 CI 的每一步跑一遍，避免"首次推送即红叉"。
 * 只执行 run: 步骤（uses: 的检出/装 Node 在本地不需要）。
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(repoRoot);

const yamlPath = path.join(repoRoot, '.github/workflows/check.yml');
const yamlText = fs.readFileSync(yamlPath, 'utf8');

// 不引第三方 YAML：这个工作流结构简单，按缩进取出每个 run: | 块即可
const lines = yamlText.split('\n');
const steps = [];
for (let i = 0; i < lines.length; i++) {
  const m = /^(\s*)- name: (.+)$/.exec(lines[i]);
  if (!m) continue;
  const indent = m[1].length;
  const name = m[2].trim();
  let run = null;
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j];
    if (/^\s*- (name|uses):/.test(l) && l.search(/\S/) <= indent + 2) break;
    const rm = /^\s*run: \|\s*$/.exec(l);
    if (rm) {
      const bodyIndent = (lines[j + 1].match(/^\s*/) || [''])[0].length;
      const body = [];
      for (let k = j + 1; k < lines.length; k++) {
        if (lines[k].trim() === '') { body.push(''); continue; }
        const ind = (lines[k].match(/^\s*/) || [''])[0].length;
        if (ind < bodyIndent) break;
        body.push(lines[k].slice(bodyIndent));
      }
      run = body.join('\n');
      break;
    }
  }
  if (run) steps.push({ name, run });
}

console.log(`从工作流解析出 ${steps.length} 个 run 步骤\n`);
for (const [i, step] of steps.entries()) {
  console.log(`\n===== [${i + 1}/${steps.length}] ${step.name} =====`);
  try {
    execSync(step.run, {
      shell: process.env.SHELL || (process.platform === 'win32'
        ? 'C:/Program Files/Git/bin/bash.exe'   // Windows 上用 Git Bash
        : '/bin/bash'),
      stdio: 'inherit',
      env: { ...process.env, MSYS_NO_PATHCONV: '1' }
    });
  } catch (e) {
    console.error(`\n✗ 步骤失败：${step.name}`);
    process.exit(1);
  }
}
console.log('\n✓ 工作流全部步骤本地复现通过');
