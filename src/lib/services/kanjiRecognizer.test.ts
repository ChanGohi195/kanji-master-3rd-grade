import { describe, it, expect } from 'vitest';
import {
	cosineSimilarity,
	softF1,
	binarize,
	calculateIoU,
	calculateCoverage,
	detectEdges,
	calculateDensity,
	calculateSpatialVariance,
	structuralSimilarity,
	findBoundingBox,
	normalizeImage,
	bilinearSample,
	gaussianBlur,
	preprocessImage,
	recognizeKanji
} from './kanjiRecognizer';

// --- ヘルパー ---

/** 指定サイズの空（ゼロ）画像を作成 */
function createBlankImage(size: number): Float32Array {
	return new Float32Array(size * size);
}

/** 全ピクセルが指定値の画像を作成 */
function createFilledImage(size: number, value: number): Float32Array {
	const img = new Float32Array(size * size);
	img.fill(value);
	return img;
}

/** 中央に正方形ブロックを描いた画像を作成 */
function createCenteredBlock(size: number, blockSize: number, value = 1.0): Float32Array {
	const img = createBlankImage(size);
	const offset = Math.floor((size - blockSize) / 2);
	for (let y = offset; y < offset + blockSize; y++) {
		for (let x = offset; x < offset + blockSize; x++) {
			img[y * size + x] = value;
		}
	}
	return img;
}

/** 指定位置にブロックを描いた画像を作成 */
function createBlockAt(
	size: number,
	blockSize: number,
	offsetX: number,
	offsetY: number,
	value = 1.0
): Float32Array {
	const img = createBlankImage(size);
	for (let y = offsetY; y < Math.min(offsetY + blockSize, size); y++) {
		for (let x = offsetX; x < Math.min(offsetX + blockSize, size); x++) {
			img[y * size + x] = value;
		}
	}
	return img;
}

/** ぐるぐるスクリブル画像を作成（キャンバスを一様に埋める） */
function createScribbleImage(size: number, density = 0.6): Float32Array {
	const img = createBlankImage(size);
	// キャンバス全体に一様にストロークを分散
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			// 波状パターンで一様に埋める
			const wave = Math.sin(x * 0.8) * Math.cos(y * 0.8);
			const noise = Math.sin(x * 2.3 + y * 1.7) * 0.3;
			img[y * size + x] = Math.max(0, Math.min(1, (wave + noise + 0.5) * density));
		}
	}
	return img;
}

/** 十字パターンを作成（漢字の画構造を模擬） */
function createCrossPattern(size: number, thickness = 2): Float32Array {
	const img = createBlankImage(size);
	const center = Math.floor(size / 2);
	// 横線
	for (let y = center - Math.floor(thickness / 2); y < center + Math.ceil(thickness / 2); y++) {
		for (let x = Math.floor(size * 0.1); x < Math.floor(size * 0.9); x++) {
			if (y >= 0 && y < size) img[y * size + x] = 1.0;
		}
	}
	// 縦線
	for (let x = center - Math.floor(thickness / 2); x < center + Math.ceil(thickness / 2); x++) {
		for (let y = Math.floor(size * 0.1); y < Math.floor(size * 0.9); y++) {
			if (x >= 0 && x < size) img[y * size + x] = 1.0;
		}
	}
	return img;
}

// =============================================================
// cosineSimilarity
// =============================================================
describe('cosineSimilarity', () => {
	it('同一ベクトルは1.0を返す', () => {
		const v = new Float32Array([1, 2, 3, 4]);
		expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
	});

	it('直交ベクトルは0.0を返す', () => {
		const a = new Float32Array([1, 0, 0, 0]);
		const b = new Float32Array([0, 1, 0, 0]);
		expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
	});

	it('ゼロベクトルは0.0を返す', () => {
		const zero = new Float32Array([0, 0, 0, 0]);
		const v = new Float32Array([1, 2, 3, 4]);
		expect(cosineSimilarity(zero, v)).toBe(0);
		expect(cosineSimilarity(v, zero)).toBe(0);
		expect(cosineSimilarity(zero, zero)).toBe(0);
	});

	it('反対方向のベクトルは-1.0を返す', () => {
		const a = new Float32Array([1, 0]);
		const b = new Float32Array([-1, 0]);
		expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
	});

	it('スカラー倍のベクトルは1.0を返す', () => {
		const a = new Float32Array([1, 2, 3]);
		const b = new Float32Array([2, 4, 6]);
		expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
	});
});

// =============================================================
// calculateDensity
// =============================================================
describe('calculateDensity', () => {
	it('全白（ゼロ）画像は0.0を返す', () => {
		expect(calculateDensity(createBlankImage(8))).toBe(0);
	});

	it('全黒（1.0）画像は1.0を返す', () => {
		expect(calculateDensity(createFilledImage(8, 1.0))).toBeCloseTo(1.0, 5);
	});

	it('半分塗りつぶしは約0.5を返す', () => {
		const size = 8;
		const img = createBlankImage(size);
		// 上半分を塗る
		for (let i = 0; i < (size * size) / 2; i++) {
			img[i] = 1.0;
		}
		expect(calculateDensity(img)).toBeCloseTo(0.5, 5);
	});
});

// =============================================================
// detectEdges
// =============================================================
describe('detectEdges', () => {
	it('均一画像はエッジ0を返す', () => {
		const size = 16;
		const img = createFilledImage(size, 0.5);
		const edges = detectEdges(img, size);
		// 全ピクセルが同値ならエッジは0
		for (let i = 0; i < edges.length; i++) {
			expect(edges[i]).toBeCloseTo(0, 5);
		}
	});

	it('明確な境界でエッジを検出する', () => {
		const size = 16;
		const img = createBlankImage(size);
		// 左半分を黒に
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size / 2; x++) {
				img[y * size + x] = 1.0;
			}
		}
		const edges = detectEdges(img, size);
		// 境界付近（x=7,8あたり）でエッジ値が高いはず
		const boundaryEdge = edges[8 * size + 8]; // y=8, x=8
		const interiorEdge = edges[8 * size + 2]; // y=8, x=2（内部）
		expect(boundaryEdge).toBeGreaterThan(interiorEdge);
	});

	it('境界ピクセル（y=0, y=size-1, x=0, x=size-1）は0のまま', () => {
		const size = 8;
		const img = createCenteredBlock(size, 4);
		const edges = detectEdges(img, size);
		// 境界行は処理しないので0のまま
		for (let x = 0; x < size; x++) {
			expect(edges[0 * size + x]).toBe(0); // y=0
			expect(edges[(size - 1) * size + x]).toBe(0); // y=size-1
		}
	});
});

// =============================================================
// structuralSimilarity
// =============================================================
describe('structuralSimilarity', () => {
	it('同一画像は高スコアを返す', () => {
		const size = 16;
		const img = createCenteredBlock(size, 8);
		const score = structuralSimilarity(img, img, size);
		expect(score).toBeCloseTo(1.0, 5);
	});

	it('全く異なる画像は低スコアを返す', () => {
		const size = 16;
		const a = createBlockAt(size, 4, 0, 0);
		const b = createBlockAt(size, 4, 12, 12);
		const score = structuralSimilarity(a, b, size);
		expect(score).toBeLessThan(0.5);
	});
});

// =============================================================
// findBoundingBox
// =============================================================
describe('findBoundingBox', () => {
	it('中央ブロックの正確なバウンディングボックスを返す', () => {
		const size = 16;
		const img = createCenteredBlock(size, 6);
		const bbox = findBoundingBox(img, size);
		expect(bbox.minX).toBe(5);
		expect(bbox.minY).toBe(5);
		expect(bbox.maxX).toBe(10);
		expect(bbox.maxY).toBe(10);
	});

	it('左上のブロックを正しく検出する', () => {
		const size = 16;
		const img = createBlockAt(size, 4, 1, 2);
		const bbox = findBoundingBox(img, size);
		expect(bbox.minX).toBe(1);
		expect(bbox.minY).toBe(2);
		expect(bbox.maxX).toBe(4);
		expect(bbox.maxY).toBe(5);
	});

	it('空画像は全体を返す', () => {
		const size = 16;
		const img = createBlankImage(size);
		const bbox = findBoundingBox(img, size);
		expect(bbox.minX).toBe(0);
		expect(bbox.minY).toBe(0);
		expect(bbox.maxX).toBe(15);
		expect(bbox.maxY).toBe(15);
	});
});

// =============================================================
// bilinearSample
// =============================================================
describe('bilinearSample', () => {
	it('整数座標はそのピクセル値を返す', () => {
		const size = 4;
		const img = createBlankImage(size);
		img[1 * size + 2] = 0.8; // (2,1)
		expect(bilinearSample(img, size, 2, 1)).toBeCloseTo(0.8, 5);
	});

	it('ピクセル間は補間値を返す', () => {
		const size = 4;
		const img = createBlankImage(size);
		img[0 * size + 0] = 1.0; // (0,0)=1
		img[0 * size + 1] = 0.0; // (1,0)=0
		// x=0.5, y=0の場合、v00=1, v10=0 → 0.5
		expect(bilinearSample(img, size, 0.5, 0)).toBeCloseTo(0.5, 5);
	});

	it('範囲外の座標は0を返す', () => {
		const size = 4;
		const img = createFilledImage(size, 1.0);
		expect(bilinearSample(img, size, -1, 0)).toBe(0);
		expect(bilinearSample(img, size, 0, -1)).toBe(0);
	});
});

// =============================================================
// normalizeImage
// =============================================================
describe('normalizeImage', () => {
	it('中央配置のブロックは正規化後も中央にある', () => {
		const size = 32;
		const img = createCenteredBlock(size, 10);
		const normalized = normalizeImage(img, size);
		const density = calculateDensity(normalized);
		// 正規化後も描画内容は残っている
		expect(density).toBeGreaterThan(0);
	});

	it('左上に偏ったブロックが正規化後に中央寄りになる', () => {
		const size = 32;
		const img = createBlockAt(size, 8, 0, 0);
		const normalized = normalizeImage(img, size);

		// 正規化前: 左上に集中
		const origBbox = findBoundingBox(img, size);
		// 正規化後: 中央に寄る
		const normBbox = findBoundingBox(normalized, size);

		const origCenterX = (origBbox.minX + origBbox.maxX) / 2;
		const normCenterX = (normBbox.minX + normBbox.maxX) / 2;
		const canvasCenter = size / 2;

		// 正規化後の中心がキャンバス中央に近くなっている
		expect(Math.abs(normCenterX - canvasCenter)).toBeLessThan(
			Math.abs(origCenterX - canvasCenter)
		);
	});

	it('小さいブロックが正規化後に拡大される', () => {
		const size = 32;
		const img = createCenteredBlock(size, 4);
		const normalized = normalizeImage(img, size);

		const origBbox = findBoundingBox(img, size);
		const normBbox = findBoundingBox(normalized, size);

		const origWidth = origBbox.maxX - origBbox.minX;
		const normWidth = normBbox.maxX - normBbox.minX;

		// 正規化後はターゲットサイズに拡大されている
		expect(normWidth).toBeGreaterThan(origWidth);
	});

	it('空画像はそのまま返す', () => {
		const size = 16;
		const img = createBlankImage(size);
		const normalized = normalizeImage(img, size);
		expect(calculateDensity(normalized)).toBe(0);
	});
});

// =============================================================
// gaussianBlur
// =============================================================
describe('gaussianBlur', () => {
	it('均一画像はぼかし後も均一', () => {
		const size = 16;
		const img = createFilledImage(size, 0.5);
		const blurred = gaussianBlur(img, size, 1.0);
		// 均一画像はぼかしても値が変わらない
		for (let i = 0; i < blurred.length; i++) {
			expect(blurred[i]).toBeCloseTo(0.5, 2);
		}
	});

	it('ぼかし後のピクセル合計が概ね保存される（エネルギー保存）', () => {
		const size = 16;
		const img = createCenteredBlock(size, 6);
		const blurred = gaussianBlur(img, size, 1.0);

		let origSum = 0,
			blurSum = 0;
		for (let i = 0; i < img.length; i++) {
			origSum += img[i];
			blurSum += blurred[i];
		}
		// エネルギーは概ね保存される（境界クランプの影響で多少ずれる）
		expect(blurSum).toBeCloseTo(origSum, 0);
	});

	it('シャープなエッジがぼかし後に滑らかになる', () => {
		const size = 16;
		const img = createBlankImage(size);
		// 左半分を黒に（シャープなエッジ）
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size / 2; x++) {
				img[y * size + x] = 1.0;
			}
		}

		const blurred = gaussianBlur(img, size, 1.0);

		// エッジ付近（x=7→x=8）の値差が小さくなっている
		const y = 8;
		const origDiff = Math.abs(img[y * size + 7] - img[y * size + 8]);
		const blurDiff = Math.abs(blurred[y * size + 7] - blurred[y * size + 8]);
		expect(blurDiff).toBeLessThan(origDiff);
	});

	it('sigma=0に近い場合はほぼ元画像のまま', () => {
		const size = 8;
		const img = createCenteredBlock(size, 4);
		const blurred = gaussianBlur(img, size, 0.3);
		// 中心ピクセルはほぼ変わらない
		const center = Math.floor(size / 2);
		expect(blurred[center * size + center]).toBeCloseTo(img[center * size + center], 1);
	});
});

// =============================================================
// preprocessImage
// =============================================================
describe('preprocessImage', () => {
	it('空画像は空のまま', () => {
		const size = 16;
		const img = createBlankImage(size);
		const processed = preprocessImage(img, size);
		expect(calculateDensity(processed)).toBe(0);
	});

	it('前処理後も描画内容が保持される', () => {
		const size = 32;
		const img = createCenteredBlock(size, 10);
		const processed = preprocessImage(img, size);
		expect(calculateDensity(processed)).toBeGreaterThan(0);
	});
});

// =============================================================
// 回帰テスト: 前処理による認識耐性
// =============================================================
describe('前処理による認識耐性', () => {
	const SIZE = 32;

	it('位置ずれ画像が前処理後に高い類似度を持つ', () => {
		// 中央ブロックと右下にずらしたブロック
		const centered = createCenteredBlock(SIZE, 10);
		const shifted = createBlockAt(SIZE, 10, 18, 18);

		// 前処理なし
		const rawSim = cosineSimilarity(centered, shifted);

		// 前処理あり
		const procA = preprocessImage(centered, SIZE);
		const procB = preprocessImage(shifted, SIZE);
		const procSim = cosineSimilarity(procA, procB);

		// 前処理後の方が類似度が高い
		expect(procSim).toBeGreaterThan(rawSim);
	});

	it('スケール違いの画像が前処理後に高い類似度を持つ', () => {
		// 大きなブロックと小さなブロック
		const big = createCenteredBlock(SIZE, 16);
		const small = createCenteredBlock(SIZE, 6);

		// 前処理なし
		const rawSim = cosineSimilarity(big, small);

		// 前処理あり
		const procA = preprocessImage(big, SIZE);
		const procB = preprocessImage(small, SIZE);
		const procSim = cosineSimilarity(procA, procB);

		// 前処理後の方が類似度が高い
		expect(procSim).toBeGreaterThan(rawSim);
	});

	it('同一パターンの前処理後は高い構造類似度を維持', () => {
		const cross = createCrossPattern(SIZE, 2);
		const procCross = preprocessImage(cross, SIZE);

		const selfSim = structuralSimilarity(procCross, procCross, SIZE);
		expect(selfSim).toBeCloseTo(1.0, 5);
	});

	it('異なるパターンは前処理後も区別できる', () => {
		// 十字パターン vs ブロック
		const cross = createCrossPattern(SIZE, 2);
		const block = createCenteredBlock(SIZE, 12);

		const procA = preprocessImage(cross, SIZE);
		const procB = preprocessImage(block, SIZE);

		const sim = cosineSimilarity(procA, procB);
		// 異なるパターンなので完全一致にはならない
		expect(sim).toBeLessThan(0.95);
	});

	it('ノイズ追加画像がぼかし後にも適度なスコアを維持', () => {
		const size = SIZE;
		const clean = createCenteredBlock(size, 10);
		const noisy = new Float32Array(clean);

		// ノイズ追加
		for (let i = 0; i < noisy.length; i++) {
			noisy[i] = Math.max(0, Math.min(1, noisy[i] + (Math.random() - 0.5) * 0.2));
		}

		const procClean = preprocessImage(clean, size);
		const procNoisy = preprocessImage(noisy, size);

		const sim = cosineSimilarity(procClean, procNoisy);
		// ノイズがあっても前処理後にそれなりの類似度を維持
		expect(sim).toBeGreaterThan(0.4);
	});
});

// =============================================================
// calculateSpatialVariance
// =============================================================
describe('calculateSpatialVariance', () => {
	it('均一画像はCV=0を返す', () => {
		const size = 16;
		const img = createFilledImage(size, 0.5);
		expect(calculateSpatialVariance(img, size)).toBeCloseTo(0, 5);
	});

	it('空画像はCV=0を返す', () => {
		const size = 16;
		const img = createBlankImage(size);
		expect(calculateSpatialVariance(img, size)).toBe(0);
	});

	it('構造的な画像（十字パターン）はCV高', () => {
		const size = 32;
		const cross = createCrossPattern(size, 2);
		const cv = calculateSpatialVariance(cross, size);
		// 十字は一部のセルにだけ集中 → CV高い
		expect(cv).toBeGreaterThan(0.3);
	});

	it('一様なスクリブルはCV低', () => {
		const size = 32;
		const scribble = createScribbleImage(size, 0.6);
		const cv = calculateSpatialVariance(scribble, size);
		// どこも一様に埋まっている → CV低い
		expect(cv).toBeLessThan(0.5);
	});

	it('構造的な画像はスクリブルよりCVが高い', () => {
		const size = 32;
		const cross = createCrossPattern(size, 2);
		const scribble = createScribbleImage(size, 0.6);

		const crossCV = calculateSpatialVariance(cross, size);
		const scribbleCV = calculateSpatialVariance(scribble, size);

		expect(crossCV).toBeGreaterThan(scribbleCV);
	});
});

// =============================================================
// softF1
// =============================================================
describe('softF1', () => {
	it('同一ベクトルは1.0を返す', () => {
		const v = new Float32Array([0.5, 0.3, 0.8, 0.1]);
		expect(softF1(v, v)).toBeCloseTo(1.0, 5);
	});

	it('ゼロベクトルは0.0を返す', () => {
		const zero = new Float32Array([0, 0, 0, 0]);
		const v = new Float32Array([1, 2, 3, 4]);
		expect(softF1(zero, v)).toBe(0);
		expect(softF1(v, zero)).toBe(0);
	});

	it('完全一致しない重なりは1未満を返す', () => {
		const a = new Float32Array([1, 0, 0, 0]);
		const b = new Float32Array([0.5, 0.5, 0, 0]);
		const score = softF1(a, b);
		expect(score).toBeGreaterThan(0);
		expect(score).toBeLessThan(1);
	});
});

// =============================================================
// binarize / calculateIoU
// =============================================================
describe('calculateIoU', () => {
	it('同一画像はIoU=1.0を返す', () => {
		const size = 16;
		const img = createCenteredBlock(size, 8);
		expect(calculateIoU(img, img)).toBeCloseTo(1.0, 5);
	});

	it('完全に重ならない画像はIoU=0.0を返す', () => {
		const size = 16;
		const a = createBlockAt(size, 4, 0, 0);
		const b = createBlockAt(size, 4, 12, 12);
		expect(calculateIoU(a, b)).toBeCloseTo(0.0, 5);
	});

	it('部分的に重なる画像は0〜1の間', () => {
		const size = 16;
		const a = createBlockAt(size, 8, 0, 0);
		const b = createBlockAt(size, 8, 4, 4);
		const iou = calculateIoU(a, b);
		expect(iou).toBeGreaterThan(0);
		expect(iou).toBeLessThan(1);
	});

	it('空画像はIoU=0を返す', () => {
		const size = 8;
		const empty = createBlankImage(size);
		const block = createCenteredBlock(size, 4);
		expect(calculateIoU(empty, block)).toBe(0);
		expect(calculateIoU(empty, empty)).toBe(0);
	});

	it('スクリブル（全面塗り）vs 構造パターン → 低IoU', () => {
		const size = 32;
		const kanji = createCrossPattern(size, 2);
		const scribble = createFilledImage(size, 0.5);
		const iou = calculateIoU(scribble, kanji);
		// 十字は全体の〜10%、スクリブルは100% → IoU ≈ 10%
		expect(iou).toBeLessThan(0.25);
	});

	it('コサイン類似度よりスクリブルに対して厳しい', () => {
		const size = 32;
		const kanji = createCrossPattern(size, 2);
		const scribble = createFilledImage(size, 0.5);
		const cosScore = cosineSimilarity(scribble, kanji);
		const iouScore = calculateIoU(scribble, kanji);
		expect(iouScore).toBeLessThan(cosScore);
	});
});

// =============================================================
// スクリブル耐性テスト
// =============================================================
describe('スクリブル耐性', () => {
	const SIZE = 32;

	it('スクリブルのIoUは漢字パターン自己比較より大幅に低い', () => {
		const kanji = createCrossPattern(SIZE, 2);
		const scribble = createScribbleImage(SIZE, 0.6);

		const procKanji = preprocessImage(kanji, SIZE);
		const procScribble = preprocessImage(scribble, SIZE);

		const selfIoU = calculateIoU(procKanji, procKanji);
		const scribbleIoU = calculateIoU(procScribble, procKanji);

		expect(selfIoU).toBeCloseTo(1.0, 5);
		expect(scribbleIoU).toBeLessThan(0.4);
	});

	it('スクリブルの構造類似度（エッジIoU）も低い', () => {
		const kanji = createCrossPattern(SIZE, 2);
		const scribble = createScribbleImage(SIZE, 0.6);

		const procKanji = preprocessImage(kanji, SIZE);
		const procScribble = preprocessImage(scribble, SIZE);

		const structScore = structuralSimilarity(procScribble, procKanji, SIZE);
		expect(structScore).toBeLessThan(0.5);
	});

	it('高密度スクリブル（全面塗り）は低スコア', () => {
		const kanji = createCrossPattern(SIZE, 2);
		const scribble = createFilledImage(SIZE, 0.8);

		const procKanji = preprocessImage(kanji, SIZE);
		const procScribble = preprocessImage(scribble, SIZE);

		const pixelIoU = calculateIoU(procScribble, procKanji);
		// 全面塗りは union が巨大 → IoU 極低
		expect(pixelIoU).toBeLessThan(0.3);
	});
});

// =============================================================
// ストローク数ゲート
// =============================================================
describe('ストローク数ゲート', () => {
	it('1ストロークで10画の漢字を書こうとすると弾かれる', () => {
		const img = createCenteredBlock(32, 16);
		const result = recognizeKanji(img, '漢', {
			userStrokeCount: 1,
			expectedStrokeCount: 10,
			size: 32
		});
		expect(result.isCorrect).toBe(false);
		expect(result.confidence).toBeLessThan(0.2);
	});

	it('2ストロークで8画の漢字を書こうとすると弾かれる', () => {
		const img = createCenteredBlock(32, 16);
		const result = recognizeKanji(img, '学', {
			userStrokeCount: 2,
			expectedStrokeCount: 8,
			size: 32
		});
		expect(result.isCorrect).toBe(false);
	});

	it('2画の漢字を1ストロークで書いてもストローク数ゲートは通す（期待画数 < 3）', () => {
		const size = 32;
		// 高カバレッジ画像を使用 → 絶対カバレッジゲートで止まる（DOM不要）
		const img = createFilledImage(size, 0.8);
		const result = recognizeKanji(img, '十', {
			userStrokeCount: 1,
			expectedStrokeCount: 2,
			size
		});
		// ストローク数ゲート(confidence=0.1)ではなく絶対カバレッジゲート(confidence=0.15)で弾かれる
		// → ストローク数ゲートは通過した証拠
		expect(result.confidence).not.toBe(0.1);
		expect(result.confidence).toBe(0.15);
	});

	it('7ストロークで10画の漢字を書こうとすると弾かれる（80%閾値）', () => {
		const img = createCenteredBlock(32, 16);
		// ceil(10 * 0.8) = 8, max(2,8) = 8. 7 < 8 → rejected
		const result = recognizeKanji(img, '漢', {
			userStrokeCount: 7,
			expectedStrokeCount: 10,
			size: 32
		});
		expect(result.isCorrect).toBe(false);
		expect(result.confidence).toBe(0.1);
	});

	it('8ストロークで10画の漢字ならストローク数ゲートは通す', () => {
		const size = 32;
		// ceil(10 * 0.8) = 8, max(2,8) = 8. 8 >= 8 → passes stroke gate
		// 高カバレッジ画像で絶対カバレッジゲートに到達させる
		const img = createFilledImage(size, 0.8);
		const result = recognizeKanji(img, '漢', {
			userStrokeCount: 8,
			expectedStrokeCount: 10,
			size
		});
		expect(result.confidence).not.toBe(0.1);
		expect(result.confidence).toBe(0.15);
	});

	it('ストローク情報なしでも空白チェックは動作する', () => {
		const img = createBlankImage(32);
		const result = recognizeKanji(img, '十', { size: 32 });
		expect(result.character).toBe('十');
		expect(result.confidence).toBe(0);
	});
});

// =============================================================
// カバレッジ比率ゲート
// =============================================================
describe('カバレッジ比率ゲート', () => {
	it('高カバレッジ画像は絶対カバレッジゲートで弾かれる（DOM不要）', () => {
		const size = 32;
		const denseScribble = createFilledImage(size, 0.8);
		const result = recognizeKanji(denseScribble, '十', {
			userStrokeCount: 5,
			expectedStrokeCount: 2,
			size
		});
		// 前処理後もカバレッジ > 60% → 絶対ゲートで弾かれる（generateReferenceImage不要）
		expect(result.isCorrect).toBe(false);
		expect(result.confidence).toBeLessThan(0.2);
	});

	it('calculateCoverageは正しいカバレッジ率を返す', () => {
		const size = 16;
		const full = createFilledImage(size, 1.0);
		expect(calculateCoverage(full)).toBeCloseTo(1.0, 5);

		const empty = createBlankImage(size);
		expect(calculateCoverage(empty)).toBe(0);
	});
});
