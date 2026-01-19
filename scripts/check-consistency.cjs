const fs = require('fs');
const data = JSON.parse(fs.readFileSync('static/data/examples.json', 'utf8'));

const issues = [];

// ルビを除去してプレーンテキストに
function stripRuby(text) {
  return text.replace(/\[([^\]]+)\]/g, '');
}

data.forEach((kanji) => {
  kanji.examples.forEach((ex) => {
    // 1. sentenceWithRuby のプレーン部分が sentence と一致するか
    const rubyPlain = stripRuby(ex.sentenceWithRuby || '');
    if (rubyPlain !== ex.sentence) {
      issues.push({
        kanji: kanji.character,
        type: 'ルビ除去≠原文',
        sentence: ex.sentence,
        rubyPlain: rubyPlain,
        ruby: ex.sentenceWithRuby
      });
    }

    // 2. 対象漢字が sentence に含まれているか（文章読み問題で必須）
    if (!ex.sentence.includes(kanji.character)) {
      issues.push({
        kanji: kanji.character,
        type: '対象漢字なし',
        id: ex.id,
        sentence: ex.sentence,
        ruby: ex.sentenceWithRuby
      });
    }

    // 3. reading と sentenceHiragana の整合性チェック
    const hiragana = ex.sentenceHiragana || '';
    const reading = ex.reading;

    // 連濁・促音対応
    const dakuon = {'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご',
                    'さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ',
                    'た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど',
                    'は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ'};

    const variants = [reading];
    if (dakuon[reading[0]]) variants.push(dakuon[reading[0]] + reading.slice(1));

    const found = variants.some(v => hiragana.includes(v));
    if (!found) {
      issues.push({
        kanji: kanji.character,
        type: '読み不一致',
        sentence: ex.sentence,
        reading: reading,
        hiragana: hiragana
      });
    }
  });
});

console.log(`=== 検出された問題 (${issues.length}件) ===\n`);
issues.forEach((issue, i) => {
  console.log(`${i+1}. 【${issue.kanji}】 ${issue.type}`);
  console.log(`   文: ${issue.sentence}`);
  if (issue.reading) console.log(`   読み: ${issue.reading}`);
  if (issue.hiragana) console.log(`   ひらがな: ${issue.hiragana}`);
  if (issue.ruby) console.log(`   ルビ: ${issue.ruby}`);
  if (issue.rubyPlain) console.log(`   ルビ除去: ${issue.rubyPlain}`);
  console.log('');
});
