/**
 * バッチ例文生成ヘルパー
 *
 * kanji-list.json を10漢字ずつに分割し、
 * LLMでの処理を容易にします。
 *
 * 使用方法:
 *   node scripts/batch-generator.cjs [batch-number]
 *   例: node scripts/batch-generator.cjs 1  # 1-10番目
 *       node scripts/batch-generator.cjs 2  # 11-20番目
 */

const fs = require('fs');

const KANJI_LIST_PATH = 'scripts/kanji-list.json';
const BATCH_SIZE = 10;

function generateBatchPrompt(batchNumber) {
  if (!fs.existsSync(KANJI_LIST_PATH)) {
    console.error(`エラー: ${KANJI_LIST_PATH} が見つかりません`);
    console.error('先に node scripts/generate-examples.cjs analyze を実行してください\n');
    process.exit(1);
  }

  const kanjiList = JSON.parse(fs.readFileSync(KANJI_LIST_PATH, 'utf8'));

  const startIdx = (batchNumber - 1) * BATCH_SIZE;
  const endIdx = Math.min(startIdx + BATCH_SIZE, kanjiList.length);

  if (startIdx >= kanjiList.length) {
    console.error(`エラー: バッチ番号が範囲外です（最大: ${Math.ceil(kanjiList.length / BATCH_SIZE)}）\n`);
    process.exit(1);
  }

  const batch = kanjiList.slice(startIdx, endIdx);

  console.log(`=== バッチ ${batchNumber} (${startIdx + 1}-${endIdx} / ${kanjiList.length}) ===\n`);

  const prompt = `
以下の${batch.length}個の漢字について、小学2年生向けの例文を各3つ作成してください。

## 要件
1. 小学2年生が理解できる簡単な文
2. 既存の読み（on/kun）を使い回す
3. 対象漢字が必ずsentenceに含まれる
4. sentenceWithRubyは対象漢字以外の漢字に[読み]を付ける（例: 白[しろ]い）
5. sentenceHiraganaは全てひらがな

## 重要な注意点
- **sentenceには対象漢字以外はひらがなで書く**（例: "ドアを 引く。" "つなを 引く。"）
- **sentenceWithRubyは対象漢字以外の漢字にのみ[読み]を付ける**
- **既存の読みと同じ読みを使う**（新しい読みは作らない）

## 出力フォーマット
JSONのみを出力してください。説明文は不要です。

\`\`\`json
[
  {
    "kanjiId": "U+XXXX",
    "character": "X",
    "newExamples": [
      {
        "id": "U+XXXX-ex-3",
        "sentence": "...",
        "reading": "...",
        "type": "kun",
        "sentenceWithRuby": "...",
        "sentenceHiragana": "..."
      },
      {
        "id": "U+XXXX-ex-4",
        "sentence": "...",
        "reading": "...",
        "type": "on",
        "sentenceWithRuby": "...",
        "sentenceHiragana": "..."
      },
      {
        "id": "U+XXXX-ex-5",
        "sentence": "...",
        "reading": "...",
        "type": "kun",
        "sentenceWithRuby": "...",
        "sentenceHiragana": "..."
      }
    ]
  }
]
\`\`\`

## 対象漢字

${batch.map((k, i) => `
### ${startIdx + i + 1}. ${k.character} (${k.kanjiId})
- 既存例文数: ${k.currentCount}
- 必要追加数: ${k.needCount}
- 既存の読み: ${[...new Set(k.existingReadings.map(r => `${r.reading}(${r.type})`))].join(', ')}
- 既存例文:
${k.examples.map((ex, j) => `  ${j+1}. ${ex.sentence} [${ex.reading}/${ex.type}]`).join('\n')}
`).join('\n')}
`;

  console.log(prompt);
}

function showUsage() {
  const kanjiList = JSON.parse(fs.readFileSync(KANJI_LIST_PATH, 'utf8'));
  const totalBatches = Math.ceil(kanjiList.length / BATCH_SIZE);

  console.log('バッチ例文生成ヘルパー\n');
  console.log(`総漢字数: ${kanjiList.length}`);
  console.log(`バッチサイズ: ${BATCH_SIZE}`);
  console.log(`総バッチ数: ${totalBatches}\n`);
  console.log('使用方法:');
  console.log(`  node scripts/batch-generator.cjs [1-${totalBatches}]\n`);
  console.log('例:');
  console.log('  node scripts/batch-generator.cjs 1   # 1-10番目の漢字');
  console.log('  node scripts/batch-generator.cjs 2   # 11-20番目の漢字');
  console.log(`  node scripts/batch-generator.cjs ${totalBatches}   # 最後のバッチ\n`);
  console.log('生成されたプロンプトをLLMに入力し、出力されたJSONを');
  console.log('scripts/generated-batch-N.json として保存してください。\n');
  console.log('全バッチ完了後、以下のコマンドでマージ:');
  console.log('  node scripts/merge-batches.cjs\n');
}

function main() {
  const batchNumber = parseInt(process.argv[2]);

  if (isNaN(batchNumber) || batchNumber < 1) {
    showUsage();
  } else {
    generateBatchPrompt(batchNumber);
  }
}

main();
