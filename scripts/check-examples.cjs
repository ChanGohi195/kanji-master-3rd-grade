/**
 * 例文データチェックスクリプト
 * examples.json の整合性を検証
 */
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../static/data/examples.json'), 'utf8'));
const kanjiData = JSON.parse(fs.readFileSync(path.join(__dirname, '../static/data/kanji-g3.json'), 'utf8'));

const errors = [];
const warnings = [];

console.log('=== 例文データチェック ===\n');

// ルビを除去してプレーンテキストに
function stripRuby(text) {
  return text.replace(/\[([^\]]+)\]/g, '');
}

// 連濁対応の読み一致チェック
function checkReadingMatch(reading, hiragana) {
  const dakuon = {
    'か':'が', 'き':'ぎ', 'く':'ぐ', 'け':'げ', 'こ':'ご',
    'さ':'ざ', 'し':'じ', 'す':'ず', 'せ':'ぜ', 'そ':'ぞ',
    'た':'だ', 'ち':'ぢ', 'つ':'づ', 'て':'で', 'と':'ど',
    'は':'ば', 'ひ':'び', 'ふ':'ぶ', 'へ':'べ', 'ほ':'ぼ'
  };

  // 送り仮名を除去
  const stem = reading.split('.')[0];

  const variants = [stem];
  if (dakuon[stem[0]]) {
    variants.push(dakuon[stem[0]] + stem.slice(1));
  }

  return variants.some(v => hiragana.includes(v));
}

// typo検出（同じ2文字以上の連続）
function hasTryo(text) {
  return /(.{2,})\1/.test(text);
}

// 1. 漢字ごとの例文数チェック
const kanjiIds = new Set(kanjiData.map(k => k.id));
const exampleKanjiIds = new Set(data.map(e => e.kanjiId));

// 足りない漢字
const missingKanji = [...kanjiIds].filter(id => !exampleKanjiIds.has(id));
if (missingKanji.length > 0) {
  errors.push(`例文がない漢字: ${missingKanji.length}件`);
}

// 各漢字の例文数
const insufficientExamples = data.filter(e => e.examples.length < 5);
if (insufficientExamples.length > 0) {
  warnings.push(`例文が5未満: ${insufficientExamples.map(e => `${e.character}(${e.examples.length})`).join(', ')}`);
}

console.log(`[INFO] 例文あり漢字数: ${data.length}`);
console.log(`[INFO] 総例文数: ${data.reduce((sum, e) => sum + e.examples.length, 0)}`);

// 2. 各例文の詳細チェック
data.forEach((kanji) => {
  kanji.examples.forEach((ex) => {
    // 2.1 対象漢字存在チェック
    if (!ex.sentence.includes(kanji.character)) {
      errors.push(`[${kanji.character}] 対象漢字なし: ${ex.id}`);
    }

    // 2.2 ルビ整合性チェック
    const rubyPlain = stripRuby(ex.sentenceWithRuby || '');
    if (rubyPlain !== ex.sentence) {
      errors.push(`[${kanji.character}] ルビ除去≠原文: ${ex.id}`);
    }

    // 2.3 読み整合性チェック
    const hiragana = ex.sentenceHiragana || '';
    if (!checkReadingMatch(ex.reading, hiragana)) {
      errors.push(`[${kanji.character}] 読み不一致: ${ex.id} (reading=${ex.reading})`);
    }

    // 2.4 送り仮名形式チェック（訓読み）
    if (ex.type === 'kun' && !ex.reading.includes('.')) {
      const verbEndings = ['る', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む', 'う'];
      const adjEndings = ['い'];
      const lastChar = ex.reading.slice(-1);
      if (verbEndings.includes(lastChar) || adjEndings.includes(lastChar)) {
        warnings.push(`[${kanji.character}] 送り仮名なし: ${ex.id} (reading=${ex.reading})`);
      }
    }

    // 2.5 targetWord整合性チェック
    if (ex.targetWord) {
      // targetWordの文字数とreadingの文字数を比較
      // 熟語2文字なら読みは3-6文字程度が妥当
      if (ex.reading.length < ex.targetWord.length) {
        warnings.push(`[${kanji.character}] targetWord読み短すぎ: ${ex.id} (${ex.targetWord} -> ${ex.reading})`);
      }
    }

    // 2.6 例文長さチェック
    if (ex.sentence.replace(/\s/g, '').length < 10) {
      warnings.push(`[${kanji.character}] 例文短い: ${ex.id} (${ex.sentence.length}文字)`);
    }

    // 2.7 typo検出
    if (hasTryo(ex.sentenceHiragana || '')) {
      warnings.push(`[${kanji.character}] typoの可能性: ${ex.id}`);
    }
  });

  // 2.8 重複例文チェック
  const sentences = kanji.examples.map(e => e.sentence);
  const duplicates = sentences.filter((s, i) => sentences.indexOf(s) !== i);
  if (duplicates.length > 0) {
    errors.push(`[${kanji.character}] 重複例文: ${duplicates.join(', ')}`);
  }
});

// 結果出力
console.log('\n=== 結果 ===');
if (errors.length > 0) {
  console.log(`\n[ERROR] ${errors.length}件`);
  errors.slice(0, 20).forEach(e => console.log(`  - ${e}`));
  if (errors.length > 20) console.log(`  ...他${errors.length - 20}件`);
}
if (warnings.length > 0) {
  console.log(`\n[WARNING] ${warnings.length}件`);
  warnings.slice(0, 20).forEach(w => console.log(`  - ${w}`));
  if (warnings.length > 20) console.log(`  ...他${warnings.length - 20}件`);
}
if (errors.length === 0 && warnings.length === 0) {
  console.log('\n全てのチェックをパスしました！');
}

process.exit(errors.length > 0 ? 1 : 0);
