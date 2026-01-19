import Dexie, { type Table } from 'dexie';
import type { GrowthLevel } from '../types';

// 学習記録
export interface StudyRecord {
	id?: number;
	kanjiId: string;
	mode: 'writing' | 'reading';
	result: 'correct' | 'close' | 'incorrect';
	score: number;
	hintUsed: boolean;
	timeSpent: number;
	timestamp: Date;
}

// 漢字ごとの進捗
export interface KanjiProgress {
	kanjiId: string;
	discoveredAt: Date | null;

	writingAttempts: number;
	writingCorrect: number;
	writingMastery: 0 | 1 | 2 | 3;

	readingAttempts: number;
	readingCorrect: number;
	readingMastery: 0 | 1 | 2 | 3;

	growthLevel: GrowthLevel;
	lastStudied: Date;

	// ぶんしょうモード進捗（例文IDベース）
	bunshoYomiCompleted: string[];
	bunshoKakiCompleted: string[];
	bunshoYomiLevel: GrowthLevel;
	bunshoKakiLevel: GrowthLevel;
}

class KanjiMasterDB extends Dexie {
	studyRecords!: Table<StudyRecord>;
	kanjiProgress!: Table<KanjiProgress>;

	constructor() {
		super('kanji-master-kids-g3');
		this.version(1).stores({
			studyRecords: '++id, kanjiId, mode, result, timestamp',
			kanjiProgress: 'kanjiId, growthLevel, lastStudied'
		});
		// Version 2: bunshoモード進捗追加
		this.version(2).stores({
			studyRecords: '++id, kanjiId, mode, result, timestamp',
			kanjiProgress: 'kanjiId, growthLevel, lastStudied, bunshoYomiLevel, bunshoKakiLevel'
		}).upgrade(tx => {
			return tx.table('kanjiProgress').toCollection().modify(progress => {
				progress.bunshoYomiCompleted = progress.bunshoYomiCompleted || [];
				progress.bunshoKakiCompleted = progress.bunshoKakiCompleted || [];
				progress.bunshoYomiLevel = progress.bunshoYomiLevel ?? 0;
				progress.bunshoKakiLevel = progress.bunshoKakiLevel ?? 0;
			});
		});
	}
}

export const db = new KanjiMasterDB();

// 学習記録を保存
export async function recordStudy(record: Omit<StudyRecord, 'id' | 'timestamp'> & { bonus?: number }) {
	const fullRecord: StudyRecord = {
		...record,
		timestamp: new Date()
	};

	await db.studyRecords.add(fullRecord);
	await updateProgress(record.kanjiId, record.mode, record.result, record.bonus ?? 1);
}

// ぶんしょうモードの学習記録を保存
export async function recordBunshoStudy(
	kanjiId: string,
	exampleId: string,
	mode: 'yomi' | 'kaki',
	isCorrect: boolean,
	totalExamples: number = 5
) {
	if (!isCorrect) return;

	let progress = await db.kanjiProgress.get(kanjiId);

	if (!progress) {
		progress = createEmptyProgress(kanjiId);
	}

	const completedField = mode === 'yomi' ? 'bunshoYomiCompleted' : 'bunshoKakiCompleted';
	const levelField = mode === 'yomi' ? 'bunshoYomiLevel' : 'bunshoKakiLevel';

	// まだ正解していない例文なら追加
	if (!progress[completedField].includes(exampleId)) {
		progress[completedField].push(exampleId);
		// 例文総数に対する正解率でレベルを計算（5段階）
		const completedCount = progress[completedField].length;
		const ratio = completedCount / totalExamples;
		let level: GrowthLevel;
		if (ratio >= 1.0) level = 5;      // 100% = 花丸
		else if (ratio >= 0.8) level = 4; // 80%以上
		else if (ratio >= 0.6) level = 3; // 60%以上
		else if (ratio >= 0.4) level = 2; // 40%以上
		else level = 1;                   // それ以下
		progress[levelField] = level;
	}

	progress.lastStudied = new Date();

	// ぶんしょうモードベースでgrowthLevelを更新
	progress.growthLevel = calculateGrowthLevelFromBunsho(progress.bunshoYomiLevel, progress.bunshoKakiLevel);

	await db.kanjiProgress.put(progress);
}

function createEmptyProgress(kanjiId: string): KanjiProgress {
	return {
		kanjiId,
		discoveredAt: new Date(),
		writingAttempts: 0,
		writingCorrect: 0,
		writingMastery: 0,
		readingAttempts: 0,
		readingCorrect: 0,
		readingMastery: 0,
		growthLevel: 1,
		lastStudied: new Date(),
		bunshoYomiCompleted: [],
		bunshoKakiCompleted: [],
		bunshoYomiLevel: 0,
		bunshoKakiLevel: 0
	};
}

// 進捗を更新
async function updateProgress(
	kanjiId: string,
	mode: 'writing' | 'reading',
	result: 'correct' | 'close' | 'incorrect',
	bonus: number = 1
) {
	let progress = await db.kanjiProgress.get(kanjiId);

	if (!progress) {
		progress = createEmptyProgress(kanjiId);
	}

	// モード別に更新
	if (mode === 'writing') {
		progress.writingAttempts++;
		if (result === 'correct') progress.writingCorrect += bonus;
	} else {
		progress.readingAttempts++;
		if (result === 'correct') progress.readingCorrect += bonus;
	}

	progress.lastStudied = new Date();

	// 習得レベルを計算
	progress.writingMastery = calculateModeMastery(progress.writingAttempts, progress.writingCorrect);
	progress.readingMastery = calculateModeMastery(progress.readingAttempts, progress.readingCorrect);
	progress.growthLevel = calculateGrowthLevel(progress.writingMastery, progress.readingMastery);

	await db.kanjiProgress.put(progress);
}

function calculateModeMastery(attempts: number, correct: number): 0 | 1 | 2 | 3 {
	// 試行回数ベースで習熟度を計算（正解率条件なし）
	// 練習した分だけ成長する設計
	if (attempts >= 10) return 3;  // 10回練習で花丸
	if (attempts >= 3) return 2;   // 3回練習でレベル2
	if (attempts >= 1) return 1;   // 1回練習でレベル1
	return 0;
}

function calculateGrowthLevel(writing: number, reading: number): GrowthLevel {
	const sum = writing + reading;
	if (sum === 0) return 0;
	if (writing === 3 && reading === 3) return 5;
	if (writing >= 2 && reading >= 2) return 4;
	if (writing >= 2 || reading >= 2) return 3;
	if (writing >= 1 || reading >= 1) return 2;
	return 1;
}

// ぶんしょうモードベースのgrowthLevel計算（新方式）
function calculateGrowthLevelFromBunsho(yomiLevel: GrowthLevel, kakiLevel: GrowthLevel): GrowthLevel {
	const min = Math.min(yomiLevel, kakiLevel);
	const max = Math.max(yomiLevel, kakiLevel);

	// 両方0なら未発見
	if (max === 0) return 0;
	// どちらか1つでも学習開始していれば1
	if (min === 0) return 1;
	// 両方の平均を使う（切り捨て）
	const avg = Math.floor((yomiLevel + kakiLevel) / 2);
	return Math.min(5, Math.max(1, avg)) as GrowthLevel;
}

// 進捗を取得
export async function getProgress(kanjiId: string): Promise<KanjiProgress | undefined> {
	return db.kanjiProgress.get(kanjiId);
}

// 全進捗を取得
export async function getAllProgress(): Promise<KanjiProgress[]> {
	return db.kanjiProgress.toArray();
}

// 成長レベル別にカウント
export async function getGrowthCounts(): Promise<Record<GrowthLevel, number>> {
	const all = await db.kanjiProgress.toArray();
	const counts: Record<GrowthLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
	for (const p of all) {
		counts[p.growthLevel]++;
	}
	return counts;
}

// 苦手な漢字を取得（書き取り）
export async function getWeakWritingKanji(kanjiIds: string[]): Promise<string[]> {
	const progressList = await db.kanjiProgress
		.where('kanjiId')
		.anyOf(kanjiIds)
		.toArray();

	return progressList
		.filter((p) => p.writingAttempts > 0 && p.writingCorrect / p.writingAttempts < 0.6)
		.sort((a, b) => (a.writingCorrect / a.writingAttempts) - (b.writingCorrect / b.writingAttempts))
		.map((p) => p.kanjiId);
}

// 苦手な漢字を取得（読み取り）
export async function getWeakReadingKanji(kanjiIds: string[]): Promise<string[]> {
	const progressList = await db.kanjiProgress
		.where('kanjiId')
		.anyOf(kanjiIds)
		.toArray();

	return progressList
		.filter((p) => p.readingAttempts > 0 && p.readingCorrect / p.readingAttempts < 0.6)
		.sort((a, b) => (a.readingCorrect / a.readingAttempts) - (b.readingCorrect / b.readingAttempts))
		.map((p) => p.kanjiId);
}

// 最近の学習記録
export async function getRecentRecords(limit: number = 20): Promise<StudyRecord[]> {
	return db.studyRecords.orderBy('timestamp').reverse().limit(limit).toArray();
}

// 日別の学習回数（ほごしゃモード用）
export async function getDailyStats(days: number = 7): Promise<{ date: string; count: number }[]> {
	const records = await db.studyRecords.toArray();
	const now = new Date();
	const stats: Map<string, number> = new Map();

	for (let i = 0; i < days; i++) {
		const d = new Date(now);
		d.setDate(d.getDate() - i);
		const key = d.toISOString().split('T')[0];
		stats.set(key, 0);
	}

	for (const r of records) {
		const key = r.timestamp.toISOString().split('T')[0];
		if (stats.has(key)) {
			stats.set(key, (stats.get(key) || 0) + 1);
		}
	}

	return Array.from(stats.entries())
		.map(([date, count]) => ({ date, count }))
		.reverse();
}

// データクリア
export async function clearAllData() {
	await db.studyRecords.clear();
	await db.kanjiProgress.clear();
}

// 総学習時間を取得（ミリ秒）
export async function getTotalStudyTime(): Promise<number> {
	const records = await db.studyRecords.toArray();
	return records.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
}

// 総問題数を取得
export async function getTotalQuestionCount(): Promise<number> {
	return db.studyRecords.count();
}

// 今日の学習統計を取得
export async function getTodayStats(): Promise<{ time: number; count: number }> {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const records = await db.studyRecords
		.where('timestamp')
		.aboveOrEqual(today)
		.toArray();

	return {
		time: records.reduce((sum, r) => sum + (r.timeSpent || 0), 0),
		count: records.length
	};
}
