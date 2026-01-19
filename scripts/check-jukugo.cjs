/**
 * 熟語データチェックスクリプト
 * jukugo.json の整合性を検証
 */
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../static/data/jukugo.json'), 'utf8'));
const kanjiData = JSON.parse(fs.readFileSync(path.join(__dirname, '../static/data/kanji-g3.json'), 'utf8'));

// 1-3年生の漢字リスト（チェック用）
const grade1 = '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六'.split('');
const grade2 = '引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話'.split('');
const grade3 = kanjiData.map(k => k.character);
const validKanji = new Set([...grade1, ...grade2, ...grade3]);

const errors = [];
const warnings = [];

console.log('=== 熟語データチェック ===\n');

// 全熟語を収集（重複チェック用）
const allWords = new Map();

// 1. 漢字ごとの熟語数チェック
const kanjiIds = new Set(kanjiData.map(k => k.id));
const jukugoKanjiIds = new Set(data.map(e => e.kanjiId));

// 足りない漢字
const missingKanji = [...kanjiIds].filter(id => !jukugoKanjiIds.has(id));
if (missingKanji.length > 0) {
  warnings.push(`熟語がない漢字: ${missingKanji.length}件`);
}

// 各漢字の熟語数
const insufficientJukugo = data.filter(e => e.jukugo.length < 5);
if (insufficientJukugo.length > 0) {
  warnings.push(`熟語が5未満: ${insufficientJukugo.map(e => `${e.character}(${e.jukugo.length})`).join(', ')}`);
}

console.log(`[INFO] 熟語あり漢字数: ${data.length}`);
console.log(`[INFO] 総熟語数: ${data.reduce((sum, e) => sum + e.jukugo.length, 0)}`);

// 2. 各熟語の詳細チェック
data.forEach((kanji) => {
  kanji.jukugo.forEach((j) => {
    // 2.1 ID形式チェック
    const idPattern = /^U\+[0-9A-F]{4,5}-j-\d+$/;
    if (!idPattern.test(j.id)) {
      errors.push(`[${kanji.character}] ID形式エラー: ${j.id}`);
    }

    // 2.2 構成漢字学年チェック
    const invalidChars = j.components.filter(c => !validKanji.has(c));
    if (invalidChars.length > 0) {
      errors.push(`[${kanji.character}] 構成漢字が範囲外: ${j.word} (${invalidChars.join(', ')})`);
    }

    // 2.3 熟語重複チェック
    if (allWords.has(j.word)) {
      errors.push(`[${kanji.character}] 熟語重複: ${j.word} (${allWords.get(j.word)}にも存在)`);
    } else {
      allWords.set(j.word, kanji.character);
    }

    // 2.4 例文存在チェック
    if (!j.sentence || j.sentence.trim() === '') {
      errors.push(`[${kanji.character}] 例文なし: ${j.word}`);
    }

    // 2.5 例文内熟語チェック
    if (j.sentence && !j.sentence.includes(j.word)) {
      errors.push(`[${kanji.character}] 例文に熟語なし: ${j.word}`);
    }

    // 2.6 components整合チェック
    const wordChars = j.word.split('');
    if (wordChars.length !== j.components.length ||
        !wordChars.every((c, i) => c === j.components[i])) {
      errors.push(`[${kanji.character}] components不一致: ${j.word} vs [${j.components.join(',')}]`);
    }

    // 2.7 reading妥当性チェック（警告のみ）
    // 熟語の文字数とreadingの文字数の比率チェック
    const wordLen = j.word.length;
    const readingLen = j.reading.length;
    if (readingLen < wordLen || readingLen > wordLen * 4) {
      warnings.push(`[${kanji.character}] reading長さ注意: ${j.word} -> ${j.reading}`);
    }

    // 2.8 sentenceHiragana存在チェック
    if (!j.sentenceHiragana || j.sentenceHiragana.trim() === '') {
      warnings.push(`[${kanji.character}] sentenceHiraganaなし: ${j.word}`);
    }
  });
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
