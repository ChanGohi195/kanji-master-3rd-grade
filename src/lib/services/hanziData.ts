/**
 * hanzi-writer-data CDN からストロークデータを取得・キャッシュ
 */

export interface HanziWriterCharData {
	strokes: string[];
	medians: [number, number][][];
}

// 日本の新字体でhanzi-writer-dataに非対応の漢字
const UNSUPPORTED = new Set([
	'図', '売', '姉', '帰', '広', '戸', '楽', '歩', '毎', '絵', '読', '顔', '黒'
]);

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';

// in-memory キャッシュ
const cache = new Map<string, HanziWriterCharData | null>();

/**
 * ストロークデータが利用可能かどうか
 */
export function isStrokeDataSupported(char: string): boolean {
	return !UNSUPPORTED.has(char);
}

/**
 * CDN から漢字データを取得（キャッシュあり）
 * 非対応漢字やfetch失敗時は null を返す
 */
export async function fetchCharacterData(
	char: string
): Promise<HanziWriterCharData | null> {
	if (UNSUPPORTED.has(char)) return null;

	if (cache.has(char)) return cache.get(char)!;

	try {
		const res = await fetch(`${CDN_BASE}/${char}.json`);
		if (!res.ok) {
			cache.set(char, null);
			return null;
		}
		const data: HanziWriterCharData = await res.json();
		cache.set(char, data);
		return data;
	} catch {
		cache.set(char, null);
		return null;
	}
}
