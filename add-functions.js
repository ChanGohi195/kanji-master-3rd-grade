const fs = require('fs');
const content = fs.readFileSync('src/lib/types.ts', 'utf8');
const addition = `
// 音声読み上げ用（すべての読みを返す）
export function getAllReadingsForSpeech(kanji: Kanji): string {
	const allReadings = [...kanji.readings.kun, ...kanji.readings.on];
	return allReadings.join('、');
}

// 代表的な読みを1つ返す（訓読み優先だが、なければ音読み）
export function getPrimaryReading(kanji: Kanji): string {
	return kanji.readings.kun[0] || kanji.readings.on[0] || '';
}
`;
if (!content.includes('getAllReadingsForSpeech')) {
  fs.writeFileSync('src/lib/types.ts', content + addition);
  console.log('Added new functions');
} else {
  console.log('Functions already exist');
}
