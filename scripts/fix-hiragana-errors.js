// ひらがな変換のエラーを修正するスクリプト
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 修正が必要なパターン
const fixes = [
  { pattern: 'かえるる', replacement: 'かえる' },
  { pattern: '金ぎょ', replacement: 'きんぎょ' },
  { pattern: '上きょう', replacement: 'じょうきょう' },
  { pattern: 'や菜', replacement: 'やさい' }
];

// 各バッチファイルを修正
for (let batchNum = 3; batchNum <= 16; batchNum++) {
  const batchPath = path.join(__dirname, `generated-batch-${batchNum}.json`);

  if (!fs.existsSync(batchPath)) continue;

  let content = fs.readFileSync(batchPath, 'utf8');
  let modified = false;

  fixes.forEach(fix => {
    if (content.includes(fix.pattern)) {
      content = content.replace(new RegExp(fix.pattern, 'g'), fix.replacement);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(batchPath, content, 'utf8');
    console.log(`✓ Batch ${batchNum} fixed`);
  }
}

console.log('\nひらがな変換エラーを修正しました。');
