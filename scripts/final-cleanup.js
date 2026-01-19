// 最終クリーンアップスクリプト
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 修正パターン
const fixes = [
  { pattern: 'はれるれる', replacement: 'はれる' },
  { pattern: 'はれれの', replacement: 'はれの' },
  { pattern: 'なるる', replacement: 'なる' },
  { pattern: 'くるる', replacement: 'くる' },
  { pattern: 'する。する', replacement: 'する' },
  { pattern: '日。日', replacement: '日' }
];

let totalFixed = 0;

for (let batchNum = 3; batchNum <= 16; batchNum++) {
  const batchPath = path.join(__dirname, `generated-batch-${batchNum}.json`);

  if (!fs.existsSync(batchPath)) continue;

  let content = fs.readFileSync(batchPath, 'utf8');
  let modified = false;

  fixes.forEach(fix => {
    const count = (content.match(new RegExp(fix.pattern, 'g')) || []).length;
    if (count > 0) {
      content = content.replace(new RegExp(fix.pattern, 'g'), fix.replacement);
      modified = true;
      totalFixed += count;
    }
  });

  if (modified) {
    fs.writeFileSync(batchPath, content, 'utf8');
    console.log(`✓ Batch ${batchNum} cleaned`);
  }
}

console.log(`\n合計 ${totalFixed} 箇所を修正しました`);
