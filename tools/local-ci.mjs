/**
 * 本地「照抄工作流跑一遍」：解析 .github/workflows/check.yml，按顺序执行每个 run 步骤。
 * 这样能发现"我手写等价步骤"掩盖掉的问题（路径、heredoc 缩进等）。
 *   node tools/local-ci.mjs
 *
 * 用途：推之前先在本地把 CI 的每一步跑一遍，避免"首次推送即红叉"。
 * 只执行 run: 步骤（uses: 的检出/装 Node 在本地不需要）。
 *
 * ⚠️ 解析必须两种 run 形式都认：
 *      run: |            多行块（heredoc）
 *      run: node xxx.js  单行命令
 *    曾经只认前者，导致后面 4 个步骤（产物体检 / SEO 体检 / 签名检查 / 清理）
 *    被静默丢掉，最后还打印「全部步骤本地复现通过」—— 假绿灯。
 *    现在解析完会拿 YAML 里 run: 的出现次数做核对，对不上直接报错退出。
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(repoRoot);

const yamlPath = path.join(repoRoot, '.github/workflows/check.yml');
const yamlText = fs.readFileSync(yamlPath, 'utf8');

// 不引第三方 YAML：这个工作流结构简单，按缩进取步骤即可
const lines = yamlText.split('\n');
const steps = [];
const skipped = [];

for (let i = 0; i < lines.length; i++) {
  const m = /^(\s*)- name: (.+)$/.exec(lines[i]);
  if (!m) continue;
  const indent = m[1].length;
  const name = m[2].trim();

  /* 先切出这一步的完整文本块：直到下一个同级（或更浅）的列表项为止 */
  const block = [];
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j];
    if (/^\s*- /.test(l) && l.search(/\S/) <= indent) break;
    block.push(l);
  }

  let run = null;
  for (let j = 0; j < block.length; j++) {
    const l = block[j];
    if (/^\s*run: \|\s*$/.test(l)) {
      /* 多行块：以下一行的缩进为准，去掉公共缩进 */
      const bodyIndent = (block[j + 1] || '').match(/^\s*/)[0].length;
      const body = [];
      for (let k = j + 1; k < block.length; k++) {
        if (block[k].trim() === '') { body.push(''); continue; }
        const ind = block[k].match(/^\s*/)[0].length;
        if (ind < bodyIndent) break;
        body.push(block[k].slice(bodyIndent));
      }
      run = body.join('\n');
      break;
    }
    const single = /^\s*run:\s*(\S.*)$/.exec(l);
    if (single) {
      /* 单行命令：直接取冒号后面的内容 */
      run = single[1].trim();
      break;
    }
  }

  if (run) steps.push({ name, run });
  else skipped.push(name);
}

/* 防呆：解析出的 run 步骤数必须与 YAML 里 run: 的出现次数一致，
   否则说明解析漏了（就是上面注释里那个假绿灯事故）。 */
const runCount = lines.filter(l => /^\s*run:/.test(l)).length;
if (steps.length !== runCount) {
  console.error(
    `✗ 解析异常：工作流里有 ${runCount} 个 run:，只解析出 ${steps.length} 个。\n` +
    `  已解析：${steps.map(s => s.name).join(' / ')}\n` +
    `  被跳过：${skipped.join(' / ') || '（无）'}\n` +
    '  请检查 tools/local-ci.mjs 的解析逻辑，不要带着假绿灯推代码。'
  );
  process.exit(1);
}

console.log(`从工作流解析出 ${steps.length} 个 run 步骤（跳过 ${skipped.length} 个 uses/无 run 步骤）`);
if (skipped.length) console.log(`  跳过：${skipped.join(' / ')}`);
console.log();
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
