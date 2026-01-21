#!/usr/bin/env node
/**
 * 3年生用 kanji-list.json 生成スクリプト
 * kanji-g3.json と examples.json を基に、例文生成用のリストを作成
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const kanjiPath = join(__dirname, '../static/data/kanji-g3.json');
const examplesPath = join(__dirname, '../static/data/examples.json');
const outputPath = join(__dirname, 'kanji-list-g3.json');

const kanjiData = JSON.parse(readFileSync(kanjiPath, 'utf-8'));
const examplesData = JSON.parse(readFileSync(examplesPath, 'utf-8'));

// examples.json をマップ化
const examplesMap = new Map();
for (const entry of examplesData) {
  examplesMap.set(entry.kanjiId, entry);
}

const TARGET_COUNT = 5; // 各漢字5例文

const kanjiList = kanjiData.map(kanji => {
  const existing = examplesMap.get(kanji.id);
  const examples = existing?.examples || [];
  const currentCount = examples.length;

  // 既存の読みを抽出
  const existingReadings = examples.map(ex => ({
    reading: ex.reading,
    type: ex.type
  }));

  // kanji-g3.json の読みデータから利用可能な読みを取得
  const availableReadings = [];
  if (kanji.readings.kun) {
    for (const r of kanji.readings.kun) {
      availableReadings.push({ reading: r, type: 'kun' });
    }
  }
  if (kanji.readings.on) {
    for (const r of kanji.readings.on) {
      availableReadings.push({ reading: r, type: 'on' });
    }
  }

  return {
    kanjiId: kanji.id,
    character: kanji.character,
    strokeCount: kanji.strokeCount,
    meanings: kanji.meanings,
    currentCount,
    targetCount: TARGET_COUNT,
    needCount: Math.max(0, TARGET_COUNT - currentCount),
    availableReadings,
    existingReadings,
    examples
  };
});

writeFileSync(outputPath, JSON.stringify(kanjiList, null, 2), 'utf-8');

// 統計表示
const totalKanji = kanjiList.length;
const totalExisting = kanjiList.reduce((sum, k) => sum + k.currentCount, 0);
const totalNeeded = kanjiList.reduce((sum, k) => sum + k.needCount, 0);

console.log('=== 3年生版 漢字リスト生成完了 ===');
console.log(`総漢字数: ${totalKanji}`);
console.log(`既存例文数: ${totalExisting}`);
console.log(`必要例文数: ${totalNeeded}`);
console.log(`出力: ${outputPath}`);
