#!/usr/bin/env node
/**
 * analyze-quality.cjs — 漢字例文品質分析スクリプト（全学年共通）
 *
 * 13パターンの品質問題を検出し、JSON形式で出力する。
 * 学年はstatic/data/kanji-gN.jsonの存在で自動判定。
 *
 * Usage: node scripts/analyze-quality.cjs [--human]
 *   --human: 人間向けテキスト出力（デフォルトはJSON）
 */
const fs = require('fs');
const path = require('path');

// --- 学年自動判定 ---
const dataDir = path.join(__dirname, '..', 'static', 'data');
let grade = 0;
let kanjiDataFile = '';
for (let g = 1; g <= 6; g++) {
  const f = path.join(dataDir, `kanji-g${g}.json`);
  if (fs.existsSync(f)) {
    grade = g;
    kanjiDataFile = f;
    break;
  }
}
if (!grade) {
  console.error('Error: kanji-gN.json が見つかりません');
  process.exit(1);
}

const examples = JSON.parse(fs.readFileSync(path.join(dataDir, 'examples.json'), 'utf8'));
const kanjiData = JSON.parse(fs.readFileSync(kanjiDataFile, 'utf8'));

// --- ユーティリティ ---
function stripRuby(text) {
  return text.replace(/\[([^\]]+)\]/g, '');
}

function katakanaToHiragana(str) {
  return str.replace(/[\u30A1-\u30F6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

const dakuonMap = {
  'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご',
  'さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ',
  'た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど',
  'は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ'
};

const handakuonMap = {
  'は':'ぱ','ひ':'ぴ','ふ':'ぷ','へ':'ぺ','ほ':'ぽ'
};

/**
 * 音韻変化バリアントを生成（連濁・半濁音化・促音便）
 * 既知の読みから、熟語中で変化しうる形をすべて列挙する
 */
function phonologicalVariants(reading) {
  const variants = new Set([reading]);
  // 連濁: 語頭が清音→濁音 (か→が, さ→ざ, た→だ, は→ば)
  if (dakuonMap[reading[0]]) {
    variants.add(dakuonMap[reading[0]] + reading.slice(1));
  }
  // 半濁音化: は行→ぱ行
  if (handakuonMap[reading[0]]) {
    variants.add(handakuonMap[reading[0]] + reading.slice(1));
  }
  // 促音便: 末尾の つ/ち/く → っ (e.g. はつ→はっ, てつ→てっ, やく→やっ)
  const lastChar = reading[reading.length - 1];
  if ('つちく'.includes(lastChar) && reading.length > 1) {
    variants.add(reading.slice(0, -1) + 'っ');
  }
  // 促音便 + 半濁音化の複合 (e.g. はつ→はっ + は→ぱ → ぱっ は不要、語頭変化+末尾変化)
  // 語頭半濁音化 + 促音便
  if (handakuonMap[reading[0]] && 'つちく'.includes(lastChar) && reading.length > 1) {
    variants.add(handakuonMap[reading[0]] + reading.slice(1, -1) + 'っ');
  }
  // 語頭連濁 + 促音便
  if (dakuonMap[reading[0]] && 'つちく'.includes(lastChar) && reading.length > 1) {
    variants.add(dakuonMap[reading[0]] + reading.slice(1, -1) + 'っ');
  }
  return [...variants];
}

function readingVariants(reading) {
  const noDot = reading.replace(/\./g, '');
  const hira = katakanaToHiragana(noDot);
  const variants = new Set([noDot, hira]);
  if (dakuonMap[hira[0]]) variants.add(dakuonMap[hira[0]] + hira.slice(1));
  if (dakuonMap[noDot[0]]) variants.add(dakuonMap[noDot[0]] + noDot.slice(1));
  // 半濁音化バリアント
  if (handakuonMap[hira[0]]) variants.add(handakuonMap[hira[0]] + hira.slice(1));
  // 促音便バリアント (活用語尾の変化: かえる→かえって等)
  // reading に dot がある場合、語幹+促音便活用も生成
  if (reading.includes('.')) {
    const stem = katakanaToHiragana(reading.split('.')[0]);
    variants.add(stem);
    // 促音便活用: stem + って/った (e.g. かえ→かえっ)
    variants.add(stem + 'っ');
  }
  return [...variants];
}

// --- 漢字辞書構築 ---
const kanjiLookup = {};
const gradeKanjiSet = new Set();
kanjiData.forEach(k => {
  kanjiLookup[k.character] = {
    on: (k.readings.on || []).map(r => katakanaToHiragana(r.replace(/\./g, ''))),
    kun: (k.readings.kun || []).map(r => r.replace(/\./g, '')),
    onRaw: k.readings.on || [],
    kunRaw: k.readings.kun || []
  };
  gradeKanjiSet.add(k.character);
});

// --- 検出 ---
const issues = [];

function addIssue(patternId, priority, pattern, kanji, exId, detail) {
  issues.push({ patternId, priority, pattern, kanji, exId, ...detail });
}

// 例文重複検出用マップ（パターン3）
const sentenceMap = new Map();
examples.forEach(kanji => {
  kanji.examples.forEach(ex => {
    const key = ex.sentence;
    if (!sentenceMap.has(key)) sentenceMap.set(key, []);
    sentenceMap.get(key).push({ character: kanji.character, exId: ex.id });
  });
});

examples.forEach(kanji => {
  const char = kanji.character;
  const info = kanjiLookup[char] || { on: [], kun: [], onRaw: [], kunRaw: [] };
  const allReadings = [...info.on, ...info.kun];

  kanji.examples.forEach(ex => {
    const hiragana = ex.sentenceHiragana || '';
    const reading = ex.reading || '';
    const readingNoDot = reading.replace(/\./g, '');
    const readingHira = katakanaToHiragana(readingNoDot);
    const sentence = ex.sentence || '';
    const ruby = ex.sentenceWithRuby || '';

    // === P0: 致命的 ===

    // Pattern 1: sentenceHiragana未変換（漢字・カタカナが残存）
    if (hiragana) {
      // 許可: ひらがな, カタカナ, 句読点・記号, スペース, 数字, ー（長音）
      // カタカナ語（テレビ、メダル等）は小3ならカタカナで読めるため許可
      const remaining = hiragana.replace(/[\u3040-\u309F\u30A0-\u30FF\u3000-\u303F\s　。、！？「」（）・ー～…\d]/g, '');
      if (remaining.length > 0) {
        addIssue(1, 'P0', 'sentenceHiragana未変換', char, ex.id, {
          sentence, hiragana, nonHiragana: remaining
        });
      }
    }

    // Pattern 2: sentenceHiragana送り仮名重複
    // 「組む」→「くむむ」のような変換バグを検出
    // ただし「谷に」→「たにに」（読み+助詞）は正常なので除外
    if (reading.includes('.') && hiragana) {
      const parts = reading.split('.');
      const stem = parts[0];
      const okuri = parts.slice(1).join('');
      const doubled = stem + okuri + okuri;
      // 助詞と一致する送り仮名は誤検出が多いため除外
      const particles = new Set(['に', 'と', 'は', 'が', 'を', 'で', 'も', 'か', 'の', 'へ', 'ば']);
      const isParticleLike = particles.has(okuri);
      if (!isParticleLike && hiragana.includes(doubled)) {
        addIssue(2, 'P0', 'sentenceHiragana送り仮名重複', char, ex.id, {
          sentence, reading, hiragana, expected: stem + okuri, found: doubled
        });
      }
    }

    // === P1: 重要 ===

    // Pattern 3: 例文重複（異なる漢字間で同一sentence）
    const dupes = sentenceMap.get(sentence) || [];
    if (dupes.length > 1) {
      const first = dupes[0];
      if (first.character !== char || first.exId !== ex.id) {
        addIssue(3, 'P1', '例文重複', char, ex.id, {
          sentence, duplicateWith: first.character
        });
      }
    }

    // Pattern 4: readingが熟語全体
    // 熟語の複合読み（電車→でんしゃ）は正常。既知読みと全く無関係な場合のみ検出
    if (allReadings.length > 0) {
      const exactMatch = allReadings.some(r => r === readingHira);
      if (!exactMatch) {
        const maxLen = Math.max(...allReadings.map(r => r.length));
        if (readingHira.length > maxLen) {
          // 既知読み（濁音含む）が部分文字列として含まれるなら熟語の複合読み→正常
          const allWithDakuon = [];
          allReadings.forEach(r => {
            allWithDakuon.push(r);
            if (dakuonMap[r[0]]) allWithDakuon.push(dakuonMap[r[0]] + r.slice(1));
            // 逆引き: 濁音→清音
            for (const [k, v] of Object.entries(dakuonMap)) {
              if (r[0] === v) allWithDakuon.push(k + r.slice(1));
            }
          });
          // 活用形対応: 読みの語幹（ドット前）が既知読みの語幹と一致するかもチェック
          const readingStem = reading.includes('.') ? reading.split('.')[0] : '';
          const knownStems = [...(info.kunRaw || []), ...(info.onRaw || [])]
            .filter(r => r.includes('.'))
            .map(r => katakanaToHiragana(r.split('.')[0]));
          const hasSubstring = allWithDakuon.some(r => readingHira.includes(r));
          const stemMatch = readingStem && knownStems.some(s => s === readingStem);
          if (!hasSubstring && !stemMatch) {
            addIssue(4, 'P1', 'readingが熟語全体', char, ex.id, {
              sentence, reading, knownReadings: allReadings
            });
          }
        }
      }
    }

    // Pattern 5: 対象漢字sentence不在
    if (!sentence.includes(char)) {
      addIssue(5, 'P1', '対象漢字sentence不在', char, ex.id, { sentence });
    }

    // Pattern 6: ルビ除去≠原文
    if (ruby) {
      const rubyPlain = stripRuby(ruby);
      if (rubyPlain !== sentence) {
        addIssue(6, 'P1', 'ルビ除去≠原文', char, ex.id, {
          sentence, rubyPlain, ruby
        });
      }
    }

    // === P2: 中程度 ===

    // Pattern 7: reading/type誤り
    // 活用形（語幹一致）も考慮: くる.しく は くる.しい の活用 → kun
    if (ex.type === 'on' || ex.type === 'kun') {
      const readingStem = reading.includes('.') ? katakanaToHiragana(reading.split('.')[0]) : '';
      const onMatch = info.on.some(r =>
        readingHira === r || readingHira.startsWith(r)
      );
      const kunStems = (info.kunRaw || []).filter(r => r.includes('.')).map(r => r.split('.')[0]);
      const kunMatch = info.kun.some(r =>
        readingHira === r || readingHira.startsWith(r)
      ) || (readingStem && kunStems.some(s => s === readingStem));
      if (ex.type === 'on' && !onMatch && kunMatch) {
        addIssue(7, 'P2', 'reading/type誤り', char, ex.id, {
          sentence, reading, type: ex.type, suggestion: 'kun'
        });
      }
      if (ex.type === 'kun' && !kunMatch && onMatch) {
        addIssue(7, 'P2', 'reading/type誤り', char, ex.id, {
          sentence, reading, type: ex.type, suggestion: 'on'
        });
      }
    }

    // Pattern 8: sentenceWithRubyルビ欠落（同学年漢字のみ）
    if (ruby && sentence) {
      const kanjiInSentence = [...new Set(
        [...sentence].filter(ch =>
          /[\u4E00-\u9FFF]/.test(ch) && ch !== char && gradeKanjiSet.has(ch)
        )
      )];
      const rubyPairs = [];
      const rubyRegex = /([^\[\]\s。、！？]+)\[([^\]]+)\]/g;
      let m;
      while ((m = rubyRegex.exec(ruby)) !== null) {
        rubyPairs.push({ base: m[1], reading: m[2] });
      }
      kanjiInSentence.forEach(k => {
        const hasRuby = rubyPairs.some(p => p.base.includes(k));
        if (!hasRuby) {
          addIssue(8, 'P2', 'sentenceWithRubyルビ欠落', char, ex.id, {
            sentence, ruby, missingRubyFor: k
          });
        }
      });
    }

    // === P3: 軽微 ===

    // Pattern 9: readingドット記法欠落
    // sentenceで漢字の直後に送り仮名が実際に書かれている場合のみ検出
    // 「歌を きく」（名詞用法→ドット不要）vs「楽しい」（送り仮名あり→ドット必要）
    if (ex.type === 'kun' && !reading.includes('.')) {
      const kunWithDots = (info.kunRaw || []).filter(r => r.includes('.'));
      if (kunWithDots.length > 0) {
        const match = kunWithDots.find(r => {
          const stem = r.split('.')[0];
          return readingNoDot === r.replace(/\./g, '') || readingNoDot === stem;
        });
        if (match) {
          const expectedOkuri = match.split('.').slice(1).join('');
          const charIdx = sentence.indexOf(char);
          const afterChar = charIdx >= 0 ? sentence.slice(charIdx + 1) : '';
          // 漢字の直後に期待される送り仮名が実際にあるか確認
          if (afterChar.startsWith(expectedOkuri)) {
            addIssue(9, 'P3', 'readingドット記法欠落', char, ex.id, {
              sentence, reading, suggestedReading: match
            });
          }
        }
      }
    }

    // Pattern 10: targetWord破綻語
    if (ex.targetWord) {
      const twHiragana = [...ex.targetWord]
        .filter(ch => /[\u3040-\u309F]/.test(ch)).join('');
      if (twHiragana && allReadings.includes(twHiragana)) {
        addIssue(10, 'P3', 'targetWord破綻語', char, ex.id, {
          sentence, targetWord: ex.targetWord, hiraganaInTW: twHiragana
        });
      }
    }

    // Pattern 11: ルビ読み誤り
    if (ruby) {
      const rubyRegex2 = /([^\[\]\s。、！？]+)\[([^\]]+)\]/g;
      let rm;
      while ((rm = rubyRegex2.exec(ruby)) !== null) {
        const base = rm[1];
        const rReading = rm[2];
        // 単漢字ルビのみチェック（複合語は判定が複雑）
        if (base.length === 1 && /[\u4E00-\u9FFF]/.test(base)) {
          const kInfo = kanjiLookup[base];
          if (kInfo) {
            const allR = [...kInfo.on, ...kInfo.kun];
            const rHira = katakanaToHiragana(rReading);
            // 音韻変化を考慮したマッチング（連濁・半濁音化・促音便）
            const allVariants = allR.flatMap(r => phonologicalVariants(r));
            const matched = allVariants.some(r =>
              r === rHira || rHira.startsWith(r) || r.startsWith(rHira)
            );
            if (!matched) {
              addIssue(11, 'P3', 'ルビ読み誤り', char, ex.id, {
                sentence, ruby, rubyBase: base, rubyReading: rReading,
                knownReadings: allR
              });
            }
          }
        }
      }
    }

    // Pattern 12: 読み不一致
    if (hiragana && reading) {
      const variants = readingVariants(reading);
      // 音韻変化バリアントも追加（連濁・半濁音化・促音便）
      const phonoVariants = variants.flatMap(v => phonologicalVariants(v));
      const allVariants = [...new Set([...variants, ...phonoVariants])];
      if (!allVariants.some(v => hiragana.includes(v))) {
        addIssue(12, 'P3', '読み不一致', char, ex.id, {
          sentence, reading, hiragana
        });
      }
    }

    // Pattern 13: targetWord/sentence不一致
    // sentenceは低学年向けに非対象漢字をひらがな化するため、
    // targetWordの非対象漢字を.*に置換してマッチ
    if (ex.targetWord) {
      const twChars = [...ex.targetWord];
      const pattern = twChars.map(ch => {
        if (ch === char) return char;
        if (/[\u4E00-\u9FFF]/.test(ch)) return '.+';
        return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('');
      const twRegex = new RegExp(pattern);
      if (!twRegex.test(sentence)) {
        addIssue(13, 'P3', 'targetWord/sentence不一致', char, ex.id, {
          sentence, targetWord: ex.targetWord
        });
      }
    }
  });
});

// --- 出力 ---
const summary = { P0: 0, P1: 0, P2: 0, P3: 0 };
issues.forEach(i => summary[i.priority]++);
const totalExamples = examples.reduce((sum, k) => sum + k.examples.length, 0);

const result = {
  meta: { grade, totalKanji: examples.length, totalExamples, timestamp: new Date().toISOString() },
  summary,
  issues
};

if (process.argv.includes('--human')) {
  console.log(`=== 漢字例文品質分析 (${grade}年生) ===`);
  console.log(`漢字数: ${result.meta.totalKanji}  例文数: ${totalExamples}`);
  console.log(`\n--- サマリー ---`);
  console.log(`P0 (致命的): ${summary.P0}件`);
  console.log(`P1 (重要):   ${summary.P1}件`);
  console.log(`P2 (中程度): ${summary.P2}件`);
  console.log(`P3 (軽微):   ${summary.P3}件`);
  console.log(`合計: ${issues.length}件`);
  if (issues.length > 0) {
    console.log(`\n--- 詳細 ---`);
    ['P0', 'P1', 'P2', 'P3'].forEach(p => {
      const pIssues = issues.filter(i => i.priority === p);
      if (pIssues.length === 0) return;
      console.log(`\n[${p}] ${pIssues.length}件:`);
      pIssues.forEach(i => {
        console.log(`  #${i.patternId} ${i.pattern} | ${i.kanji} | ${i.exId}`);
        console.log(`    文: ${i.sentence}`);
        if (i.reading) console.log(`    読み: ${i.reading}`);
        if (i.hiragana) console.log(`    ひらがな: ${i.hiragana}`);
        if (i.ruby) console.log(`    ルビ: ${i.ruby}`);
        if (i.targetWord) console.log(`    targetWord: ${i.targetWord}`);
      });
    });
  }
} else {
  console.log(JSON.stringify(result, null, 2));
}

process.exit(issues.length > 0 ? 1 : 0);
