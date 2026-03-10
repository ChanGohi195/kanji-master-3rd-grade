import { describe, it, expect } from 'vitest';
import {
	normalizeMedianPoint,
	normalizeMedians,
	computeDirection,
	computeBoundingBox,
	computePolylineLength,
	downsampleStroke,
	prepareReferenceStrokes,
	prepareUserStrokes,
	bboxIoU,
	directionSimilarity,
	pointToSegmentDistance,
	averagePointToPolylineDistance,
	scoreStrokePair,
	matchStrokes,
	analyzeStrokes,
	shouldRejectByStrokeAnalysis,
	STROKE_REJECTION_CONFIDENCE
} from './strokeAnalyzer';
import type { BoundingBox, ReferenceStroke, UserStroke } from './strokeAnalyzer';

// ============================================================
// 実データ: 「十」の hanzi-writer-data medians
// 横画: 左→右（Y≈442-505）
// 縦画: 上→下（X≈500, Y: 811→-33）
// ============================================================
const CROSS_MEDIANS: [number, number][][] = [
	// 横画
	[
		[51, 505],
		[277, 485],
		[522, 468],
		[770, 452],
		[955, 442]
	],
	// 縦画
	[
		[500, 811],
		[502, 593],
		[505, 344],
		[510, 73],
		[513, -33]
	]
];

// ============================================================
// Step 1: 座標正規化
// ============================================================
describe('normalizeMedianPoint', () => {
	it('hanzi原点(0, 900)がcanvas左上(0, 0)に変換される', () => {
		const [x, y] = normalizeMedianPoint([0, 900], 240);
		expect(x).toBeCloseTo(0, 1);
		expect(y).toBeCloseTo(0, 1);
	});

	it('hanzi (1024, 0) がcanvas右下付近に変換される', () => {
		const [x, y] = normalizeMedianPoint([1024, 0], 240);
		expect(x).toBeCloseTo(240, 1);
		// (900 - 0) * 240/1024 ≈ 210.9
		expect(y).toBeCloseTo(210.9, 0);
	});

	it('十の横画中心がcanvas中央付近に変換される', () => {
		// medians Y≈468（中間点）, X≈522
		const [x, y] = normalizeMedianPoint([522, 468], 240);
		// x: 522 * 240/1024 ≈ 122.3
		expect(x).toBeCloseTo(122.3, 0);
		// y: (900 - 468) * 240/1024 ≈ 101.25
		expect(y).toBeCloseTo(101.25, 0);
	});
});

describe('normalizeMedians', () => {
	it('十の2ストロークが正しく変換される', () => {
		const result = normalizeMedians(CROSS_MEDIANS, 240);
		expect(result).toHaveLength(2);
		expect(result[0]).toHaveLength(5); // 横画5点
		expect(result[1]).toHaveLength(5); // 縦画5点

		// 横画: Y座標が概ね水平（中央付近）
		const hYs = result[0].map(([, y]) => y);
		const hYRange = Math.max(...hYs) - Math.min(...hYs);
		expect(hYRange).toBeLessThan(20); // ほぼ水平

		// 縦画: X座標が概ね一定
		const vXs = result[1].map(([x]) => x);
		const vXRange = Math.max(...vXs) - Math.min(...vXs);
		expect(vXRange).toBeLessThan(5); // ほぼ垂直
	});
});

// ============================================================
// Step 2: ストローク特徴抽出
// ============================================================
describe('computeDirection', () => {
	it('水平右向きストロークは[1,0]に近い', () => {
		const points: [number, number][] = [
			[0, 100],
			[50, 100],
			[100, 100]
		];
		const [dx, dy] = computeDirection(points);
		expect(dx).toBeCloseTo(1, 5);
		expect(dy).toBeCloseTo(0, 5);
	});

	it('垂直下向きストロークは[0,1]に近い', () => {
		const points: [number, number][] = [
			[100, 0],
			[100, 50],
			[100, 100]
		];
		const [dx, dy] = computeDirection(points);
		expect(dx).toBeCloseTo(0, 5);
		expect(dy).toBeCloseTo(1, 5);
	});

	it('左下向きストロークは[-0.707, 0.707]に近い', () => {
		const points: [number, number][] = [
			[100, 0],
			[50, 50],
			[0, 100]
		];
		const [dx, dy] = computeDirection(points);
		expect(dx).toBeCloseTo(-Math.SQRT1_2, 3);
		expect(dy).toBeCloseTo(Math.SQRT1_2, 3);
	});

	it('1点のストロークは[0,0]を返す', () => {
		const [dx, dy] = computeDirection([[50, 50]]);
		expect(dx).toBe(0);
		expect(dy).toBe(0);
	});

	it('空配列は[0,0]を返す', () => {
		const [dx, dy] = computeDirection([]);
		expect(dx).toBe(0);
		expect(dy).toBe(0);
	});
});

describe('computeBoundingBox', () => {
	it('正しいバウンディングボックスを返す', () => {
		const points: [number, number][] = [
			[10, 20],
			[50, 80],
			[30, 50]
		];
		const bb = computeBoundingBox(points);
		expect(bb.minX).toBe(10);
		expect(bb.minY).toBe(20);
		expect(bb.maxX).toBe(50);
		expect(bb.maxY).toBe(80);
	});
});

describe('computePolylineLength', () => {
	it('水平線の長さを正しく計算', () => {
		const points: [number, number][] = [
			[0, 0],
			[100, 0]
		];
		expect(computePolylineLength(points)).toBeCloseTo(100, 5);
	});

	it('折れ線の長さを正しく計算', () => {
		const points: [number, number][] = [
			[0, 0],
			[100, 0],
			[100, 100]
		];
		expect(computePolylineLength(points)).toBeCloseTo(200, 5);
	});

	it('1点は長さ0', () => {
		expect(computePolylineLength([[50, 50]])).toBe(0);
	});
});

describe('downsampleStroke', () => {
	it('maxPoints以下ならそのまま返す', () => {
		const points: [number, number][] = [
			[0, 0],
			[1, 1],
			[2, 2]
		];
		expect(downsampleStroke(points, 5)).toEqual(points);
	});

	it('maxPointsを超えるとサンプリングされる', () => {
		const points: [number, number][] = Array.from({ length: 100 }, (_, i) => [i, i]);
		const sampled = downsampleStroke(points, 10);
		expect(sampled).toHaveLength(10);
		// 始点と終点は保持
		expect(sampled[0]).toEqual([0, 0]);
		expect(sampled[9]).toEqual([99, 99]);
	});
});

describe('prepareReferenceStrokes', () => {
	it('十のmediansから2つのReferenceStrokeを作成', () => {
		const refs = prepareReferenceStrokes(CROSS_MEDIANS, 240);
		expect(refs).toHaveLength(2);

		// 横画: 方向が右向き
		expect(refs[0].direction[0]).toBeGreaterThan(0.9); // ほぼ右
		expect(Math.abs(refs[0].direction[1])).toBeLessThan(0.2); // ほぼ水平

		// 縦画: 方向が下向き
		expect(Math.abs(refs[1].direction[0])).toBeLessThan(0.1); // ほぼ垂直
		expect(refs[1].direction[1]).toBeGreaterThan(0.9); // 下向き

		// 長さは正の値
		expect(refs[0].length).toBeGreaterThan(0);
		expect(refs[1].length).toBeGreaterThan(0);
	});
});

describe('prepareUserStrokes', () => {
	it('number[][][]からUserStroke[]を作成（pressureは無視）', () => {
		const raw: number[][][] = [
			[
				[10, 100, 0.5],
				[50, 100, 0.7],
				[200, 100, 0.6]
			],
			[
				[120, 10, 0.5],
				[120, 120, 0.8],
				[120, 220, 0.6]
			]
		];
		const strokes = prepareUserStrokes(raw);
		expect(strokes).toHaveLength(2);

		// 横画
		expect(strokes[0].direction[0]).toBeGreaterThan(0.9);
		expect(Math.abs(strokes[0].direction[1])).toBeLessThan(0.1);

		// 縦画
		expect(Math.abs(strokes[1].direction[0])).toBeLessThan(0.1);
		expect(strokes[1].direction[1]).toBeGreaterThan(0.9);
	});
});

// ============================================================
// Step 3: スコアリング関数
// ============================================================
describe('bboxIoU', () => {
	it('完全一致はIoU=1', () => {
		const bb: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
		expect(bboxIoU(bb, bb)).toBeCloseTo(1.0, 5);
	});

	it('重ならないBBはIoU=0', () => {
		const a: BoundingBox = { minX: 0, minY: 0, maxX: 50, maxY: 50 };
		const b: BoundingBox = { minX: 60, minY: 60, maxX: 100, maxY: 100 };
		expect(bboxIoU(a, b)).toBe(0);
	});

	it('半分重なるBBは0〜1の間', () => {
		const a: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
		const b: BoundingBox = { minX: 50, minY: 0, maxX: 150, maxY: 100 };
		// intersection: 50*100=5000, union: 10000+10000-5000=15000 → 1/3
		expect(bboxIoU(a, b)).toBeCloseTo(1 / 3, 3);
	});

	it('面積0のBBはIoU=0', () => {
		const a: BoundingBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
		const b: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
		expect(bboxIoU(a, b)).toBe(0);
	});
});

describe('directionSimilarity', () => {
	it('同方向は1.0', () => {
		expect(directionSimilarity([1, 0], [1, 0])).toBeCloseTo(1.0, 5);
	});

	it('反対方向は0.0', () => {
		expect(directionSimilarity([1, 0], [-1, 0])).toBeCloseTo(0.0, 5);
	});

	it('直交は0.5', () => {
		expect(directionSimilarity([1, 0], [0, 1])).toBeCloseTo(0.5, 5);
	});
});

describe('pointToSegmentDistance', () => {
	it('線分上の点は距離0', () => {
		expect(pointToSegmentDistance([50, 0], [0, 0], [100, 0])).toBeCloseTo(0, 5);
	});

	it('線分からの垂直距離を正しく計算', () => {
		expect(pointToSegmentDistance([50, 10], [0, 0], [100, 0])).toBeCloseTo(10, 5);
	});

	it('線分の端点外の点は端点への距離', () => {
		// 点(110, 0)から線分(0,0)-(100,0)の距離 = 10
		expect(pointToSegmentDistance([110, 0], [0, 0], [100, 0])).toBeCloseTo(10, 5);
	});

	it('同一点の線分への距離', () => {
		expect(pointToSegmentDistance([10, 10], [0, 0], [0, 0])).toBeCloseTo(
			Math.sqrt(200),
			3
		);
	});
});

describe('averagePointToPolylineDistance', () => {
	it('ポリライン上の点は平均距離0', () => {
		const points: [number, number][] = [
			[25, 0],
			[50, 0],
			[75, 0]
		];
		const polyline: [number, number][] = [
			[0, 0],
			[100, 0]
		];
		expect(averagePointToPolylineDistance(points, polyline)).toBeCloseTo(0, 5);
	});

	it('ポリラインから等距離の点は一定の平均距離', () => {
		const points: [number, number][] = [
			[25, 10],
			[50, 10],
			[75, 10]
		];
		const polyline: [number, number][] = [
			[0, 0],
			[100, 0]
		];
		expect(averagePointToPolylineDistance(points, polyline)).toBeCloseTo(10, 5);
	});
});

describe('scoreStrokePair', () => {
	it('同一ストロークは高スコア', () => {
		// 多少の太さを持たせて BB が面積を持つようにする
		const points: [number, number][] = [
			[10, 95],
			[120, 100],
			[230, 105]
		];
		const ref: ReferenceStroke = {
			index: 0,
			points,
			direction: computeDirection(points),
			boundingBox: computeBoundingBox(points),
			length: computePolylineLength(points)
		};
		const user: UserStroke = { ...ref, index: 0 };
		const result = scoreStrokePair(user, ref);
		expect(result.combinedScore).toBeGreaterThan(0.8);
		expect(result.positionScore).toBeCloseTo(1.0, 3);
		expect(result.directionScore).toBeCloseTo(1.0, 3);
		expect(result.shapeScore).toBeCloseTo(1.0, 3);
	});

	it('反対方向のストロークは低directionScore', () => {
		// Y方向にも広がりを持たせてBBに面積を持たせる
		const refPts: [number, number][] = [
			[10, 95],
			[120, 105],
			[230, 95]
		];
		const userPts: [number, number][] = [
			[230, 95],
			[120, 105],
			[10, 95]
		];
		const ref: ReferenceStroke = {
			index: 0,
			points: refPts,
			direction: computeDirection(refPts),
			boundingBox: computeBoundingBox(refPts),
			length: computePolylineLength(refPts)
		};
		const user: UserStroke = {
			index: 0,
			points: userPts,
			direction: computeDirection(userPts),
			boundingBox: computeBoundingBox(userPts),
			length: computePolylineLength(userPts)
		};
		const result = scoreStrokePair(user, ref);
		expect(result.directionScore).toBeCloseTo(0, 2);
		// position は同じBBなので高い
		expect(result.positionScore).toBeCloseTo(1.0, 3);
	});

	it('遠く離れたストロークは低positionScore', () => {
		const refPts: [number, number][] = [
			[10, 10],
			[50, 10]
		];
		const userPts: [number, number][] = [
			[180, 200],
			[230, 200]
		];
		const ref: ReferenceStroke = {
			index: 0,
			points: refPts,
			direction: computeDirection(refPts),
			boundingBox: computeBoundingBox(refPts),
			length: computePolylineLength(refPts)
		};
		const user: UserStroke = {
			index: 0,
			points: userPts,
			direction: computeDirection(userPts),
			boundingBox: computeBoundingBox(userPts),
			length: computePolylineLength(userPts)
		};
		const result = scoreStrokePair(user, ref);
		expect(result.positionScore).toBe(0);
	});
});

// ============================================================
// Step 4: マッチングアルゴリズム
// ============================================================
describe('matchStrokes', () => {
	// 合成「十」パターン: 横画と縦画
	function makeCrossStrokes() {
		const hPts: [number, number][] = [
			[10, 110],
			[120, 110],
			[230, 110]
		];
		const vPts: [number, number][] = [
			[120, 10],
			[120, 120],
			[120, 230]
		];
		const refs: ReferenceStroke[] = [
			{
				index: 0,
				points: hPts,
				direction: computeDirection(hPts),
				boundingBox: computeBoundingBox(hPts),
				length: computePolylineLength(hPts)
			},
			{
				index: 1,
				points: vPts,
				direction: computeDirection(vPts),
				boundingBox: computeBoundingBox(vPts),
				length: computePolylineLength(vPts)
			}
		];
		return refs;
	}

	it('正しい十字は2画マッチ', () => {
		const refs = makeCrossStrokes();
		// ユーザーも同じ十字を書く
		const userH: UserStroke = {
			index: 0,
			points: [
				[15, 112],
				[115, 108],
				[225, 112]
			],
			direction: computeDirection([
				[15, 112],
				[115, 108],
				[225, 112]
			]),
			boundingBox: computeBoundingBox([
				[15, 112],
				[115, 108],
				[225, 112]
			]),
			length: computePolylineLength([
				[15, 112],
				[115, 108],
				[225, 112]
			])
		};
		const userV: UserStroke = {
			index: 1,
			points: [
				[118, 15],
				[120, 115],
				[122, 225]
			],
			direction: computeDirection([
				[118, 15],
				[120, 115],
				[122, 225]
			]),
			boundingBox: computeBoundingBox([
				[118, 15],
				[120, 115],
				[122, 225]
			]),
			length: computePolylineLength([
				[118, 15],
				[120, 115],
				[122, 225]
			])
		};

		const result = matchStrokes([userH, userV], refs);
		expect(result.matchedStrokes).toBe(2);
		expect(result.unmatchedRefStrokes).toHaveLength(0);
		expect(result.overallScore).toBeGreaterThan(0.6);
	});

	it('1画欠損（縦画のみ）は1画マッチ、横画が未マッチ', () => {
		const refs = makeCrossStrokes();
		const userV: UserStroke = {
			index: 0,
			points: [
				[118, 15],
				[120, 115],
				[122, 225]
			],
			direction: computeDirection([
				[118, 15],
				[120, 115],
				[122, 225]
			]),
			boundingBox: computeBoundingBox([
				[118, 15],
				[120, 115],
				[122, 225]
			]),
			length: computePolylineLength([
				[118, 15],
				[120, 115],
				[122, 225]
			])
		};

		const result = matchStrokes([userV], refs);
		expect(result.matchedStrokes).toBe(1);
		expect(result.unmatchedRefStrokes).toContain(0); // 横画が未マッチ
		expect(result.overallScore).toBeLessThan(0.6);
	});

	it('スクリブル（斜め線1本）は低スコア', () => {
		const refs = makeCrossStrokes();
		const scribble: UserStroke = {
			index: 0,
			points: [
				[0, 0],
				[120, 120],
				[240, 240]
			],
			direction: computeDirection([
				[0, 0],
				[120, 120],
				[240, 240]
			]),
			boundingBox: computeBoundingBox([
				[0, 0],
				[120, 120],
				[240, 240]
			]),
			length: computePolylineLength([
				[0, 0],
				[120, 120],
				[240, 240]
			])
		};

		const result = matchStrokes([scribble], refs);
		// 斜め線は横画・縦画どちらとも方向が合わない
		expect(result.overallScore).toBeLessThan(0.4);
	});

	it('空の参照ストロークはスコア0', () => {
		const result = matchStrokes([], []);
		expect(result.totalStrokes).toBe(0);
		expect(result.overallScore).toBe(0);
	});
});

describe('analyzeStrokes', () => {
	it('実際の十のmediansで十字を書くと高スコア', () => {
		// ユーザー入力: 横画と縦画（canvas座標、pressure付き）
		const userRaw: number[][][] = [
			// 横画 (y≈100, 中央付近)
			[
				[12, 100, 0.5],
				[60, 98, 0.7],
				[120, 100, 0.8],
				[180, 102, 0.7],
				[224, 100, 0.5]
			],
			// 縦画 (x≈117, 上→下)
			[
				[117, 20, 0.5],
				[118, 60, 0.7],
				[117, 120, 0.8],
				[118, 180, 0.7],
				[117, 220, 0.5]
			]
		];
		const result = analyzeStrokes(userRaw, CROSS_MEDIANS, 240);
		expect(result.matchedStrokes).toBe(2);
		expect(result.overallScore).toBeGreaterThan(0.5);
	});

	it('横画だけ書くと縦画が未マッチ', () => {
		const userRaw: number[][][] = [
			[
				[12, 100, 0.5],
				[120, 100, 0.8],
				[224, 100, 0.5]
			]
		];
		const result = analyzeStrokes(userRaw, CROSS_MEDIANS, 240);
		expect(result.matchedStrokes).toBe(1);
		expect(result.unmatchedRefStrokes).toHaveLength(1);
	});
});

describe('shouldRejectByStrokeAnalysis', () => {
	it('未マッチ率40%超でreject', () => {
		expect(
			shouldRejectByStrokeAnalysis({
				totalStrokes: 10,
				matchedStrokes: 5,
				unmatchedRefStrokes: [0, 1, 2, 3, 4],
				matches: [],
				overallScore: 0.3
			})
		).toBe(true);
	});

	it('未マッチ率40%以下はpass', () => {
		expect(
			shouldRejectByStrokeAnalysis({
				totalStrokes: 10,
				matchedStrokes: 7,
				unmatchedRefStrokes: [0, 1, 2],
				matches: [],
				overallScore: 0.5
			})
		).toBe(false);
	});

	it('40%ちょうどはpass', () => {
		expect(
			shouldRejectByStrokeAnalysis({
				totalStrokes: 10,
				matchedStrokes: 6,
				unmatchedRefStrokes: [0, 1, 2, 3],
				matches: [],
				overallScore: 0.4
			})
		).toBe(false);
	});

	it('ストローク0はpass（フォールバック）', () => {
		expect(
			shouldRejectByStrokeAnalysis({
				totalStrokes: 0,
				matchedStrokes: 0,
				unmatchedRefStrokes: [],
				matches: [],
				overallScore: 0
			})
		).toBe(false);
	});
});

describe('STROKE_REJECTION_CONFIDENCE', () => {
	it('定数値は0.2', () => {
		expect(STROKE_REJECTION_CONFIDENCE).toBe(0.2);
	});
});
