<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { UI } from '$lib/data/ui-text';
	import { recordStudy, recordBunshoStudy, getProgress } from '$lib/db';
	import { playCorrectSound, playCloseSound, playIncorrectSound } from '$lib/services/sound';
	import VerticalSentence from '$lib/components/VerticalSentence.svelte';
	import SpeakButton from '$lib/components/SpeakButton.svelte';
	import WritingCanvas from '$lib/components/WritingCanvas.svelte';
	import { recognizeKanji } from '$lib/services/kanjiRecognizer';

	// アクティブ時間追跡（10秒以上操作がなければカウント停止）
	const INACTIVE_THRESHOLD = 10000;
	let lastActivity = $state(Date.now());
	let activeTime = $state(0);
	let trackingStartTime = $state(Date.now());
	let activityInterval: ReturnType<typeof setInterval> | null = null;

	function handleActivity() {
		lastActivity = Date.now();
	}

	function startActivityTracking() {
		const now = Date.now();
		lastActivity = now;
		trackingStartTime = now;
		activeTime = 0;
		if (activityInterval) clearInterval(activityInterval);
		activityInterval = setInterval(() => {
			const now = Date.now();
			if (now - lastActivity < INACTIVE_THRESHOLD) {
				activeTime += 1000;
			}
		}, 1000);
	}

	function stopActivityTracking(): number {
		if (activityInterval) {
			clearInterval(activityInterval);
			activityInterval = null;
		}
		// 1秒未満で回答した場合も実際の経過時間を返す
		const elapsed = Date.now() - trackingStartTime;
		return Math.max(activeTime, Math.min(elapsed, 1000));
	}

	onDestroy(() => {
		if (activityInterval) clearInterval(activityInterval);
	});

	interface Example {
		id: string;
		sentence: string;
		sentenceWithRuby?: string;
		reading: string;
		type: 'kun' | 'on';
	}

	interface KanjiExample {
		kanjiId: string;
		character: string;
		strokeCount: number;
		examples: Example[];
	}

	let allExamples: KanjiExample[] = $state([]);
	let currentIndex = $state(0);
	let currentExample: { kanji: KanjiExample; example: Example } | null = $state(null);

	let choices: string[] = $state([]);
	let selectedAnswer: string | null = $state(null);
	let showResult = $state(false);
	let isCorrect = $state(false);

	let answerMode: 'choice' | 'writing' = $state('choice');
	let currentGrowthLevel = $state(0);

	let KanjiWriterComponent: any = $state(null);
	let writerRef: any = $state(null);
	let mistakeCount = $state(0);
	let hintUsed = $state(false);
	let helpLevel = $state(0);
	let canvasRef: WritingCanvas | undefined = $state(undefined);
	let showAnswer = $state(false);
	let isRecognizing = $state(false);
	let recognitionConfidence = $state(0);

	let questionList: { kanji: KanjiExample; example: Example }[] = $state([]);
	let targetKanjiChar: string | null = $state(null);
	let targetQuestionCount = $state(0); // 図鑑からアクセス時、対象漢字の問題数

	onMount(async () => {
		const res = await fetch('/data/examples.json');
		allExamples = await res.json();

		if (browser) {
			const module = await import('$lib/components/KanjiWriter.svelte');
			KanjiWriterComponent = module.default;
		}

		const kanjiParam = $page.url.searchParams.get('kanji');
		targetKanjiChar = kanjiParam;

		const flat: { kanji: KanjiExample; example: Example }[] = [];
		for (const kanji of allExamples) {
			for (const ex of kanji.examples) {
				flat.push({ kanji, example: ex });
			}
		}

		if (kanjiParam) {
			const targetQuestions = flat.filter(q => q.kanji.character === kanjiParam);
			const otherQuestions = flat.filter(q => q.kanji.character !== kanjiParam);
			targetQuestionCount = targetQuestions.length;
			questionList = [
				...targetQuestions.sort(() => Math.random() - 0.5),
				...otherQuestions.sort(() => Math.random() - 0.5)
			];
		} else {
			questionList = flat.sort(() => Math.random() - 0.5);
		}

		loadQuestion();
	});

	async function loadQuestion() {
		if (questionList.length === 0) return;

		currentExample = questionList[currentIndex];

		const progress = await getProgress(currentExample.kanji.kanjiId);
		currentGrowthLevel = progress?.growthLevel ?? 0;
		// かきモードは常に手書き（helpLevelで難易度調整）
		answerMode = 'writing';

		if (answerMode === 'choice') {
			generateChoices();
		}

		selectedAnswer = null;
		showResult = false;
		isCorrect = false;
		startActivityTracking();
		mistakeCount = 0;
		hintUsed = false;
		helpLevel = 0;
		showAnswer = false;
		// キャンバスをクリア
		canvasRef?.clear();
	}

	function generateChoices() {
		if (!currentExample) return;

		const correct = currentExample.kanji.character;
		const allKanji = allExamples.map(k => k.character).filter(c => c !== correct);
		const shuffled = allKanji.sort(() => Math.random() - 0.5);
		const wrongChoices = shuffled.slice(0, 3);
		choices = [correct, ...wrongChoices].sort(() => Math.random() - 0.5);
	}

	async function handleSelect(answer: string) {
		if (showResult || !currentExample) return;

		selectedAnswer = answer;
		isCorrect = answer === currentExample.kanji.character;
		showResult = true;

		const timeSpent = stopActivityTracking();

		await recordStudy({
			kanjiId: currentExample.kanji.kanjiId,
			mode: 'writing',
			result: isCorrect ? 'correct' : 'incorrect',
			score: isCorrect ? 1 : 0,
			hintUsed: false,
			timeSpent
		});

		// ぶんしょうモード進捗を記録（例文総数を渡す）
		await recordBunshoStudy(
			currentExample.kanji.kanjiId,
			currentExample.example.id,
			'kaki',
			isCorrect,
			currentExample.kanji.examples.length
		);

		// 正解時はSE再生
		if (isCorrect) {
			playCorrectSound();
			// 図鑑からのアクセス時は同じ漢字の別の例文へ
			if (targetKanjiChar && targetQuestionCount > 1) {
				setTimeout(() => {
					currentIndex = (currentIndex + 1) % targetQuestionCount;
					loadQuestion();
				}, 700);
			} else if (!targetKanjiChar) {
				setTimeout(handleNext, 700);
			}
		}
	}

	function startWritingQuiz() {
		mistakeCount = 0;
		hintUsed = false;
		helpLevel = 0;
		setTimeout(() => writerRef?.startQuiz(), 100);
	}

	async function handleQuizComplete() {
		if (!currentExample) return;
		const wrongAndNoHelp = mistakeCount > 2 && helpLevel === 0;
		if (wrongAndNoHelp) {
			helpLevel = 1;
			hintUsed = true;
			mistakeCount = 0;
			writerRef?.cancelQuiz();
			setTimeout(() => writerRef?.startQuiz(), 150);
			return;
		}
		// Original logic below
		if (!currentExample) return;
		showResult = true;
		isCorrect = mistakeCount <= 2;

		const score = Math.max(0, 1 - mistakeCount * 0.2);
		const result = mistakeCount === 0 ? 'correct' : mistakeCount <= 2 ? 'close' : 'incorrect';

		const timeSpent = stopActivityTracking();
		const bonus = result === 'correct' ? 2 : (result === 'close' ? 1 : 0);
		await recordStudy({
			kanjiId: currentExample.kanji.kanjiId,
			mode: 'writing',
			result,
			score,
			hintUsed,
			timeSpent,
			bonus
		});

		// ぶんしょうモード進捗を記録（正解またはほぼ正解なら）
		await recordBunshoStudy(
			currentExample.kanji.kanjiId,
			currentExample.example.id,
			'kaki',
			isCorrect,
			currentExample.kanji.examples.length
		);

		// 正解・惜しい時はSE再生
		if (result === 'correct') {
			playCorrectSound();
		} else if (result === 'close') {
			playCloseSound();
		}
		// 図鑑からのアクセス時は同じ漢字の別の例文へ
		if (targetKanjiChar && targetQuestionCount > 1 && (result === 'correct' || result === 'close')) {
			setTimeout(() => {
				currentIndex = (currentIndex + 1) % targetQuestionCount;
				loadQuestion();
			}, 700);
		} else if (!targetKanjiChar && (result === 'correct' || result === 'close')) {
			setTimeout(handleNext, 700);
		}
	}

	function handleQuizMistake() { mistakeCount++; }
	function handleShowHint() { writerRef?.showHint(); hintUsed = true; }

	async function handleShowAnimation() {
		writerRef?.cancelQuiz();
		await writerRef?.animateCharacter();
		hintUsed = true;
		setTimeout(startWritingQuiz, 500);
	}

	$effect(() => {
		if (answerMode === 'writing' && helpLevel >= 1 && writerRef && !showResult && currentExample) {
			setTimeout(() => writerRef?.startQuiz(), 150);
		}
	});

	function handleSkip() {
		currentIndex = (currentIndex + 1) % questionList.length;
		loadQuestion();
	}

	
	// 自由描画モードで「できた！」を押した時 - 自動認識版
	async function handleFreeDrawSubmit() {
		if (!currentExample || !canvasRef) return;

		// ストロークがない場合は何もしない
		if (!canvasRef.hasStrokes()) return;

		isRecognizing = true;

		// 認識実行
		const imageData = canvasRef.getImageForRecognition(64);
		const result = recognizeKanji(imageData, currentExample.kanji.character, {
			userStrokeCount: canvasRef.getStrokeCount(),
			expectedStrokeCount: currentExample.kanji.strokeCount
		});

		isRecognizing = false;
		showAnswer = true;
		isCorrect = result.isCorrect;
		recognitionConfidence = result.confidence;
		showResult = true;

		const timeSpent = stopActivityTracking();
		const resultType = isCorrect ? 'correct' : 'incorrect';
		await recordStudy({
			kanjiId: currentExample.kanji.kanjiId,
			mode: 'writing',
			result: resultType,
			score: isCorrect ? result.confidence : 0,
			hintUsed: false,
			timeSpent
		});

		await recordBunshoStudy(
			currentExample.kanji.kanjiId,
			currentExample.example.id,
			'kaki',
			isCorrect,
			currentExample.kanji.examples.length
		);

		if (isCorrect) {
			playCorrectSound();
			if (targetKanjiChar && targetQuestionCount > 1) {
				setTimeout(() => {
					currentIndex = (currentIndex + 1) % targetQuestionCount;
					loadQuestion();
				}, 700);
			} else if (!targetKanjiChar) {
				setTimeout(handleNext, 700);
			}
		} else {
			playIncorrectSound();
		}
	}

	function handleClearCanvas() {
		canvasRef?.clear();
	}

function handleDifficult() { if (helpLevel === 0) { helpLevel = 1; hintUsed = true; showAnswer = false; setTimeout(() => writerRef?.startQuiz(), 150); } else { handleSkip(); } }
	function handleNext() {
		currentIndex = (currentIndex + 1) % questionList.length;
		loadQuestion();
	}
</script>
<svelte:head>
	<title>ぶんしょう かき{targetKanjiChar ? ' - ' + targetKanjiChar : ''} - {UI.appName}</title>
</svelte:head>

<div
	class="h-screen flex flex-col bg-gradient-to-br from-orange-50 to-amber-100"
	onmousemove={handleActivity}
	onclick={handleActivity}
	ontouchstart={handleActivity}
	onkeydown={handleActivity}
>
	<header class="bg-white shadow-md flex-shrink-0">
		<div class="flex items-center justify-between px-4 py-2">
			<a href={targetKanjiChar ? '/zukan/' + (currentExample?.kanji.kanjiId || '') : '/bunsho'} class="text-lg text-orange-500 hover:text-orange-700">← もどる</a>
			<h1 class="text-xl font-bold text-gray-800">
				ぶんしょう かき
				{#if targetKanjiChar}
					<span class="ml-2 rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">「{targetKanjiChar}」</span>
				{/if}
			</h1>
			<span class="text-lg text-gray-500">{currentIndex + 1} / {questionList.length}</span>
		</div>
	</header>

	<main class="flex-1 flex overflow-hidden min-h-0">
		{#if currentExample}
			<div class="w-1/2 flex flex-col bg-gradient-to-br from-amber-50 to-yellow-100 p-3">
				<div class="flex-1 min-h-0 flex items-center justify-center">
					<VerticalSentence
						sentence={currentExample.example.sentenceWithRuby || currentExample.example.sentence}
						targetKanji={currentExample.kanji.character}
						targetReading={currentExample.example.reading}
						showBlank={true}
						showRuby={true}
					/>
				</div>
				<div class="flex-shrink-0 flex justify-center py-2">
					<SpeakButton text={currentExample.example.sentence} size="md" />
				</div>
			</div>

			<div class="w-1/2 flex flex-col justify-center items-center p-4 bg-white/50">
				<div class="mb-4 text-center">
					<span class="inline-block rounded-full bg-yellow-100 px-4 py-2 text-xl font-bold text-yellow-700">
						「？」に はいる かんじは？
					</span>
					{#if answerMode === 'writing'}
						<div class="mt-2 text-sm text-gray-500">
							{#if helpLevel === 0}
								✨ じぶんでかいてみよう
							{:else}
								📝 おてほんをみながらかこう
							{/if}
						</div>
					{/if}
				</div>

				{#if answerMode === 'choice'}
					<div class="grid grid-cols-2 gap-3 mb-4">
						{#each choices as choice}
							{@const isSelected = selectedAnswer === choice}
							{@const isCorrectChoice = choice === currentExample.kanji.character}
							<button
								onclick={() => handleSelect(choice)}
								disabled={showResult}
								class="w-24 h-24 rounded-2xl text-4xl font-bold transition-all active:scale-95
									{showResult && isCorrectChoice ? 'bg-green-500 text-white' : ''}
									{showResult && isSelected && !isCorrectChoice ? 'bg-red-400 text-white' : ''}
									{!showResult ? 'bg-white text-gray-700 shadow-lg hover:shadow-xl hover:bg-gray-50' : ''}
									{showResult && !isSelected && !isCorrectChoice ? 'bg-gray-100 text-gray-400' : ''}"
							>
								{choice}
							</button>
						{/each}
					</div>
				{:else}
					<div class="mb-4">
						{#if helpLevel === 0}
							<!-- 自由描画モード -->
							<WritingCanvas
								bind:this={canvasRef}
								width={240}
								height={240}
								strokeColor="#333"
								strokeWidth={4}
							/>
						{:else if KanjiWriterComponent}
							<!-- ガイド付きモード -->
							<KanjiWriterComponent
								bind:this={writerRef}
								character={currentExample.kanji.character}
								size={240}
								showOutline={true}
								onComplete={handleQuizComplete}
								onMistake={handleQuizMistake}
							/>
						{/if}
					</div>

					{#if !showResult}
						{#if helpLevel === 0}
							<!-- 自由描画モードのボタン -->
							<div class="flex gap-2 mb-4">
								<button
									onclick={handleClearCanvas}
									class="rounded-xl bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
								>
									🔄 けす
								</button>
								<button
									onclick={handleFreeDrawSubmit}
									disabled={isRecognizing}
									class="rounded-xl bg-green-500 px-6 py-2 text-white font-bold hover:bg-green-600 disabled:opacity-50"
								>
									{isRecognizing ? '🔍 はんてい中...' : '✨ できた！'}
								</button>
							</div>
						{:else}
							<!-- ガイド付きモードのボタン -->
							<div class="flex gap-2 mb-4">
								<button
									onclick={handleShowHint}
									class="rounded-xl bg-blue-100 px-4 py-2 text-blue-700 hover:bg-blue-200"
								>
									💡 ヒント
								</button>
								<button
									onclick={handleShowAnimation}
									class="rounded-xl bg-purple-100 px-4 py-2 text-purple-700 hover:bg-purple-200"
								>
									▶ おてほん
								</button>
							</div>
						{/if}
					{/if}
				{/if}

				{#if showResult}
					<div class="mb-4 text-center">
						{#if isCorrect}
							<div class="text-5xl mb-1">⭕</div>
							<div class="text-xl font-bold text-green-600">{UI.correct}</div>
						{:else}
							<div class="text-5xl mb-1">❌</div>
							<div class="text-xl font-bold text-red-600">
								こたえは「{currentExample.kanji.character}」
							</div>
						{/if}
					</div>

					{#if !isCorrect}
						<button
							onclick={handleNext}
							class="rounded-2xl bg-orange-500 px-8 py-3 text-xl font-bold text-white
								   hover:bg-orange-600 active:scale-95 shadow-lg"
						>
							つぎへ →
						</button>
					{/if}
				{:else}
					{#if answerMode === 'choice'}
						<button
							onclick={handleSkip}
							class="mt-4 rounded-xl bg-gray-200 px-6 py-2 text-gray-600 hover:bg-gray-300"
						>
							むずかしい →
						</button>
					{:else}
						<button
							onclick={handleDifficult}
							class="mt-4 rounded-xl bg-gray-200 px-6 py-2 text-gray-600 hover:bg-gray-300"
						>
							{#if helpLevel === 0}むずかしい → おてほんをみる{:else}スキップ →{/if}
						</button>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="flex-1 flex items-center justify-center">
				<div class="text-2xl text-gray-500">{UI.loading}</div>
			</div>
		{/if}
	</main>
</div>
