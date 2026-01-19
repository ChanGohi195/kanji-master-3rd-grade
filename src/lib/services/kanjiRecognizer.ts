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

// 参照画像キャッシュ
const referenceCache = new Map<string, Float32Array>();

/**
 * 漢字の参照画像を生成（フォントレンダリング）
 */
function generateReferenceImage(character: string, size = 64): Float32Array {
	if (referenceCache.has(character)) {
		return referenceCache.get(character)!;
	}

	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;

	// 白背景
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, size, size);

	// 黒文字で漢字を描画
	ctx.fillStyle = '#000000';
	ctx.font = `${size * 0.8}px "Noto Sans JP", "Hiragino Kaku Gothic Pro", sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(character, size / 2, size / 2);

	// グレースケール変換
	const imageData = ctx.getImageData(0, 0, size, size);
	const grayscale = new Float32Array(size * size);
	for (let i = 0; i < grayscale.length; i++) {
		const r = imageData.data[i * 4];
		const g = imageData.data[i * 4 + 1];
		const b = imageData.data[i * 4 + 2];
		grayscale[i] = 1 - (r + g + b) / 3 / 255;
	}

	referenceCache.set(character, grayscale);
	return grayscale;
}

/**
 * コサイン類似度を計算
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
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
 * 構造類似度（SSIM簡易版）- エッジや形状を比較
 */
function structuralSimilarity(a: Float32Array, b: Float32Array, size = 64): number {
	// 簡易的なエッジ検出 + 比較
	const edgeA = detectEdges(a, size);
	const edgeB = detectEdges(b, size);
	return cosineSimilarity(edgeA, edgeB);
}

/**
 * 簡易エッジ検出（Sobel風）
 */
function detectEdges(img: Float32Array, size: number): Float32Array {
	const edges = new Float32Array(size * size);

	for (let y = 1; y < size - 1; y++) {
		for (let x = 1; x < size - 1; x++) {
			const idx = y * size + x;
			// 横方向の勾配
			const gx = img[idx + 1] - img[idx - 1];
			// 縦方向の勾配
			const gy = img[idx + size] - img[idx - size];
			// 勾配の大きさ
			edges[idx] = Math.sqrt(gx * gx + gy * gy);
		}
	}

	return edges;
}

/**
 * ストローク密度を計算（書き込み量の目安）
 */
function calculateDensity(img: Float32Array): number {
	let sum = 0;
	for (let i = 0; i < img.length; i++) {
		sum += img[i];
	}
	return sum / img.length;
}

/**
 * 手書き文字を認識して正解判定
 */
export function recognizeKanji(
	userImage: Float32Array,
	targetCharacter: string,
	threshold = 0.35
): RecognitionResult {
	const referenceImage = generateReferenceImage(targetCharacter);

	// 複数の類似度指標を組み合わせ
	const pixelSim = cosineSimilarity(userImage, referenceImage);
	const structSim = structuralSimilarity(userImage, referenceImage);

	// 密度チェック（何も書いてない場合を除外）
	const userDensity = calculateDensity(userImage);
	const refDensity = calculateDensity(referenceImage);
	const densityRatio = Math.min(userDensity, refDensity) / Math.max(userDensity, refDensity);

	// 重み付け平均（構造類似度を重視）
	const confidence = pixelSim * 0.3 + structSim * 0.5 + densityRatio * 0.2;

	// 空白チェック
	if (userDensity < 0.01) {
		return {
			character: targetCharacter,
			confidence: 0,
			isCorrect: false
		};
	}

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
	candidates: string[]
): { character: string; confidence: number }[] {
	const results = candidates.map(char => {
		const ref = generateReferenceImage(char);
		const pixelSim = cosineSimilarity(userImage, ref);
		const structSim = structuralSimilarity(userImage, ref);
		return {
			character: char,
			confidence: pixelSim * 0.4 + structSim * 0.6
		};
	});

	return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 認識サービスの初期化（将来的にモデルロード用）
 */
export async function initRecognizer(): Promise<void> {
	// 将来的にTensorFlow.jsモデルのロードをここで行う
	console.log('Kanji recognizer initialized (template matching mode)');
}
