#!/usr/bin/env node
/**
 * 3年生用 バッチプロンプト生成スクリプト
 * 200漢字を20バッチ（各10漢字）に分割して処理
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BATCH_SIZE = 10;
const TOTAL_BATCHES = 20;

const batchNum = parseInt(process.argv[2], 10);

if (!batchNum || batchNum < 1 || batchNum > TOTAL_BATCHES) {
  console.error(`使用法: node batch-generator-g3.js <バッチ番号 1-${TOTAL_BATCHES}>`);
  console.error(`例: node batch-generator-g3.js 1`);
  process.exit(1);
}

const kanjiListPath = join(__dirname, 'kanji-list-g3.json');
const kanjiList = JSON.parse(readFileSync(kanjiListPath, 'utf-8'));

const startIdx = (batchNum - 1) * BATCH_SIZE;
const endIdx = Math.min(startIdx + BATCH_SIZE, kanjiList.length);
const batchKanji = kanjiList.slice(startIdx, endIdx);

console.log(`
以下の漢字について、小学3年生向けの例文を各5つ作成してください。

## 要件
1. 小学3年生が理解できる簡単な文
2. 各漢字の読み（音読み/訓読み）を使用
3. 対象漢字が必ず sentence に含まれる
4. sentence は対象漢字以外をひらがなで書く
5. sentenceWithRuby は対象漢字以外の漢字に[読み]を付ける
6. sentenceHiragana は全てひらがな
7. 訓読みの動詞・形容詞は送り仮名を「.」で区切る（例: "よ.む", "たか.い"）
8. 熟語を問う場合は targetWord フィールドを使用

## フォーマット
\`\`\`json
[
  {
    "kanjiId": "U+60AA",
    "character": "悪",
    "newExamples": [
      {
        "id": "U+60AA-ex-1",
        "sentence": "悪い ことは しない。",
        "reading": "わる.い",
        "type": "kun",
        "sentenceWithRuby": "悪い ことは しない。",
        "sentenceHiragana": "わるい ことは しない。"
      },
      {
        "id": "U+60AA-ex-2",
        "sentence": "悪人は にげた。",
        "reading": "アク",
        "type": "on",
        "targetWord": "悪人",
        "sentenceWithRuby": "悪人[あくにん]は にげた。",
        "sentenceHiragana": "あくにんは にげた。"
      }
    ]
  }
]
\`\`\`

## バッチ ${batchNum} 対象漢字（${startIdx + 1}-${endIdx}番目）
`);

for (const kanji of batchKanji) {
  console.log(`
### ${kanji.character} (${kanji.kanjiId})
- 画数: ${kanji.strokeCount}
- 意味: ${kanji.meanings.join(', ')}
- 読み:`);

  for (const r of kanji.availableReadings) {
    const typeLabel = r.type === 'kun' ? '訓' : '音';
    console.log(`  - ${r.reading} [${typeLabel}]`);
  }

  if (kanji.currentCount > 0) {
    console.log(`- 既存例文 (${kanji.currentCount}件):`);
    for (const ex of kanji.examples) {
      console.log(`  - ${ex.sentence} [${ex.reading}/${ex.type}]`);
    }
    console.log(`- 必要追加数: ${kanji.needCount}`);
  } else {
    console.log(`- 必要例文数: ${kanji.targetCount}`);
  }
}

console.log(`
---
JSONのみを出力してください。
出力ファイル名: generated-batch-${batchNum}.json
`);
