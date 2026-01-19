<script lang="ts">
	interface Props {
		sentence: string;
		targetKanji: string;
		targetWord?: string; // 熟語全体をハイライトする場合
		targetReading?: string;
		showBlank?: boolean;
		showRuby?: boolean;
		hideReadingHint?: boolean; // ブランク上の読みを非表示（読みクイズ用）
	}

	let { sentence, targetKanji, targetWord = '', targetReading = '', showBlank = false, showRuby = false, hideReadingHint = false }: Props = $props();

	interface CharInfo {
		char: string;
		ruby?: string;
		isTarget: boolean;
		isOkurigana?: boolean; // 送り仮名フラグ
	}

	// 送り仮名を抽出（"やす.む" → "む"）
	function getOkurigana(reading: string): string {
		if (reading.includes('.')) {
			return reading.split('.')[1];
		}
		return '';
	}

	// targetWordの位置を特定
	function getTargetWordIndices(text: string, word: string): Set<number> {
		const indices = new Set<number>();
		if (!word) return indices;
		const startIndex = text.indexOf(word);
		if (startIndex !== -1) {
			for (let i = 0; i < word.length; i++) {
				indices.add(startIndex + i);
			}
		}
		return indices;
	}

	// ルビ記法をパース: "一[ひと]つ" → [{char: "一", ruby: "ひと"}, {char: "つ"}]
	function parseWithRuby(text: string): CharInfo[] {
		const result: CharInfo[] = [];
		const okurigana = getOkurigana(targetReading);
		const targetIndices = getTargetWordIndices(text.replace(/\[[^\]]*\]/g, ''), targetWord);
		let i = 0;
		let charIndex = 0;
		let foundTarget = false;
		let okuriganaIndex = 0;

		while (i < text.length) {
			const char = text[i];
			i++;
			// 次が [ なら ruby を取得
			if (i < text.length && text[i] === '[') {
				const endBracket = text.indexOf(']', i);
				if (endBracket !== -1) {
					const ruby = text.slice(i + 1, endBracket);
					const isTarget = targetWord ? targetIndices.has(charIndex) : char === targetKanji;
					if (isTarget) foundTarget = true;
					result.push({ char, ruby, isTarget });
					i = endBracket + 1;
					charIndex++;
					continue;
				}
			}

			const isTarget = targetWord ? targetIndices.has(charIndex) : char === targetKanji;
			if (isTarget) foundTarget = true;

			// 対象漢字の直後で送り仮名と一致するかチェック（targetWordがない場合のみ）
			let isOkurigana = false;
			if (!targetWord && foundTarget && okurigana && okuriganaIndex < okurigana.length) {
				if (char === okurigana[okuriganaIndex]) {
					isOkurigana = true;
					okuriganaIndex++;
				} else {
					foundTarget = false;
					okuriganaIndex = 0;
				}
			}

			result.push({ char, ruby: undefined, isTarget, isOkurigana });
			charIndex++;
		}
		return result;
	}

	// 文章を1文字ずつ分割し、対象漢字をマーク
	const chars = $derived(() => {
		if (showRuby) {
			return parseWithRuby(sentence);
		}
		const okurigana = getOkurigana(targetReading);
		const targetIndices = getTargetWordIndices(sentence, targetWord);
		const result: CharInfo[] = [];
		let foundTarget = false;
		let okuriganaIndex = 0;

		let charIndex = 0;
		for (const char of sentence) {
			const isTarget = targetWord ? targetIndices.has(charIndex) : char === targetKanji;
			if (isTarget) foundTarget = true;

			// 対象漢字の直後で送り仮名と一致するかチェック（targetWordがない場合のみ）
			let isOkurigana = false;
			if (!targetWord && foundTarget && okurigana && okuriganaIndex < okurigana.length) {
				if (char === okurigana[okuriganaIndex]) {
					isOkurigana = true;
					okuriganaIndex++;
				} else {
					foundTarget = false;
					okuriganaIndex = 0;
				}
			}

			result.push({ char, ruby: undefined, isTarget, isOkurigana });
			charIndex++;
		}
		return result;
	});

	// 表示用の読み（送り仮名マーカーを除去）
	const displayReading = $derived(() => targetReading.replace('.', ''));
</script>

<div class="vertical-container">
	<div class="vertical-text">
		{#each chars() as { char, ruby, isTarget, isOkurigana }}
			{#if isTarget}
				{#if showBlank}
					<ruby class="blank-char">？<rt>{hideReadingHint ? '' : displayReading()}</rt></ruby>
				{:else}
					<ruby class="target-char">{char}<rt>{ruby || ''}</rt></ruby>
				{/if}
			{:else if isOkurigana && showBlank}
				<!-- 送り仮名はブランク時に隠す -->
			{:else if ruby}
				<ruby class="ruby-char">{char}<rt>{ruby}</rt></ruby>
			{:else}
				<span class="normal-char">{char}</span>
			{/if}
		{/each}
	</div>
</div>

<style>
	.vertical-container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
		padding: 0.5rem;
		box-sizing: border-box;
		overflow: hidden;
	}

	.vertical-text {
		writing-mode: vertical-rl;
		text-orientation: upright;
		font-size: 2.5rem;
		line-height: 1.8;
		letter-spacing: 0.1em;
		font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
		max-height: 100%;
	}

	.normal-char {
		color: #374151;
	}

	.ruby-char {
		color: #374151;
	}

	.ruby-char rt {
		font-size: 0.4em;
		color: #6b7280;
	}

	.target-char {
		background: linear-gradient(135deg, #fde047 0%, #fbbf24 100%);
		border-radius: 6px;
		padding: 2px 4px;
		color: #1f2937;
		font-weight: bold;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.target-char rt {
		font-size: 0.4em;
		color: #92400e;
		font-weight: normal;
	}

	.blank-char {
		background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
		border: 2px dashed #f59e0b;
		border-radius: 6px;
		padding: 2px 4px;
		color: #b45309;
		font-weight: bold;
	}

	.blank-char rt {
		font-size: 0.4em;
		color: #d97706;
		font-weight: bold;
	}
</style>
