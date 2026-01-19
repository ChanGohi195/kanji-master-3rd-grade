/**
 * 漢字データチェックスクリプト
 * kanji-g3.json の整合性を検証
 */
const fs = require('fs');
const path = require('path');

const EXPECTED_COUNT = 200;
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../static/data/kanji-g3.json'), 'utf8'));

const errors = [];
const warnings = [];

console.log('=== 漢字データチェック ===\n');

// 1. 漢字数チェック
if (data.length !== EXPECTED_COUNT) {
  errors.push(`漢字数: ${data.length}/${EXPECTED_COUNT}`);
} else {
  console.log(`[OK] 漢字数: ${data.length}/${EXPECTED_COUNT}`);
}

// 2. ID形式チェック
const idPattern = /^U\+[0-9A-F]{4,5}$/;
const invalidIds = data.filter(k => !idPattern.test(k.id));
if (invalidIds.length > 0) {
  errors.push(`ID形式エラー: ${invalidIds.map(k => k.id).join(', ')}`);
} else {
  console.log('[OK] ID形式: 全て正常');
}

// 3. ID重複チェック
const ids = data.map(k => k.id);
const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicateIds.length > 0) {
  errors.push(`ID重複: ${duplicateIds.join(', ')}`);
} else {
  console.log('[OK] ID重複: なし');
}

// 4. character長さチェック
const invalidChars = data.filter(k => k.character.length !== 1);
if (invalidChars.length > 0) {
  errors.push(`character長さエラー: ${invalidChars.map(k => `${k.character}(${k.id})`).join(', ')}`);
} else {
  console.log('[OK] character長さ: 全て1文字');
}

// 5. grade値チェック
const invalidGrades = data.filter(k => k.grade !== 3);
if (invalidGrades.length > 0) {
  errors.push(`grade値エラー: ${invalidGrades.map(k => `${k.character}=${k.grade}`).join(', ')}`);
} else {
  console.log('[OK] grade値: 全て3');
}

// 6. strokeCountチェック
const invalidStrokes = data.filter(k => k.strokeCount < 1 || k.strokeCount > 30);
if (invalidStrokes.length > 0) {
  warnings.push(`strokeCount警告: ${invalidStrokes.map(k => `${k.character}=${k.strokeCount}`).join(', ')}`);
} else {
  console.log('[OK] strokeCount: 全て1-30の範囲');
}

// 7. readings存在チェック
const invalidReadings = data.filter(k =>
  !Array.isArray(k.readings.on) || !Array.isArray(k.readings.kun)
);
if (invalidReadings.length > 0) {
  errors.push(`readings形式エラー: ${invalidReadings.map(k => k.character).join(', ')}`);
} else {
  console.log('[OK] readings形式: 全て正常');
}

// 8. 訓読み送り仮名チェック（警告のみ）
const kunReadingsWithoutDot = [];
data.forEach(k => {
  k.readings.kun.forEach(reading => {
    // 動詞・形容詞の語尾パターン（簡易判定）
    const verbEndings = ['る', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む', 'う'];
    const adjEndings = ['い'];
    const lastChar = reading.slice(-1);

    if ((verbEndings.includes(lastChar) || adjEndings.includes(lastChar)) && !reading.includes('.')) {
      kunReadingsWithoutDot.push(`${k.character}: "${reading}"`);
    }
  });
});
if (kunReadingsWithoutDot.length > 0) {
  warnings.push(`訓読み送り仮名なし（要確認）:\n  ${kunReadingsWithoutDot.slice(0, 10).join('\n  ')}${kunReadingsWithoutDot.length > 10 ? `\n  ...他${kunReadingsWithoutDot.length - 10}件` : ''}`);
}

// 結果出力
console.log('\n=== 結果 ===');
if (errors.length > 0) {
  console.log(`\n[ERROR] ${errors.length}件`);
  errors.forEach(e => console.log(`  - ${e}`));
}
if (warnings.length > 0) {
  console.log(`\n[WARNING] ${warnings.length}件`);
  warnings.forEach(w => console.log(`  - ${w}`));
}
if (errors.length === 0 && warnings.length === 0) {
  console.log('\n全てのチェックをパスしました！');
}

process.exit(errors.length > 0 ? 1 : 0);
