/**
 * 漢字認識サービス
 * Canvas上の手書き文字を認識して正解判定を行う
 */

// 認識結果の型
export interface RecognitionResult {
	character: string;
	confidence: number;
	isCorrect: boolean;
}

// 参照画像キャッシュ（前処理済み）
const referenceCache = new Map<string, Float32Array>();

/**
 * 漢字の参照画像を生成（フォントレンダリング + 前処理）
 */
function generateReferenceImage(character: string, size = 64): Float32Array {
	const cacheKey = `${character}_${size}`;
	if (referenceCache.has(cacheKey)) {
		return referenceCache.get(cacheKey)!;
	}

	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;

	// 白背景
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, size, size);

	// 黒文字で漢字を描画（太字で手書きストロークに近づける）
	ctx.fillStyle = '#000000';
	ctx.font = `bold ${size * 0.8}px "Noto Sans JP", "Hiragino Kaku Gothic Pro", sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(character, size / 2, size / 2);

	// ストロークを太くする（膨張処理）
	ctx.lineWidth = 2;
	ctx.strokeStyle = '#000000';
	ctx.strokeText(character, size / 2, size / 2);

	// グレースケール変換
	const imageData = ctx.getImageData(0, 0, size, size);
	const grayscale = new Float32Array(size * size);
	for (let i = 0; i < grayscale.length; i++) {
		const r = imageData.data[i * 4];
		const g = imageData.data[i * 4 + 1];
		const b = imageData.data[i * 4 + 2];
		grayscale[i] = 1 - (r + g + b) / 3 / 255;
	}

	// 前処理: 正規化 → ぼかし
	const normalized = normalizeImage(grayscale, size);
	const blurred = gaussianBlur(normalized, size, 1.5);

	referenceCache.set(cacheKey, blurred);
	return blurred;
}

/**
 * バウンディングボックス検出 — ストロークが存在する矩形領域を返す
 */
export function findBoundingBox(
	img: Float32Array,
	size: number,
	threshold = 0.05
): { minX: number; minY: number; maxX: number; maxY: number } {
	let minX = size,
		minY = size,
		maxX = 0,
		maxY = 0;

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (img[y * size + x] > threshold) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}
	}

	// 何も見つからない場合は全体を返す
	if (maxX < minX || maxY < minY) {
		return { minX: 0, minY: 0, maxX: size - 1, maxY: size - 1 };
	}

	return { minX, minY, maxX, maxY };
}

/**
 * バウンディングボックス正規化 — ストローク領域を切り出し、中央配置でリサイズ
 */
export function normalizeImage(img: Float32Array, size: number): Float32Array {
	const bbox = findBoundingBox(img, size);
	const bw = bbox.maxX - bbox.minX + 1;
	const bh = bbox.maxY - bbox.minY + 1;

	// ストロークがほぼない場合はそのまま返す
	if (bw <= 1 || bh <= 1) return new Float32Array(img);

	// パディング付きのターゲットサイズ（枠の90%に収める）
	const padding = Math.floor(size * 0.05);
	const targetSize = size - padding * 2;

	// アスペクト比を保ったスケール計算
	const scale = Math.min(targetSize / bw, targetSize / bh);
	const newW = Math.round(bw * scale);
	const newH = Math.round(bh * scale);

	// 中央配置オフセット
	const offsetX = Math.floor((size - newW) / 2);
	const offsetY = Math.floor((size - newH) / 2);

	const result = new Float32Array(size * size);

	// バイリニア補間でリサイズ
	for (let y = 0; y < newH; y++) {
		for (let x = 0; x < newW; x++) {
			// 元画像上の座標
			const srcX = bbox.minX + (x / scale);
			const srcY = bbox.minY + (y / scale);

			const value = bilinearSample(img, size, srcX, srcY);
			const dstIdx = (offsetY + y) * size + (offsetX + x);
			if (dstIdx >= 0 && dstIdx < result.length) {
				result[dstIdx] = value;
			}
		}
	}

	return result;
}

/**
 * バイリニア補間によるサンプリング
 */
export function bilinearSample(
	img: Float32Array,
	size: number,
	x: number,
	y: number
): number {
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const x1 = Math.min(x0 + 1, size - 1);
	const y1 = Math.min(y0 + 1, size - 1);

	if (x0 < 0 || y0 < 0 || x0 >= size || y0 >= size) return 0;

	const fx = x - x0;
	const fy = y - y0;

	const v00 = img[y0 * size + x0];
	const v10 = img[y0 * size + x1];
	const v01 = img[y1 * size + x0];
	const v11 = img[y1 * size + x1];

	return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
}

/**
 * ガウシアンぼかし — 微小な位置ずれへの耐性を向上
 */
export function gaussianBlur(img: Float32Array, size: number, sigma = 1.0): Float32Array {
	// カーネルサイズ（sigmaに応じて3or5）
	const radius = sigma < 1.5 ? 1 : 2;
	const kernelSize = radius * 2 + 1;

	// ガウシアンカーネル生成
	const kernel = new Float32Array(kernelSize * kernelSize);
	let kernelSum = 0;
	for (let ky = -radius; ky <= radius; ky++) {
		for (let kx = -radius; kx <= radius; kx++) {
			const value = Math.exp(-(kx * kx + ky * ky) / (2 * sigma * sigma));
			kernel[(ky + radius) * kernelSize + (kx + radius)] = value;
			kernelSum += value;
		}
	}
	// 正規化
	for (let i = 0; i < kernel.length; i++) {
		kernel[i] /= kernelSum;
	}

	const result = new Float32Array(size * size);

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			let sum = 0;
			for (let ky = -radius; ky <= radius; ky++) {
				for (let kx = -radius; kx <= radius; kx++) {
					const sy = Math.min(Math.max(y + ky, 0), size - 1);
					const sx = Math.min(Math.max(x + kx, 0), size - 1);
					sum += img[sy * size + sx] * kernel[(ky + radius) * kernelSize + (kx + radius)];
				}
			}
			result[y * size + x] = sum;
		}
	}

	return result;
}

/**
 * コサイン類似度を計算
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	if (normA === 0 || normB === 0) return 0;
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * ソフトF1スコア — 余分なインクをペナルティする類似度指標
 *
 * precision = Σmin(user,ref) / Σuser  → 「書いたインクのうち正しい割合」
 * recall    = Σmin(user,ref) / Σref   → 「必要なインクのうち書けた割合」
 * F1        = 2 * precision * recall / (precision + recall)
 *
 * スクリブル: recall高・precision極低 → F1低
 * 正しい漢字: 両方高 → F1高
 */
export function softF1(user: Float32Array, ref: Float32Array): number {
	let intersection = 0;
	let userSum = 0;
	let refSum = 0;

	for (let i = 0; i < user.length; i++) {
		intersection += Math.min(user[i], ref[i]);
		userSum += user[i];
		refSum += ref[i];
	}

	if (userSum === 0 || refSum === 0) return 0;

	const precision = intersection / userSum;
	const recall = intersection / refSum;

	if (precision + recall === 0) return 0;
	return (2 * precision * recall) / (precision + recall);
}

/**
 * 画像を二値化（インクあり=1, なし=0）
 */
export function binarize(img: Float32Array, threshold = 0.15): Float32Array {
	const result = new Float32Array(img.length);
	for (let i = 0; i < img.length; i++) {
		result[i] = img[i] > threshold ? 1 : 0;
	}
	return result;
}

/**
 * IoU（Intersection over Union） — 二値化画像同士の重なり度合い
 *
 * スクリブル（カバレッジ70%）vs 漢字（カバレッジ20%）:
 *   intersection=20%, union=70% → IoU=0.29
 * 正しい漢字（カバレッジ25%）vs 参照（カバレッジ20%）:
 *   intersection=18%, union=27% → IoU=0.67
 */
export function calculateIoU(
	a: Float32Array,
	b: Float32Array,
	threshold = 0.15
): number {
	const binA = binarize(a, threshold);
	const binB = binarize(b, threshold);

	let intersection = 0;
	let union = 0;

	for (let i = 0; i < binA.length; i++) {
		const aOn = binA[i] > 0;
		const bOn = binB[i] > 0;
		if (aOn || bOn) union++;
		if (aOn && bOn) intersection++;
	}

	if (union === 0) return 0;
	return intersection / union;
}

/**
 * 構造類似度 — エッジのIoU比較（スクリブル耐性あり）
 */
export function structuralSimilarity(a: Float32Array, b: Float32Array, size = 64): number {
	const edgeA = detectEdges(a, size);
	const edgeB = detectEdges(b, size);
	return calculateIoU(edgeA, edgeB, 0.05);
}

/**
 * 簡易エッジ検出（Sobel風）
 */
export function detectEdges(img: Float32Array, size: number): Float32Array {
	const edges = new Float32Array(size * size);

	for (let y = 1; y < size - 1; y++) {
		for (let x = 1; x < size - 1; x++) {
			const idx = y * size + x;
			const gx = img[idx + 1] - img[idx - 1];
			const gy = img[idx + size] - img[idx - size];
			edges[idx] = Math.sqrt(gx * gx + gy * gy);
		}
	}

	return edges;
}

/**
 * ストローク密度を計算（書き込み量の目安）
 */
export function calculateDensity(img: Float32Array): number {
	let sum = 0;
	for (let i = 0; i < img.length; i++) {
		sum += img[i];
	}
	return sum / img.length;
}

/**
 * 空間密度の分散を計算 — 画像をgridSize×gridSizeに分割し、各セルの密度の変動係数(CV)を返す
 * CVが低い = 一様（スクリブル）、CVが高い = 構造的（漢字）
 */
export function calculateSpatialVariance(img: Float32Array, size: number, gridSize = 4): number {
	const cellSize = Math.floor(size / gridSize);
	const cellDensities: number[] = [];

	for (let gy = 0; gy < gridSize; gy++) {
		for (let gx = 0; gx < gridSize; gx++) {
			let sum = 0;
			let count = 0;
			for (let y = gy * cellSize; y < (gy + 1) * cellSize; y++) {
				for (let x = gx * cellSize; x < (gx + 1) * cellSize; x++) {
					if (y < size && x < size) {
						sum += img[y * size + x];
						count++;
					}
				}
			}
			cellDensities.push(count > 0 ? sum / count : 0);
		}
	}

	const mean = cellDensities.reduce((a, b) => a + b, 0) / cellDensities.length;
	if (mean < 0.001) return 0;

	const variance =
		cellDensities.reduce((acc, d) => acc + (d - mean) * (d - mean), 0) / cellDensities.length;
	return Math.sqrt(variance) / mean; // 変動係数 (CV)
}

/**
 * 手書き画像の前処理パイプライン
 */
export function preprocessImage(img: Float32Array, size = 64): Float32Array {
	const normalized = normalizeImage(img, size);
	return gaussianBlur(normalized, size, 1.5);
}

/**
 * ピクセルカバレッジ（二値化後にインクがある割合）を計算
 */
export function calculateCoverage(img: Float32Array, threshold = 0.15): number {
	let count = 0;
	for (let i = 0; i < img.length; i++) {
		if (img[i] > threshold) count++;
	}
	return count / img.length;
}

/**
 * 手書き文字を認識して正解判定
 *
 * @param userStrokeCount ユーザーが描いたストローク数（WritingCanvas.getStrokeCount()）
 * @param expectedStrokeCount 正解漢字の画数（Kanji.strokeCount）
 */
export function recognizeKanji(
	userImage: Float32Array,
	targetCharacter: string,
	options: {
		userStrokeCount?: number;
		expectedStrokeCount?: number;
		threshold?: number;
		size?: number;
	} = {}
): RecognitionResult {
	const { userStrokeCount, expectedStrokeCount, threshold = 0.35, size = 64 } = options;

	// 空白チェック（前処理の前に行う）
	const rawDensity = calculateDensity(userImage);
	if (rawDensity < 0.01) {
		return {
			character: targetCharacter,
			confidence: 0,
			isCorrect: false
		};
	}

	// ストローク数ゲート: ストローク不足を検出（期待の70%未満で不合格）
	if (
		userStrokeCount != null &&
		expectedStrokeCount != null &&
		expectedStrokeCount >= 3 &&
		userStrokeCount < Math.max(2, Math.ceil(expectedStrokeCount * 0.8))
	) {
		return {
			character: targetCharacter,
			confidence: 0.1,
			isCorrect: false
		};
	}

	// 前処理パイプライン適用
	const processedUser = preprocessImage(userImage, size);

	// 絶対カバレッジゲート: キャンバスの60%以上が塗られていたらスクリブル確定
	// （最も複雑な漢字でも前処理後のカバレッジは30-40%程度）
	const userCoverage = calculateCoverage(processedUser);
	if (userCoverage > 0.6) {
		return {
			character: targetCharacter,
			confidence: 0.15,
			isCorrect: false
		};
	}

	const referenceImage = generateReferenceImage(targetCharacter, size);

	// 相対カバレッジゲート: ユーザーのインク面積が参照の2.5倍以上なら弾く
	const refCoverage = calculateCoverage(referenceImage);
	if (refCoverage > 0 && userCoverage / refCoverage > 2.5) {
		return {
			character: targetCharacter,
			confidence: 0.15,
			isCorrect: false
		};
	}

	// IoUベースの類似度（余分なインクを直接的にペナルティ）
	const pixelIoU = calculateIoU(processedUser, referenceImage);
	const structIoU = structuralSimilarity(processedUser, referenceImage, size);

	// 密度比較
	const userDensity = calculateDensity(processedUser);
	const refDensity = calculateDensity(referenceImage);
	const densityRatio =
		Math.max(userDensity, refDensity) > 0
			? Math.min(userDensity, refDensity) / Math.max(userDensity, refDensity)
			: 0;

	// IoU主体の重み付け（pixelIoU重視 — スクリブルに最も効く）
	const confidence = pixelIoU * 0.5 + structIoU * 0.3 + densityRatio * 0.2;

	return {
		character: targetCharacter,
		confidence,
		isCorrect: confidence >= threshold
	};
}

/**
 * 複数候補から最も近い漢字を特定
 */
export function findClosestKanji(
	userImage: Float32Array,
	candidates: string[],
	size = 64
): { character: string; confidence: number }[] {
	const processedUser = preprocessImage(userImage, size);

	const results = candidates.map((char) => {
		const ref = generateReferenceImage(char, size);
		const pixelScore = calculateIoU(processedUser, ref);
		const structScore = structuralSimilarity(processedUser, ref, size);
		return {
			character: char,
			confidence: pixelScore * 0.5 + structScore * 0.5
		};
	});

	return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 認識サービスの初期化（将来的にモデルロード用）
 */
export async function initRecognizer(): Promise<void> {
	console.log('Kanji recognizer initialized (template matching mode)');
}
