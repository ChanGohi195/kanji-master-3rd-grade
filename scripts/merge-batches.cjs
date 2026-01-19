/**
 * バッチ生成結果のマージ
 *
 * scripts/generated-batch-*.json を結合し、
 * scripts/generated-examples.json を作成します。
 *
 * 使用方法:
 *   node scripts/merge-batches.cjs
 */

const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = 'scripts';
const OUTPUT_PATH = 'scripts/generated-examples.json';

function mergeBatches() {
  console.log('=== バッチファイルのマージ ===\n');

  // scripts/ ディレクトリ内の generated-batch-*.json を検索
  const files = fs.readdirSync(SCRIPTS_DIR)
    .filter(f => /^generated-batch-\d+\.json$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });

  if (files.length === 0) {
    console.error('エラー: generated-batch-*.json ファイルが見つかりません\n');
    console.error('先にバッチ生成を実行してください:');
    console.error('  node scripts/batch-generator.cjs 1\n');
    process.exit(1);
  }

  console.log(`${files.length} 個のバッチファイルを検出しました:\n`);
  files.forEach(f => console.log(`  - ${f}`));
  console.log('');

  // マージ処理
  const mergedData = [];
  let totalKanji = 0;
  let totalExamples = 0;
  const errors = [];

  files.forEach((file, idx) => {
    const filePath = path.join(SCRIPTS_DIR, file);
    console.log(`[${idx + 1}/${files.length}] ${file} を読み込み中...`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        errors.push(`${file}: 配列形式ではありません`);
        return;
      }

      data.forEach(kanji => {
        // 基本検証
        if (!kanji.kanjiId || !kanji.character || !kanji.newExamples) {
          errors.push(`${file}: ${kanji.character || '不明'}: 必須フィールドが不足`);
          return;
        }

        if (!Array.isArray(kanji.newExamples) || kanji.newExamples.length === 0) {
          errors.push(`${file}: ${kanji.character}: newExamplesが空です`);
          return;
        }

        // 例文数チェック
        if (kanji.newExamples.length !== 3) {
          errors.push(`${file}: ${kanji.character}: 例文数が3ではありません (${kanji.newExamples.length})`);
        }

        mergedData.push(kanji);
        totalKanji++;
        totalExamples += kanji.newExamples.length;
      });

    } catch (err) {
      errors.push(`${file}: 読み込みエラー: ${err.message}`);
    }
  });

  console.log('');

  // エラーチェック
  if (errors.length > 0) {
    console.log(`⚠ ${errors.length} 件のエラーが検出されました:\n`);
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    console.log('\nエラーを修正してから再実行してください\n');
    process.exit(1);
  }

  // 保存
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mergedData, null, 2), 'utf8');

  console.log('=== マージ完了 ===');
  console.log(`総漢字数: ${totalKanji}`);
  console.log(`総例文数: ${totalExamples}`);
  console.log(`出力先: ${OUTPUT_PATH}\n`);

  console.log('次のステップ:');
  console.log('  node scripts/generate-examples.cjs merge\n');
}

mergeBatches();
