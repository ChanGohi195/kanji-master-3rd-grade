#!/usr/bin/env node
/**
 * 例文データの包括的修正スクリプト
 *
 * 修正対象：
 * - パターンA: sentenceWithRubyにルビがない（訓読み）
 * - パターンB: sentenceがひらがな、sentenceWithRubyに漢字がある
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const examplesPath = join(__dirname, '../static/data/examples.json');
const backupPath = join(__dirname, 'examples-backup-before-fix.json');

// バックアップ作成
copyFileSync(examplesPath, backupPath);
console.log(`バックアップ作成: ${backupPath}`);

const data = JSON.parse(readFileSync(examplesPath, 'utf-8'));

// ヘルパー関数
function isKanji(char) {
  const code = char.charCodeAt(0);
  return code >= 0x4E00 && code <= 0x9FFF;
}

function hasRuby(text) {
  return /\[[^\]]+\]/.test(text);
}

function getKanjiInText(text) {
  return [...text].filter(isKanji);
}

// readingから送り仮名のドットを除去して読みを取得
function getReadingBase(reading) {
  return reading.replace(/\./g, '');
}

// 訓読みの漢字+送り仮名パターンを検出して修正
// 例: "悪い" + reading "わる.い" → "悪[わる]い"
function addRubyToKunReading(sentence, character, reading) {
  // 送り仮名パターン: "漢字+ひらがな"
  const readingParts = reading.split('.');
  if (readingParts.length < 2) {
    // 送り仮名なしの場合: 漢字[読み]
    return sentence.replace(
      new RegExp(`(${character})`, 'g'),
      `$1[${reading}]`
    );
  }

  // 送り仮名ありの場合
  const kanjiReading = readingParts[0]; // 漢字部分の読み
  const okurigana = readingParts.slice(1).join(''); // 送り仮名

  // パターン: 漢字+送り仮名 を 漢字[読み]+送り仮名 に変換
  // 例: "悪い" → "悪[わる]い", "悪く" → "悪[わる]く"
  const regex = new RegExp(`(${character})(${okurigana}|[ぁ-んー]+)`, 'g');

  return sentence.replace(regex, (match, kanji, okuri) => {
    return `${kanji}[${kanjiReading}]${okuri}`;
  });
}

// sentenceWithRubyからルビを除去してsentenceを生成
function removeRubyFromSentence(sentenceWithRuby) {
  return sentenceWithRuby.replace(/\[[^\]]+\]/g, '');
}

let stats = {
  patternA_fixed: 0,
  patternB_fixed: 0,
  unchanged: 0,
  errors: []
};

for (const entry of data) {
  const { character } = entry;

  for (const ex of entry.examples) {
    const sentenceKanji = getKanjiInText(ex.sentence);
    const rubyText = ex.sentenceWithRuby.replace(/\[[^\]]+\]/g, '');
    const rubyKanji = getKanjiInText(rubyText);
    const hasRubyInSentence = hasRuby(ex.sentenceWithRuby);

    // パターンA: sentenceに漢字があるのにsentenceWithRubyにルビがない
    if (sentenceKanji.length > 0 && !hasRubyInSentence) {
      try {
        // 訓読みの場合、ルビを追加
        const fixed = addRubyToKunReading(ex.sentenceWithRuby, character, ex.reading);
        if (fixed !== ex.sentenceWithRuby && hasRuby(fixed)) {
          ex.sentenceWithRuby = fixed;
          stats.patternA_fixed++;
        } else {
          // 単純に漢字[読み]を追加
          const simpleReading = getReadingBase(ex.reading);
          ex.sentenceWithRuby = ex.sentence.replace(
            character,
            `${character}[${simpleReading}]`
          );
          if (hasRuby(ex.sentenceWithRuby)) {
            stats.patternA_fixed++;
          } else {
            stats.errors.push(`${character} ${ex.id}: ルビ追加失敗`);
          }
        }
      } catch (e) {
        stats.errors.push(`${character} ${ex.id}: ${e.message}`);
      }
    }
    // パターンB: sentenceがひらがな、sentenceWithRubyに漢字+ルビ
    else if (sentenceKanji.length === 0 && rubyKanji.length > 0 && hasRubyInSentence) {
      // sentenceWithRubyからルビを除去したものをsentenceに設定
      const newSentence = removeRubyFromSentence(ex.sentenceWithRuby);
      if (newSentence !== ex.sentence) {
        ex.sentence = newSentence;
        stats.patternB_fixed++;
      } else {
        stats.unchanged++;
      }
    }
    else {
      stats.unchanged++;
    }
  }
}

// 保存
writeFileSync(examplesPath, JSON.stringify(data, null, 2), 'utf-8');

console.log('\n=== 修正結果 ===');
console.log(`パターンA修正（ルビ追加）: ${stats.patternA_fixed}件`);
console.log(`パターンB修正（sentence更新）: ${stats.patternB_fixed}件`);
console.log(`変更なし: ${stats.unchanged}件`);

if (stats.errors.length > 0) {
  console.log(`\nエラー: ${stats.errors.length}件`);
  stats.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
}

console.log(`\n出力: ${examplesPath}`);
