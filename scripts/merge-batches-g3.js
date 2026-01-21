#!/usr/bin/env node
/**
 * 3年生用 バッチマージスクリプト
 * 20バッチを結合してexamples.jsonを生成
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TOTAL_BATCHES = 20;
const examplesPath = join(__dirname, '../static/data/examples.json');
const backupPath = join(__dirname, 'examples-backup.json');
const kanjiDataPath = join(__dirname, '../static/data/kanji-g3.json');

// バックアップ作成
if (existsSync(examplesPath)) {
  copyFileSync(examplesPath, backupPath);
  console.log(`バックアップ作成: ${backupPath}`);
}

// 漢字データを読み込み
const kanjiData = JSON.parse(readFileSync(kanjiDataPath, 'utf-8'));
const kanjiMap = new Map(kanjiData.map(k => [k.id, k]));

// 既存のexamples.jsonを読み込み
let existingExamples = [];
if (existsSync(examplesPath)) {
  existingExamples = JSON.parse(readFileSync(examplesPath, 'utf-8'));
}
const existingMap = new Map(existingExamples.map(e => [e.kanjiId, e]));

// 全バッチを読み込み
const allBatches = [];
for (let i = 1; i <= TOTAL_BATCHES; i++) {
  const batchPath = join(__dirname, `generated-batch-${i}.json`);
  if (!existsSync(batchPath)) {
    console.error(`バッチファイルが見つかりません: ${batchPath}`);
    process.exit(1);
  }
  const batch = JSON.parse(readFileSync(batchPath, 'utf-8'));
  allBatches.push(...batch);
}

console.log(`読み込んだバッチデータ: ${allBatches.length} 漢字`);

// マージ処理
const mergedExamples = [];
let totalExamples = 0;
let errors = [];

for (const batchEntry of allBatches) {
  const { kanjiId, character, newExamples } = batchEntry;

  // 既存のexamplesを取得
  const existing = existingMap.get(kanjiId);
  const existingExs = existing?.examples || [];

  // 新しいexamplesをマージ
  const allExamples = [...existingExs];

  for (const newEx of newExamples) {
    // IDの重複チェック
    if (allExamples.some(e => e.id === newEx.id)) {
      // IDを更新
      const nextNum = allExamples.length + 1;
      newEx.id = `${kanjiId}-ex-${nextNum}`;
    }
    allExamples.push(newEx);
  }

  // 検証
  for (const ex of allExamples) {
    // 必須フィールドチェック
    const required = ['id', 'sentence', 'reading', 'type', 'sentenceWithRuby', 'sentenceHiragana'];
    for (const field of required) {
      if (!ex[field]) {
        errors.push(`${character} (${kanjiId}): ${ex.id} に ${field} がありません`);
      }
    }

    // typeチェック
    if (ex.type && !['kun', 'on'].includes(ex.type)) {
      errors.push(`${character} (${kanjiId}): ${ex.id} の type が不正です: ${ex.type}`);
    }

    // 漢字が含まれているかチェック
    if (ex.sentence && !ex.sentence.includes(character)) {
      // targetWordがある場合はそちらをチェック
      if (!ex.targetWord || !ex.sentence.includes(character)) {
        // sentenceWithRubyにも含まれていない場合のみエラー
        if (!ex.sentenceWithRuby || !ex.sentenceWithRuby.includes(character)) {
          errors.push(`${character} (${kanjiId}): ${ex.id} の sentence に漢字が含まれていません`);
        }
      }
    }
  }

  mergedExamples.push({
    kanjiId,
    character,
    examples: allExamples
  });

  totalExamples += allExamples.length;
}

// ソート（kanjiIdの順番）
mergedExamples.sort((a, b) => {
  const aIdx = kanjiData.findIndex(k => k.id === a.kanjiId);
  const bIdx = kanjiData.findIndex(k => k.id === b.kanjiId);
  return aIdx - bIdx;
});

// 書き込み
writeFileSync(examplesPath, JSON.stringify(mergedExamples, null, 2), 'utf-8');

// 統計表示
console.log('\n=== マージ完了 ===');
console.log(`総漢字数: ${mergedExamples.length}`);
console.log(`総例文数: ${totalExamples}`);
console.log(`平均例文数: ${(totalExamples / mergedExamples.length).toFixed(1)}`);
console.log(`出力: ${examplesPath}`);

// 例文数の分布
const distribution = {};
for (const entry of mergedExamples) {
  const count = entry.examples.length;
  distribution[count] = (distribution[count] || 0) + 1;
}
console.log('\n例文数の分布:');
for (const [count, num] of Object.entries(distribution).sort((a, b) => a[0] - b[0])) {
  console.log(`  ${count}例文: ${num}漢字`);
}

// エラー表示
if (errors.length > 0) {
  console.log(`\n⚠️ 警告: ${errors.length}件`);
  for (const error of errors.slice(0, 10)) {
    console.log(`  - ${error}`);
  }
  if (errors.length > 10) {
    console.log(`  ... 他 ${errors.length - 10} 件`);
  }
}
