// バッチファイルの内容を検証するスクリプト
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('バッチファイル検証:\n');

let totalKanji = 0;
let totalExamples = 0;

for (let batchNum = 1; batchNum <= 16; batchNum++) {
  const batchPath = path.join(__dirname, `generated-batch-${batchNum}.json`);

  if (!fs.existsSync(batchPath)) {
    console.log(`✗ Batch ${batchNum}: ファイルが見つかりません`);
    continue;
  }

  const batchData = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  const kanjiCount = batchData.length;
  const exampleCount = batchData.reduce((sum, item) => sum + item.newExamples.length, 0);

  totalKanji += kanjiCount;
  totalExamples += exampleCount;

  console.log(`✓ Batch ${batchNum}: ${kanjiCount}漢字, ${exampleCount}例文`);

  // 各漢字が3例文を持っているか確認
  const incomplete = batchData.filter(item => item.newExamples.length !== 3);
  if (incomplete.length > 0) {
    console.log(`  警告: ${incomplete.length}漢字が3例文未満`);
    incomplete.forEach(item => {
      console.log(`    - ${item.character} (${item.kanjiId}): ${item.newExamples.length}例文`);
    });
  }
}

console.log(`\n合計: ${totalKanji}漢字, ${totalExamples}例文`);
console.log(`\n期待値: 160漢字 × 3例文 = 480例文（バッチ1-2は既存）`);
