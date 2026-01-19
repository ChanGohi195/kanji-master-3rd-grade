// 漢字データ型
export interface Kanji {
	id: string;
	character: string;
	grade: number | null;
	strokeCount: number;
	readings: {
		on: string[];
		kun: string[];
	};
	meanings: string[];
	jlpt: number | null;
}

// 成長レベル（植物メタファー）
// 0: まだ (❓)
// 1: はじめて (🌱)
// 2: れんしゅうちゅう (🌿)
// 3: とくい (🌳)
// 4: マスター (🌸)
// 5: かんぺき (💮)
export type GrowthLevel = 0 | 1 | 2 | 3 | 4 | 5;

// 成長アイコンを取得
export function getGrowthIcon(level: GrowthLevel): string {
	const icons: Record<GrowthLevel, string> = {
		0: '❓',
		1: '🌱',
		2: '🌿',
		3: '🌳',
		4: '🌸',
		5: '💮'
	};
	return icons[level];
}

// 成長ラベルを取得（ひらがな）
export function getGrowthLabel(level: GrowthLevel): string {
	const labels: Record<GrowthLevel, string> = {
		0: 'まだ',
		1: 'はじめて',
		2: 'れんしゅうちゅう',
		3: 'とくい',
		4: 'マスター',
		5: 'かんぺき'
	};
	return labels[level];
}

// 読み方フォーマット
export function formatReadings(kanji: Kanji): string {
	const on = kanji.readings.on.join('・');
	const kun = kanji.readings.kun.join('・');
	const parts = [];
	if (on) parts.push(on);
	if (kun) parts.push(kun);
	return parts.join(' / ');
}

// 音声読み上げ用（すべての読みを返す）
export function getAllReadingsForSpeech(kanji: Kanji): string {
	const allReadings = [...kanji.readings.kun, ...kanji.readings.on];
	return allReadings.join('、');
}

// 代表的な読みを1つ返す（訓読み優先だが、なければ音読み）
export function getPrimaryReading(kanji: Kanji): string {
	return kanji.readings.kun[0] || kanji.readings.on[0] || '';
}
