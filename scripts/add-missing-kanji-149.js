// 漢字149「鳴」(U+9E23)を追加するスクリプト
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const missingKanji = {
  kanjiId: "U+9E23",
  character: "鳴",
  newExamples: [
    {
      id: "U+9E23-ex-3",
      sentence: "すずが 鳴る。",
      reading: "なる",
      type: "kun",
      sentenceWithRuby: "すずが 鳴る。",
      sentenceHiragana: "すずが なる。"
    },
    {
      id: "U+9E23-ex-4",
      sentence: "いぬが 鳴く。",
      reading: "なく",
      type: "kun",
      sentenceWithRuby: "いぬが 鳴く。",
      sentenceHiragana: "いぬが なく。"
    },
    {
      id: "U+9E23-ex-5",
      sentence: "かねが 鳴る。",
      reading: "なる",
      type: "kun",
      sentenceWithRuby: "かねが 鳴る。",
      sentenceHiragana: "かねが なる。"
    }
  ]
};

// バッチ15に追加
const batchPath = path.join(__dirname, 'generated-batch-15.json');
const batchData = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

// 既に存在しないか確認
if (!batchData.find(item => item.kanjiId === "U+9E23")) {
  // 適切な位置に挿入（漢字149は147「万」と148「明」の間）
  const insertIndex = batchData.findIndex(item => item.kanjiId === "U+660E"); // 明
  batchData.splice(insertIndex, 0, missingKanji);

  fs.writeFileSync(batchPath, JSON.stringify(batchData, null, 2), 'utf8');
  console.log('✓ 漢字149「鳴」(U+9E23)を追加しました');
} else {
  console.log('漢字149「鳴」は既に存在します');
}

// 同時にひらがな変換エラーも修正
let content = fs.readFileSync(batchPath, 'utf8');
const fixes = [
  { pattern: 'あるくく', replacement: 'あるく' },
  { pattern: 'ぼ音', replacement: 'ぼおん' },
  { pattern: 'まい日', replacement: 'まいにち' },
  { pattern: 'あかるいるい', replacement: 'あかるい' },
  { pattern: 'めい日', replacement: 'あした' },
  { pattern: 'ばん年', replacement: 'まんねん' }
];

fixes.forEach(fix => {
  if (content.includes(fix.pattern)) {
    content = content.replace(new RegExp(fix.pattern, 'g'), fix.replacement);
  }
});

fs.writeFileSync(batchPath, content, 'utf8');
console.log('✓ ひらがな変換エラーも修正しました');
