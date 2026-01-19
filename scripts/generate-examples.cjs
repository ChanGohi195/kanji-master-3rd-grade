/**
 * 漢字マスター2年生 - 例文生成スクリプト
 *
 * 目的: 各漢字に3例文を追加（現状2例文→目標5例文）
 *
 * 使用方法:
 *   1. node scripts/generate-examples.cjs analyze
 *      → 現状分析と必要な例文リストを出力
 *
 *   2. 生成された kanji-list.json を元にLLMで例文作成
 *
 *   3. 作成した例文を generated-examples.json に保存
 *
 *   4. node scripts/generate-examples.cjs merge
 *      → examples.json に新例文をマージ
 *
 *   5. node scripts/check-consistency.cjs
 *      → 整合性チェック
 */

const fs = require('fs');
const path = require('path');

const EXAMPLES_PATH = 'static/data/examples.json';
const KANJI_LIST_PATH = 'scripts/kanji-list.json';
const GENERATED_PATH = 'scripts/generated-examples.json';
const BACKUP_PATH = 'scripts/examples-backup.json';

// ===== Phase 1: データ抽出・分析 =====

function analyzeExamples() {
  console.log('=== Phase 1: 現状分析 ===\n');

  const data = JSON.parse(fs.readFileSync(EXAMPLES_PATH, 'utf8'));

  const kanjiList = data.map(kanji => {
    const existingReadings = kanji.examples.map(ex => ({
      reading: ex.reading,
      type: ex.type
    }));

    return {
      kanjiId: kanji.kanjiId,
      character: kanji.character,
      currentCount: kanji.examples.length,
      targetCount: 5,
      needCount: 5 - kanji.examples.length,
      existingReadings: existingReadings,
      examples: kanji.examples
    };
  });

  // 統計情報
  const totalCurrent = kanjiList.reduce((sum, k) => sum + k.currentCount, 0);
  const totalNeed = kanjiList.reduce((sum, k) => sum + k.needCount, 0);

  console.log(`総漢字数: ${kanjiList.length}`);
  console.log(`現在の例文総数: ${totalCurrent}`);
  console.log(`目標例文総数: ${kanjiList.length * 5}`);
  console.log(`追加必要数: ${totalNeed}\n`);

  // kanji-list.json に保存
  fs.writeFileSync(KANJI_LIST_PATH, JSON.stringify(kanjiList, null, 2), 'utf8');
  console.log(`✓ ${KANJI_LIST_PATH} に保存しました\n`);

  // LLM用プロンプト生成
  generatePromptTemplate(kanjiList);
}

function generatePromptTemplate(kanjiList) {
  console.log('=== LLM用プロンプトテンプレート ===\n');

  // バッチ処理用のサンプル（最初の5漢字）
  const sample = kanjiList.slice(0, 5);

  const prompt = `
以下の漢字について、小学2年生向けの例文を各3つ作成してください。

## 要件
1. 小学2年生が理解できる簡単な文
2. 既存の読み（on/kun）を使い回す
3. 対象漢字が必ずsentenceに含まれる
4. sentenceWithRubyは対象漢字以外の漢字に[読み]を付ける（例: 白[しろ]い）
5. sentenceHiraganaは全てひらがな

## フォーマット
\`\`\`json
[
  {
    "kanjiId": "U+5F15",
    "character": "引",
    "newExamples": [
      {
        "id": "U+5F15-ex-3",
        "sentence": "つなを 引く。",
        "reading": "ひく",
        "type": "kun",
        "sentenceWithRuby": "つなを 引く。",
        "sentenceHiragana": "つなを ひく。"
      },
      {
        "id": "U+5F15-ex-4",
        "sentence": "糸[いと]を 引く。",
        "reading": "ひく",
        "type": "kun",
        "sentenceWithRuby": "糸[いと]を 引く。",
        "sentenceHiragana": "いとを ひく。"
      },
      {
        "id": "U+5F15-ex-5",
        "sentence": "引き出[だ]しに しまう。",
        "reading": "ひき",
        "type": "kun",
        "sentenceWithRuby": "引き出[だ]しに しまう。",
        "sentenceHiragana": "ひきだしに しまう。"
      }
    ]
  }
]
\`\`\`

## 対象漢字（サンプル: 最初の5漢字）

${sample.map(k => `
### ${k.character} (${k.kanjiId})
- 既存例文数: ${k.currentCount}
- 必要追加数: ${k.needCount}
- 既存の読み: ${k.existingReadings.map(r => `${r.reading}(${r.type})`).join(', ')}
- 既存例文:
${k.examples.map((ex, i) => `  ${i+1}. ${ex.sentence} [${ex.reading}/${ex.type}]`).join('\n')}
`).join('\n')}

---

全160漢字のデータは kanji-list.json を参照してください。
生成した例文は generated-examples.json として保存してください。
`;

  // プロンプトファイルに保存
  const promptPath = 'scripts/prompt-template.txt';
  fs.writeFileSync(promptPath, prompt, 'utf8');
  console.log(`✓ ${promptPath} に保存しました`);
  console.log('\n次のステップ:');
  console.log('1. kanji-list.json を確認');
  console.log('2. LLMで例文を生成');
  console.log('3. generated-examples.json として保存');
  console.log('4. node scripts/generate-examples.cjs merge\n');
}

// ===== Phase 2: マージ処理 =====

function mergeExamples() {
  console.log('=== Phase 2: 例文マージ ===\n');

  // ファイル存在チェック
  if (!fs.existsSync(GENERATED_PATH)) {
    console.error(`エラー: ${GENERATED_PATH} が見つかりません`);
    console.error('先に generated-examples.json を作成してください\n');
    process.exit(1);
  }

  // バックアップ作成
  const originalData = JSON.parse(fs.readFileSync(EXAMPLES_PATH, 'utf8'));
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(originalData, null, 2), 'utf8');
  console.log(`✓ バックアップ作成: ${BACKUP_PATH}\n`);

  // 生成データ読み込み
  const generatedData = JSON.parse(fs.readFileSync(GENERATED_PATH, 'utf8'));
  console.log(`✓ ${generatedData.length} 漢字分の例文を読み込みました\n`);

  // マージ処理
  let addedCount = 0;
  let errorCount = 0;
  const errors = [];

  generatedData.forEach(generated => {
    // 対象漢字を検索
    const kanjiIndex = originalData.findIndex(k => k.kanjiId === generated.kanjiId);

    if (kanjiIndex === -1) {
      errors.push(`漢字ID ${generated.kanjiId} (${generated.character}) が見つかりません`);
      errorCount++;
      return;
    }

    const kanji = originalData[kanjiIndex];

    // 例文検証とマージ
    generated.newExamples.forEach((ex, idx) => {
      // 基本検証
      const validation = validateExample(ex, kanji.character);

      if (!validation.valid) {
        errors.push(`${kanji.character}: ex-${idx + 1}: ${validation.error}`);
        errorCount++;
        return;
      }

      // IDの重複チェック
      const idExists = kanji.examples.some(existing => existing.id === ex.id);
      if (idExists) {
        errors.push(`${kanji.character}: ID ${ex.id} が既に存在します`);
        errorCount++;
        return;
      }

      // 例文追加
      kanji.examples.push(ex);
      addedCount++;
    });
  });

  // エラー報告
  if (errorCount > 0) {
    console.log(`⚠ ${errorCount} 件のエラーが見つかりました:\n`);
    errors.forEach((err, i) => console.log(`${i+1}. ${err}`));
    console.log('\nエラーを修正してから再実行してください\n');
    process.exit(1);
  }

  // 保存
  fs.writeFileSync(EXAMPLES_PATH, JSON.stringify(originalData, null, 2), 'utf8');
  console.log(`✓ ${addedCount} 例文を追加しました`);
  console.log(`✓ ${EXAMPLES_PATH} を更新しました\n`);

  // 統計情報
  const finalStats = originalData.map(k => ({
    char: k.character,
    count: k.examples.length
  }));

  const complete = finalStats.filter(s => s.count >= 5).length;
  const incomplete = finalStats.filter(s => s.count < 5);

  console.log('=== 完了統計 ===');
  console.log(`完了: ${complete} / ${originalData.length} 漢字`);
  console.log(`総例文数: ${originalData.reduce((sum, k) => sum + k.examples.length, 0)}\n`);

  if (incomplete.length > 0) {
    console.log('未完了の漢字:');
    incomplete.forEach(s => console.log(`  ${s.char}: ${s.count}/5`));
    console.log('');
  }

  console.log('次のステップ:');
  console.log('  node scripts/check-consistency.cjs\n');
}

// ===== 検証関数 =====

function validateExample(ex, targetKanji) {
  // 必須フィールド
  const required = ['id', 'sentence', 'reading', 'type', 'sentenceWithRuby', 'sentenceHiragana'];
  for (const field of required) {
    if (!ex[field]) {
      return { valid: false, error: `必須フィールド ${field} がありません` };
    }
  }

  // typeの値チェック
  if (ex.type !== 'on' && ex.type !== 'kun') {
    return { valid: false, error: `type は "on" または "kun" である必要があります: ${ex.type}` };
  }

  // 対象漢字が含まれているか
  if (!ex.sentence.includes(targetKanji)) {
    return { valid: false, error: `sentence に漢字 "${targetKanji}" が含まれていません: ${ex.sentence}` };
  }

  // ルビ除去チェック
  const plainText = stripRuby(ex.sentenceWithRuby);
  if (plainText !== ex.sentence) {
    return {
      valid: false,
      error: `sentenceWithRuby のルビを除去した結果が sentence と一致しません\n` +
             `  sentence: ${ex.sentence}\n` +
             `  ruby除去: ${plainText}`
    };
  }

  // 読みの存在チェック（連濁対応）
  const hiragana = ex.sentenceHiragana;
  const reading = ex.reading;

  const dakuon = {
    'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご',
    'さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ',
    'た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど',
    'は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ'
  };

  const variants = [reading];
  if (dakuon[reading[0]]) {
    variants.push(dakuon[reading[0]] + reading.slice(1));
  }

  const found = variants.some(v => hiragana.includes(v));
  if (!found) {
    return {
      valid: false,
      error: `sentenceHiragana に読み "${reading}" が含まれていません: ${hiragana}`
    };
  }

  return { valid: true };
}

function stripRuby(text) {
  return text.replace(/\[([^\]]+)\]/g, '');
}

// ===== メイン処理 =====

function main() {
  const command = process.argv[2];

  if (command === 'analyze') {
    analyzeExamples();
  } else if (command === 'merge') {
    mergeExamples();
  } else {
    console.log('使用方法:');
    console.log('  node scripts/generate-examples.cjs analyze  # データ分析');
    console.log('  node scripts/generate-examples.cjs merge    # 例文マージ');
    console.log('');
  }
}

main();
