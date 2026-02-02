#!/usr/bin/env node
/**
 * 残りの熟語ルビを手動修正
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const examplesPath = join(__dirname, '../static/data/examples.json');

const data = JSON.parse(readFileSync(examplesPath, 'utf-8'));

// 手動変換マップ
const manualFixes = {
  '保健委員[ほけんいいん]': '保[ほ]健[けん]委[い]員[いん]',
  '地下一階[ちかいっかい]': '地[ち]下[か]一[いっ]階[かい]',
  '漢和辞典[かんわじてん]': '漢[かん]和[わ]辞[じ]典[てん]',
  '起床時間[きしょうじかん]': '起[き]床[しょう]時[じ]間[かん]',
  '給食係[きゅうしょくがかり]': '給[きゅう]食[しょく]係[がかり]',
  '受付係[うけつけがかり]': '受[うけ]付[つけ]係[がかり]',
  '港町[みなとまち]': '港[みなと]町[まち]',
  '台所[だいどころ]': '台[だい]所[どころ]',
  '昭和時代[しょうわじだい]': '昭[しょう]和[わ]時[じ]代[だい]',
  '家族旅行[かぞくりょこう]': '家[か]族[ぞく]旅[りょ]行[こう]',
  '短距離走[たんきょりそう]': '短[たん]距[きょ]離[り]走[そう]',
  '大黒柱[だいこくばしら]': '大[だい]黒[こく]柱[ばしら]',
  // 童歌[わらべうた] は熟字訓なのでそのまま
  '薬箱[くすりばこ]': '薬[くすり]箱[ばこ]',
  '天気予報[てんきよほう]': '天[てん]気[き]予[よ]報[ほう]',
};

let fixedCount = 0;

for (const entry of data) {
  for (const ex of entry.examples) {
    let ruby = ex.sentenceWithRuby;
    let modified = false;

    for (const [original, fixed] of Object.entries(manualFixes)) {
      if (ruby.includes(original)) {
        ruby = ruby.replace(original, fixed);
        modified = true;
        console.log(`修正: ${original} → ${fixed}`);
      }
    }

    if (modified) {
      ex.sentenceWithRuby = ruby;
      fixedCount++;
    }
  }
}

writeFileSync(examplesPath, JSON.stringify(data, null, 2), 'utf-8');

console.log(`\n修正完了: ${fixedCount}件`);
console.log('※ 童歌[わらべうた] は熟字訓のためグループルビのまま保持');
