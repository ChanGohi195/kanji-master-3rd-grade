/**
 * ストローク構造解析 — 個別ストロークの存在・位置・方向を検証する純粋関数群
 * DOM不要。テスト可能。
 */

// ============================================================
// 定数
// ============================================================

const HANZI_GRID_SIZE = 1024;
const HANZI_Y_OFFSET = 900;

const POSITION_WEIGHT = 0.3;
const DIRECTION_WEIGHT = 0.3;
const SHAPE_WEIGHT = 0.4;

const MATCH_THRESHOLD = 0.35;
const MISSING_STROKE_RATIO = 0.4;
export const STROKE_REJECTION_CONFIDENCE = 0.2;

// ============================================================
// 型定義
// ============================================================

export interface BoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export interface ReferenceStroke {
	index: number;
	points: [number, number][];
	direction: [number, number];
	boundingBox: BoundingBox;
	length: number;
}

export interface UserStroke {
	index: number;
	points: [number, number][];
	direction: [number, number];
	boundingBox: BoundingBox;
	length: number;
}

export interface StrokeMatchResult {
	refIndex: number;
	userIndex: number;
	positionScore: number;
	directionScore: number;
	shapeScore: number;
	combinedScore: number;
}

export interface StrokeAnalysisResult {
	totalStrokes: number;
	matchedStrokes: number;
	unmatchedRefStrokes: number[];
	matches: StrokeMatchResult[];
	overallScore: number;
}

// ============================================================
// Step 1: 座標正規化
// ============================================================

/**
 * hanzi-writer-data の座標をキャンバス座標に変換
 * hanzi: 左下原点、Y上方向+、X:[0,1024], Y:[-50,900]
 * canvas: 左上原点、Y下方向+、[0, canvasSize]
 */
export function normalizeMedianPoint(
	point: [number, number],
	canvasSize = 240
): [number, number] {
	const scale = canvasSize / HANZI_GRID_SIZE;
	const x = point[0] * scale;
	const y = (HANZI_Y_OFFSET - point[1]) * scale;
	return [x, y];
}

export function normalizeMedians(
	medians: [number, number][][],
	canvasSize = 240
): [number, number][][] {
	return medians.map((stroke) =>
		stroke.map((pt) => normalizeMedianPoint(pt, canvasSize))
	);
}

// ============================================================
// Step 2: ストローク特徴抽出
// ============================================================

/**
 * ストロークの主方向ベクトル（始点→終点、正規化）
 */
export function computeDirection(points: [number, number][]): [number, number] {
	if (points.length < 2) return [0, 0];
	const first = points[0];
	const last = points[points.length - 1];
	const dx = last[0] - first[0];
	const dy = last[1] - first[1];
	const len = Math.sqrt(dx * dx + dy * dy);
	if (len < 1e-6) return [0, 0];
	return [dx / len, dy / len];
}

/**
 * バウンディングボックスを計算
 */
export function computeBoundingBox(points: [number, number][]): BoundingBox {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const [x, y] of points) {
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}
	return { minX, minY, maxX, maxY };
}

/**
 * ポリライン長（各セグメントの合計）
 */
export function computePolylineLength(points: [number, number][]): number {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		const dx = points[i][0] - points[i - 1][0];
		const dy = points[i][1] - points[i - 1][1];
		total += Math.sqrt(dx * dx + dy * dy);
	}
	return total;
}

/**
 * ストロークを最大maxPoints点にダウンサンプリング
 */
export function downsampleStroke(
	points: [number, number][],
	maxPoints = 20
): [number, number][] {
	if (points.length <= maxPoints) return points;
	const result: [number, number][] = [];
	const step = (points.length - 1) / (maxPoints - 1);
	for (let i = 0; i < maxPoints; i++) {
		const idx = Math.round(i * step);
		result.push(points[idx]);
	}
	return result;
}

/**
 * hanzi-writer-data の medians から ReferenceStroke[] を作成
 */
export function prepareReferenceStrokes(
	medians: [number, number][][],
	canvasSize = 240
): ReferenceStroke[] {
	const normalized = normalizeMedians(medians, canvasSize);
	return normalized.map((points, index) => {
		const sampled = downsampleStroke(points);
		return {
			index,
			points: sampled,
			direction: computeDirection(sampled),
			boundingBox: computeBoundingBox(sampled),
			length: computePolylineLength(sampled)
		};
	});
}

/**
 * ユーザー入力（number[][][]）から UserStroke[] を作成
 * WritingCanvas.getStrokes() → number[][][] : 各ストロークは [x, y, pressure][] の配列
 */
export function prepareUserStrokes(rawStrokes: number[][][]): UserStroke[] {
	return rawStrokes.map((stroke, index) => {
		const points: [number, number][] = stroke.map((pt) => [pt[0], pt[1]]);
		const sampled = downsampleStroke(points);
		return {
			index,
			points: sampled,
			direction: computeDirection(sampled),
			boundingBox: computeBoundingBox(sampled),
			length: computePolylineLength(sampled)
		};
	});
}

// ============================================================
// Step 3: スコアリング関数
// ============================================================

/**
 * バウンディングボックス同士のIoU
 */
export function bboxIoU(a: BoundingBox, b: BoundingBox): number {
	const interMinX = Math.max(a.minX, b.minX);
	const interMinY = Math.max(a.minY, b.minY);
	const interMaxX = Math.min(a.maxX, b.maxX);
	const interMaxY = Math.min(a.maxY, b.maxY);

	const interW = Math.max(0, interMaxX - interMinX);
	const interH = Math.max(0, interMaxY - interMinY);
	const interArea = interW * interH;

	const areaA = Math.max(0, a.maxX - a.minX) * Math.max(0, a.maxY - a.minY);
	const areaB = Math.max(0, b.maxX - b.minX) * Math.max(0, b.maxY - b.minY);
	const union = areaA + areaB - interArea;

	if (union <= 0) return 0;
	return interArea / union;
}

/**
 * 方向ベクトルの類似度（コサイン類似度を [0,1] に正規化）
 * 同方向=1, 直交=0.5, 反対=0
 */
export function directionSimilarity(
	a: [number, number],
	b: [number, number]
): number {
	const dot = a[0] * b[0] + a[1] * b[1];
	// dot ∈ [-1, 1] → [0, 1]
	return (dot + 1) / 2;
}

/**
 * 点pから線分(a,b)への最短距離
 */
export function pointToSegmentDistance(
	p: [number, number],
	a: [number, number],
	b: [number, number]
): number {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const lenSq = dx * dx + dy * dy;

	if (lenSq < 1e-10) {
		// a と b が同じ点
		const ex = p[0] - a[0];
		const ey = p[1] - a[1];
		return Math.sqrt(ex * ex + ey * ey);
	}

	let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));

	const projX = a[0] + t * dx;
	const projY = a[1] + t * dy;
	const ex = p[0] - projX;
	const ey = p[1] - projY;
	return Math.sqrt(ex * ex + ey * ey);
}

/**
 * points の各点から polyline への平均最短距離
 */
export function averagePointToPolylineDistance(
	points: [number, number][],
	polyline: [number, number][]
): number {
	if (points.length === 0 || polyline.length === 0) return Infinity;
	if (polyline.length === 1) {
		// 1点ポリライン
		let total = 0;
		for (const p of points) {
			const dx = p[0] - polyline[0][0];
			const dy = p[1] - polyline[0][1];
			total += Math.sqrt(dx * dx + dy * dy);
		}
		return total / points.length;
	}

	let totalDist = 0;
	for (const p of points) {
		let minDist = Infinity;
		for (let i = 0; i < polyline.length - 1; i++) {
			const d = pointToSegmentDistance(p, polyline[i], polyline[i + 1]);
			if (d < minDist) minDist = d;
		}
		totalDist += minDist;
	}
	return totalDist / points.length;
}

/**
 * ストロークペアのスコアリング
 * MAX_POINT_DISTANCE: 30 canvas pixels でスコア0に到達する距離
 */
export function scoreStrokePair(
	user: UserStroke,
	ref: ReferenceStroke
): StrokeMatchResult {
	const MAX_POINT_DISTANCE = 30;

	const positionScore = bboxIoU(user.boundingBox, ref.boundingBox);
	const dirScore = directionSimilarity(user.direction, ref.direction);

	// 双方向平均距離（ユーザー→参照 + 参照→ユーザー） / 2
	const distUserToRef = averagePointToPolylineDistance(user.points, ref.points);
	const distRefToUser = averagePointToPolylineDistance(ref.points, user.points);
	const avgDist = (distUserToRef + distRefToUser) / 2;
	const shapeScore = Math.max(0, 1 - avgDist / MAX_POINT_DISTANCE);

	const combinedScore =
		positionScore * POSITION_WEIGHT +
		dirScore * DIRECTION_WEIGHT +
		shapeScore * SHAPE_WEIGHT;

	return {
		refIndex: ref.index,
		userIndex: user.index,
		positionScore,
		directionScore: dirScore,
		shapeScore,
		combinedScore
	};
}

// ============================================================
// Step 4: マッチングアルゴリズム
// ============================================================

/**
 * 貪欲法でストロークをマッチングし、解析結果を返す
 */
export function matchStrokes(
	userStrokes: UserStroke[],
	refStrokes: ReferenceStroke[]
): StrokeAnalysisResult {
	if (refStrokes.length === 0) {
		return {
			totalStrokes: 0,
			matchedStrokes: 0,
			unmatchedRefStrokes: [],
			matches: [],
			overallScore: 0
		};
	}

	// 全ペアのスコアを計算
	const allPairs: StrokeMatchResult[] = [];
	for (const user of userStrokes) {
		for (const ref of refStrokes) {
			allPairs.push(scoreStrokePair(user, ref));
		}
	}

	// combinedScore降順ソート
	allPairs.sort((a, b) => b.combinedScore - a.combinedScore);

	// 貪欲マッチング
	const matchedUserIndices = new Set<number>();
	const matchedRefIndices = new Set<number>();
	const matches: StrokeMatchResult[] = [];

	for (const pair of allPairs) {
		if (matchedUserIndices.has(pair.userIndex)) continue;
		if (matchedRefIndices.has(pair.refIndex)) continue;
		if (pair.combinedScore < MATCH_THRESHOLD) continue;

		matches.push(pair);
		matchedUserIndices.add(pair.userIndex);
		matchedRefIndices.add(pair.refIndex);
	}

	const unmatchedRefStrokes = refStrokes
		.filter((r) => !matchedRefIndices.has(r.index))
		.map((r) => r.index);

	const scoreSum = matches.reduce((sum, m) => sum + m.combinedScore, 0);
	const overallScore = scoreSum / refStrokes.length;

	return {
		totalStrokes: refStrokes.length,
		matchedStrokes: matches.length,
		unmatchedRefStrokes,
		matches,
		overallScore
	};
}

/**
 * 統合API: 生のストロークデータとmediansからストローク解析結果を返す
 */
export function analyzeStrokes(
	userRawStrokes: number[][][],
	medians: [number, number][][],
	canvasSize = 240
): StrokeAnalysisResult {
	const userStrokes = prepareUserStrokes(userRawStrokes);
	const refStrokes = prepareReferenceStrokes(medians, canvasSize);
	return matchStrokes(userStrokes, refStrokes);
}

/**
 * ストローク解析ゲート判定: 未マッチ率が MISSING_STROKE_RATIO を超えたら reject
 */
export function shouldRejectByStrokeAnalysis(
	result: StrokeAnalysisResult
): boolean {
	if (result.totalStrokes === 0) return false;
	const missingRatio = result.unmatchedRefStrokes.length / result.totalStrokes;
	return missingRatio > MISSING_STROKE_RATIO;
}
