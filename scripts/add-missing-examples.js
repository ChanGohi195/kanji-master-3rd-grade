// 不足している漢字の例文を追加するスクリプト
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 不足している漢字の例文データ
const missingExamples = {
  "U+5F31": [ // 弱
    { reading: "よわい", type: "kun", sentence: "弱い こえ。" },
    { reading: "よわ", type: "kun", sentence: "弱く なる。" },
    { reading: "じゃく", type: "on", sentence: "じゃく点を なおす。" }
  ],
  "U+5F1F": [ // 弟
    { reading: "おとうと", type: "kun", sentence: "弟と あそぶ。" },
    { reading: "てい", type: "on", sentence: "兄弟で いく。" },
    { reading: "おとうと", type: "kun", sentence: "弟が わらう。" }
  ],
  "U+8CB7": [ // 買
    { reading: "かう", type: "kun", sentence: "ほんを 買う。" },
    { reading: "ばい", type: "on", sentence: "買物に いく。" },
    { reading: "か", type: "kun", sentence: "買って かえる。" }
  ],
  "U+53CB": [ // 友
    { reading: "とも", type: "kun", sentence: "友だちと あそぶ。" },
    { reading: "ゆう", type: "on", sentence: "ゆう人に あう。" },
    { reading: "とも", type: "kun", sentence: "友が くる。" }
  ],
  "U+7528": [ // 用
    { reading: "よう", type: "on", sentence: "用いる。" },
    { reading: "よう", type: "on", sentence: "用じを たす。" },
    { reading: "もち", type: "kun", sentence: "用いて つくる。" }
  ],
  "U+66DC": [ // 曜
    { reading: "よう", type: "on", sentence: "月曜日に あう。" },
    { reading: "よう", type: "on", sentence: "何曜日？" },
    { reading: "よう", type: "on", sentence: "金曜日が すき。" }
  ],
  "U+6765": [ // 来
    { reading: "くる", type: "kun", sentence: "ともだちが 来る。" },
    { reading: "らい", type: "on", sentence: "来週 あう。" },
    { reading: "き", type: "kun", sentence: "来て ください。" }
  ],
  "U+91CC": [ // 里
    { reading: "さと", type: "kun", sentence: "里に かえる。" },
    { reading: "り", type: "on", sentence: "千里の みち。" },
    { reading: "さと", type: "kun", sentence: "里やまを あるく。" }
  ],
  "U+7406": [ // 理
    { reading: "り", type: "on", sentence: "理科の じっけん。" },
    { reading: "り", type: "on", sentence: "理ゆうを きく。" },
    { reading: "ことわり", type: "kun", sentence: "理を まなぶ。" }
  ],
  "U+8A71": [ // 話
    { reading: "はなす", type: "kun", sentence: "ともだちと 話す。" },
    { reading: "わ", type: "on", sentence: "電話を かける。" },
    { reading: "はなし", type: "kun", sentence: "おもしろい 話。" }
  ]
};

// ルビを付与する関数
function addRuby(sentence, targetKanji) {
  const rubyMap = {
    '白': 'しろ', '大': 'おお', '二': 'に', '一': 'いち', '三': 'さん',
    '木': 'き', '生': 'せい', '東': 'とう', '来': 'らい', '正': 'せい',
    '新': 'しん', '外': 'がい', '今': 'こん', '父': 'ちち', '母': 'はは',
    '兄': 'きょう', '千': 'せん', '何': 'なん', '月': 'げつ', '金': 'きん'
  };

  let result = sentence;
  for (const [kanji, reading] of Object.entries(rubyMap)) {
    if (kanji !== targetKanji && sentence.includes(kanji)) {
      result = result.replace(new RegExp(kanji, 'g'), `${kanji}[${reading}]`);
    }
  }
  return result;
}

// ひらがなに変換する関数
function toHiragana(sentence, targetKanji, reading) {
  let result = sentence.replace(targetKanji, reading);

  const kanjiMap = {
    '白い': 'しろい', '大きな': 'おおきな', '二': 'に', '一': 'いち',
    '木': 'き', '生': 'せい', '東': 'とう', '来': 'らい', '正': 'せい',
    '新': 'しん', '外': 'がい', '今': 'こん', '三': 'さん', '兄': 'きょう',
    '千': 'せん', '何': 'なん', '月': 'げつ', '金': 'きん'
  };

  for (const [kanji, hiragana] of Object.entries(kanjiMap)) {
    result = result.replace(new RegExp(kanji, 'g'), hiragana);
  }

  return result;
}

// kanji-list.jsonを読み込んで、不足している漢字を特定
const kanjiList = JSON.parse(fs.readFileSync(path.join(__dirname, 'kanji-list.json'), 'utf8'));

// 不足している漢字を処理
const missingKanjis = Object.keys(missingExamples).map(kanjiId => {
  const kanji = kanjiList.find(k => k.kanjiId === kanjiId);
  if (!kanji) return null;

  const examples = missingExamples[kanjiId];
  return {
    kanjiId: kanji.kanjiId,
    character: kanji.character,
    newExamples: examples.map((ex, idx) => ({
      id: `${kanji.kanjiId}-ex-${idx + 3}`,
      sentence: ex.sentence,
      reading: ex.reading,
      type: ex.type,
      sentenceWithRuby: addRuby(ex.sentence, kanji.character),
      sentenceHiragana: toHiragana(ex.sentence, kanji.character, ex.reading)
    }))
  };
}).filter(item => item !== null);

// 各バッチファイルを読み込んで、不足している漢字を追加
for (let batchNum = 3; batchNum <= 16; batchNum++) {
  const batchPath = path.join(__dirname, `generated-batch-${batchNum}.json`);

  if (!fs.existsSync(batchPath)) continue;

  const batchData = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

  // このバッチに不足している漢字があるか確認
  const batchKanjiIds = batchData.map(item => item.kanjiId);
  const toAdd = missingKanjis.filter(item => {
    // このバッチに含まれるべき漢字を確認（漢字21-160の範囲内）
    const kanjiIndex = kanjiList.findIndex(k => k.kanjiId === item.kanjiId);
    const batchStartIdx = (batchNum - 1) * 10;
    const batchEndIdx = batchStartIdx + 10;
    return kanjiIndex >= batchStartIdx && kanjiIndex < batchEndIdx;
  });

  if (toAdd.length > 0) {
    // 既存のデータとマージ
    const updatedData = [...batchData, ...toAdd];
    fs.writeFileSync(batchPath, JSON.stringify(updatedData, null, 2), 'utf8');
    console.log(`✓ Batch ${batchNum} updated: Added ${toAdd.length} missing kanji`);
  }
}

console.log('\n不足している漢字の例文を追加しました。');
