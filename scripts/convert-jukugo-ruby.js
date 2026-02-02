#!/usr/bin/env node
/**
 * 熟語ルビ変換スクリプト
 *
 * 変換: 悪魔[あくま] → 悪[あく]魔[ま]
 *
 * W3C Jukugo-ruby標準に準拠した形式に変換
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const examplesPath = join(__dirname, '../static/data/examples.json');
const backupPath = join(__dirname, 'examples-backup-jukugo.json');
const reportPath = join(__dirname, 'jukugo-conversion-report.json');

// バックアップ作成
copyFileSync(examplesPath, backupPath);
console.log(`バックアップ作成: ${backupPath}`);

const data = JSON.parse(readFileSync(examplesPath, 'utf-8'));

// ========== ヘルパー関数 ==========

// ひらがなをモーラ単位で分割
function splitIntoMora(reading) {
  const moraPattern = /([きしちにひみりぎじびぴ][ゃゅょ]|[うくすつぬふむゆるぐずぶぷ][ぃぇ]?|[あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉっゃゅょー])/g;
  return reading.match(moraPattern) || [];
}

// カタカナをひらがなに変換
function toHiragana(str) {
  return str.replace(/[\u30A1-\u30F6]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });
}

// 漢字かどうか判定
function isKanji(char) {
  const code = char.charCodeAt(0);
  return code >= 0x4E00 && code <= 0x9FFF;
}

// 熟語から漢字部分を抽出
function extractKanji(word) {
  return [...word].filter(isKanji);
}

// ========== 音読み分割ロジック ==========

// 音読み熟語を分割（1漢字=1-2モーラの規則を利用）
function splitOnReading(kanjiChars, reading) {
  const hiragana = toHiragana(reading);
  const mora = splitIntoMora(hiragana);
  const kanjiCount = kanjiChars.length;

  if (mora.length === 0 || kanjiCount === 0) {
    return null;
  }

  // 均等分割を試みる
  if (mora.length % kanjiCount === 0) {
    const moraPerKanji = mora.length / kanjiCount;
    const result = [];
    for (let i = 0; i < kanjiCount; i++) {
      const kanjiReading = mora.slice(i * moraPerKanji, (i + 1) * moraPerKanji).join('');
      result.push({ kanji: kanjiChars[i], reading: kanjiReading });
    }
    return result;
  }

  // 2モーラ + 1モーラの組み合わせを試みる（例: あんき = あん + き）
  if (mora.length === kanjiCount + 1 || mora.length === kanjiCount * 2 - 1) {
    // 様々なパターンを試す
    const patterns = generatePatterns(kanjiCount, mora.length);
    for (const pattern of patterns) {
      if (isValidPattern(pattern, mora.length)) {
        const result = [];
        let moraIndex = 0;
        for (let i = 0; i < kanjiCount; i++) {
          const moraCount = pattern[i];
          const kanjiReading = mora.slice(moraIndex, moraIndex + moraCount).join('');
          result.push({ kanji: kanjiChars[i], reading: kanjiReading });
          moraIndex += moraCount;
        }
        return result;
      }
    }
  }

  return null;
}

// 分割パターンを生成（各漢字に1-2モーラ）
function generatePatterns(kanjiCount, totalMora) {
  const patterns = [];

  function generate(current, remaining, index) {
    if (index === kanjiCount) {
      if (remaining === 0) {
        patterns.push([...current]);
      }
      return;
    }

    for (let m = 1; m <= Math.min(3, remaining); m++) {
      current.push(m);
      generate(current, remaining - m, index + 1);
      current.pop();
    }
  }

  generate([], totalMora, 0);
  return patterns;
}

function isValidPattern(pattern, totalMora) {
  return pattern.reduce((sum, m) => sum + m, 0) === totalMora;
}

// ========== 訓読み分割ロジック ==========

// 訓読み熟語用の辞書（手動定義）
const kunReadingDict = {
  '悪口': ['わる', 'くち'],
  '横書': ['よこ', 'が'],
  '横書き': ['よこ', 'がき'],
  'パン屋': ['や'],
  '本屋': ['ほん', 'や'],
  '花屋': ['はな', 'や'],
  '持ち物': ['も', 'もの'],
  '取り消': ['と', 'け'],
  '取り消し': ['と', 'けし'],
  '申し出': ['もうし', 'で'],
  '申し出る': ['もうし', 'でる'],
  '受け取': ['う', 'と'],
  '受け取る': ['うけ', 'とる'],
  '待合室': ['まち', 'あい', 'しつ'],
  '歯ブラシ': ['は'],
  '寒がり': ['さむ', 'がり'],
};

// 訓読み熟語を分割
function splitKunReading(word, reading) {
  // 辞書にあれば使用
  if (kunReadingDict[word]) {
    const kanjiChars = extractKanji(word);
    const readings = kunReadingDict[word];
    if (kanjiChars.length === readings.length) {
      return kanjiChars.map((k, i) => ({ kanji: k, reading: readings[i] }));
    }
  }

  return null;
}

// ========== メイン変換ロジック ==========

function convertSentenceWithRuby(sentenceWithRuby, targetWord, reading, type) {
  // 熟語[読み] パターンを検出
  const jukugoPattern = /([\u4E00-\u9FFF]{2,})\[([^\]]+)\]/g;

  let result = sentenceWithRuby;
  let match;
  const conversions = [];

  while ((match = jukugoPattern.exec(sentenceWithRuby)) !== null) {
    const [fullMatch, kanji, rubyText] = match;
    const kanjiChars = extractKanji(kanji);

    let splitResult = null;

    // 音読みの場合
    if (type === 'on') {
      splitResult = splitOnReading(kanjiChars, rubyText);
    }

    // 訓読みまたは音読みで分割できなかった場合
    if (!splitResult) {
      splitResult = splitKunReading(kanji, rubyText);
    }

    // それでも分割できない場合、音読みルールを再試行
    if (!splitResult && type === 'kun') {
      splitResult = splitOnReading(kanjiChars, rubyText);
    }

    if (splitResult) {
      // 変換成功
      const newRuby = splitResult.map(r => `${r.kanji}[${r.reading}]`).join('');
      conversions.push({
        original: fullMatch,
        converted: newRuby,
        success: true
      });
    } else {
      // 変換失敗
      conversions.push({
        original: fullMatch,
        kanji,
        reading: rubyText,
        success: false
      });
    }
  }

  // 成功した変換を適用
  for (const conv of conversions) {
    if (conv.success) {
      result = result.replace(conv.original, conv.converted);
    }
  }

  return { result, conversions };
}

// ========== 実行 ==========

const stats = {
  total: 0,
  converted: 0,
  failed: 0,
  skipped: 0,  // 単一漢字ルビ（変換不要）
  failedList: []
};

for (const entry of data) {
  for (const ex of entry.examples) {
    stats.total++;

    const ruby = ex.sentenceWithRuby;

    // 熟語ルビがあるかチェック
    const hasJukugo = /([\u4E00-\u9FFF]{2,})\[([^\]]+)\]/.test(ruby);

    if (!hasJukugo) {
      stats.skipped++;
      continue;
    }

    const { result, conversions } = convertSentenceWithRuby(
      ruby,
      ex.targetWord,
      ex.reading,
      ex.type
    );

    const allSuccess = conversions.every(c => c.success);

    if (allSuccess && result !== ruby) {
      ex.sentenceWithRuby = result;
      stats.converted++;
    } else if (!allSuccess) {
      stats.failed++;
      for (const c of conversions) {
        if (!c.success) {
          stats.failedList.push({
            character: entry.character,
            id: ex.id,
            kanji: c.kanji,
            reading: c.reading,
            original: ruby
          });
        }
      }
    } else {
      stats.skipped++;
    }
  }
}

// 結果を保存
writeFileSync(examplesPath, JSON.stringify(data, null, 2), 'utf-8');
writeFileSync(reportPath, JSON.stringify(stats, null, 2), 'utf-8');

// 結果表示
console.log('\n=== 変換結果 ===');
console.log(`総例文数: ${stats.total}`);
console.log(`変換成功: ${stats.converted}`);
console.log(`変換失敗: ${stats.failed}`);
console.log(`変換不要: ${stats.skipped}`);
console.log(`成功率: ${((stats.converted / (stats.converted + stats.failed)) * 100).toFixed(1)}%`);

if (stats.failedList.length > 0) {
  console.log('\n=== 変換失敗リスト ===');
  stats.failedList.slice(0, 20).forEach(f => {
    console.log(`  ${f.character} | ${f.kanji}[${f.reading}]`);
  });
  if (stats.failedList.length > 20) {
    console.log(`  ... 他 ${stats.failedList.length - 20} 件`);
  }
}

console.log(`\n詳細レポート: ${reportPath}`);
