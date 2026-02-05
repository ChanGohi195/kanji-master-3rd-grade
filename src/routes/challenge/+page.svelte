<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { UI } from '$lib/data/ui-text';
	import { playCorrectSound, playCloseSound, playIncorrectSound } from '$lib/services/sound';
	import { recordStudy, recordBunshoStudy } from '$lib/db';
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

	type QuestionType = 'yomi' | 'kaki';
	type GameState = 'ready' | 'playing' | 'finished';

	// ゲーム状態
	let gameState: GameState = $state('ready');
	let timeLeft = $state(120); // 2分 = 120秒
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// 問題データ
	let allExamples: KanjiExample[] = $state([]);
	let currentQuestion: { kanji: KanjiExample; example: Example } | null = $state(null);
	let questionType: QuestionType = $state('yomi');

	// 読み問題用
	let choices: string[] = $state([]);
	let selectedAnswer: string | null = $state(null);

	// 書き問題用
	let KanjiWriterComponent: any = $state(null);
	let writerRef: any = $state(null);
	let mistakeCount = $state(0);
	let quizStarted = $state(false);

	// 書き問題のサブタイプ: 'stroke'=筆順クイズ, 'freehand'=手書き認識
	type KakiMode = 'stroke' | 'freehand';
	let kakiMode: KakiMode = $state('stroke');
	let canvasRef: WritingCanvas | undefined = $state(undefined);
	let isRecognizing = $state(false);

	// 共通
	let showResult = $state(false);
	let isCorrect = $state(false);

	// 結果集計
	let results = $state({
		yomi: { correct: 0, total: 0 },
		kaki: { correct: 0, total: 0 },
		mistakes: [] as { kanji: string; type: QuestionType }[]
	});

	// 読みから送り仮名を除去
	function getStemReading(reading: string): string {
		return reading.includes('.') ? reading.split('.')[0] : reading;
	}

	onMount(async () => {
		const res = await fetch('/data/examples.json');
		allExamples = await res.json();

		if (browser) {
			const module = await import('$lib/components/KanjiWriter.svelte');
			KanjiWriterComponent = module.default;
		}
	});

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
		if (activityInterval) clearInterval(activityInterval);
	});

	function startGame() {
		gameState = 'playing';
		timeLeft = 120;
		results = {
			yomi: { correct: 0, total: 0 },
			kaki: { correct: 0, total: 0 },
			mistakes: []
		};

		timerInterval = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) {
				endGame();
			}
		}, 1000);

		loadNextQuestion();
	}

	function endGame() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		gameState = 'finished';
	}

	function loadNextQuestion() {
		// ランダムに読み/書きを選択
		questionType = Math.random() < 0.5 ? 'yomi' : 'kaki';

		// ランダムに問題を選択
		const randomKanji = allExamples[Math.floor(Math.random() * allExamples.length)];
		const randomExample = randomKanji.examples[Math.floor(Math.random() * randomKanji.examples.length)];
		currentQuestion = { kanji: randomKanji, example: randomExample };

		// 状態リセット
		selectedAnswer = null;
		showResult = false;
		isCorrect = false;
		mistakeCount = 0;
		quizStarted = false;
		isRecognizing = false;
		canvasRef?.clear();

		if (questionType === 'yomi') {
			generateChoices();
		} else {
			// 書き問題: 非サポート漢字は手書き認識のみ、それ以外はランダム
			if (unsupportedKanji.has(currentQuestion.kanji.character)) {
				kakiMode = 'freehand';
			} else {
				kakiMode = Math.random() < 0.5 ? 'stroke' : 'freehand';
			}
		}

		startActivityTracking();
	}

	function generateChoices() {
		if (!currentQuestion) return;

		const correct = currentQuestion.example.reading;
		const allReadings = allExamples
			.flatMap(k => k.examples.map(e => e.reading))
			.filter(r => r !== correct);

		const shuffled = [...new Set(allReadings)].sort(() => Math.random() - 0.5);
		const wrongChoices = shuffled.slice(0, 3);

		choices = [correct, ...wrongChoices].sort(() => Math.random() - 0.5);
	}

	// 読み問題の回答処理
	async function handleYomiSelect(answer: string) {
		if (showResult || !currentQuestion) return;

		selectedAnswer = answer;
		isCorrect = answer === currentQuestion.example.reading;
		showResult = true;

		const timeSpent = stopActivityTracking();

		results.yomi.total++;
		if (isCorrect) {
			results.yomi.correct++;
			playCorrectSound();
		} else {
			results.mistakes.push({ kanji: currentQuestion.kanji.character, type: 'yomi' });
			playIncorrectSound();
		}

		// 進捗を記録
		await recordStudy({
			kanjiId: currentQuestion.kanji.kanjiId,
			mode: 'reading',
			result: isCorrect ? 'correct' : 'incorrect',
			score: isCorrect ? 1 : 0,
			hintUsed: false,
			timeSpent
		});
		await recordBunshoStudy(
			currentQuestion.kanji.kanjiId,
			currentQuestion.example.id,
			'yomi',
			isCorrect
		);

		setTimeout(loadNextQuestion, isCorrect ? 500 : 1000);
	}

	// HanziWriterでサポートされていない漢字（日本の新字体）
	const unsupportedKanji = new Set(['図', '売', '姉', '帰', '広', '戸', '楽', '歩', '毎', '絵', '読', '顔', '黒']);

	// 書き問題の筆順クイズ自動開始（kakiMode === 'stroke'の場合のみ）
	$effect(() => {
		if (gameState === 'playing' && questionType === 'kaki' && kakiMode === 'stroke' && KanjiWriterComponent && writerRef && !quizStarted && !showResult) {
			quizStarted = true;
			mistakeCount = 0;
			setTimeout(() => writerRef?.startQuiz(), 150);
		}
	});

	// 手書き認識で「できた！」を押した時
	async function handleFreehandSubmit() {
		if (!currentQuestion || !canvasRef || isRecognizing) return;
		if (!canvasRef.hasStrokes()) return;

		isRecognizing = true;

		const imageData = canvasRef.getImageForRecognition(64);
		const result = recognizeKanji(imageData, currentQuestion.kanji.character, {
			userStrokeCount: canvasRef.getStrokeCount(),
			expectedStrokeCount: currentQuestion.kanji.strokeCount
		});

		isRecognizing = false;
		isCorrect = result.isCorrect;
		showResult = true;

		const timeSpent = stopActivityTracking();

		results.kaki.total++;
		if (isCorrect) {
			results.kaki.correct++;
			playCorrectSound();
		} else {
			results.mistakes.push({ kanji: currentQuestion.kanji.character, type: 'kaki' });
			playIncorrectSound();
		}

		// 進捗を記録
		await recordStudy({
			kanjiId: currentQuestion.kanji.kanjiId,
			mode: 'writing',
			result: isCorrect ? 'correct' : 'incorrect',
			score: isCorrect ? result.confidence : 0,
			hintUsed: false,
			timeSpent
		});
		await recordBunshoStudy(
			currentQuestion.kanji.kanjiId,
			currentQuestion.example.id,
			'kaki',
			isCorrect
		);

		setTimeout(loadNextQuestion, isCorrect ? 500 : 1000);
	}

	function handleClearCanvas() {
		canvasRef?.clear();
	}

	// 書き問題の完了処理
	async function handleQuizComplete() {
		if (!currentQuestion) return;

		isCorrect = mistakeCount <= 2;
		showResult = true;

		const timeSpent = stopActivityTracking();

		results.kaki.total++;
		if (isCorrect) {
			results.kaki.correct++;
			if (mistakeCount === 0) {
				playCorrectSound();
			} else {
				playCloseSound();
			}
		} else {
			results.mistakes.push({ kanji: currentQuestion.kanji.character, type: 'kaki' });
			playIncorrectSound();
		}

		// 進捗を記録
		const result = mistakeCount === 0 ? 'correct' : mistakeCount <= 2 ? 'close' : 'incorrect';
		const score = Math.max(0, 1 - mistakeCount * 0.2);
		await recordStudy({
			kanjiId: currentQuestion.kanji.kanjiId,
			mode: 'writing',
			result,
			score,
			hintUsed: false,
			timeSpent
		});
		await recordBunshoStudy(
			currentQuestion.kanji.kanjiId,
			currentQuestion.example.id,
			'kaki',
			isCorrect
		);

		setTimeout(loadNextQuestion, isCorrect ? 500 : 1000);
	}

	function handleQuizMistake() {
		mistakeCount++;
	}

	// スキップ機能（記録せずに次の問題へ）
	function handleSkip() {
		if (showResult) return;
		stopActivityTracking();
		loadNextQuestion();
	}

	// タイマー表示用
	function formatTime(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	// タイマーの色
	let timerColor = $derived(
		timeLeft > 60 ? 'text-green-600' :
		timeLeft > 30 ? 'text-yellow-600' : 'text-red-600'
	);

	// タイマーのアニメーション
	let timerPulse = $derived(timeLeft <= 10 && timeLeft > 0);

	// 総合スコア
	let totalScore = $derived(results.yomi.correct + results.kaki.correct);
	let totalQuestions = $derived(results.yomi.total + results.kaki.total);
</script>

<svelte:head>
	<title>チャレンジ - {UI.appName}</title>
</svelte:head>

<div
	class="h-screen flex flex-col bg-gradient-to-br from-purple-50 to-pink-100"
	onmousemove={handleActivity}
	onclick={handleActivity}
	ontouchstart={handleActivity}
	onkeydown={handleActivity}
>
	{#if gameState === 'ready'}
		<!-- スタート画面 -->
		<div class="flex-1 flex flex-col items-center justify-center p-6">
			<h1 class="text-4xl font-bold text-purple-700 mb-4">チャレンジ</h1>
			<p class="text-xl text-gray-600 mb-8 text-center">
				2ふんかん で<br/>
				なんもん とけるかな？
			</p>

			<div class="bg-white rounded-3xl p-6 shadow-lg mb-8 max-w-sm">
				<h2 class="text-lg font-bold text-gray-700 mb-3">ルール</h2>
				<ul class="text-gray-600 space-y-2">
					<li>- よみもんだい と かきもんだい</li>
					<li>- ランダムに しゅつだい</li>
					<li>- じかんは 2ふん</li>
				</ul>
			</div>

			<button
				onclick={startGame}
				class="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-2xl font-bold
					   px-12 py-4 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all"
			>
				スタート！
			</button>

			<a href="/" class="mt-6 text-gray-500 hover:text-gray-700">← ホームへ</a>
		</div>

	{:else if gameState === 'playing'}
		<!-- プレイ中 -->
		<header class="bg-white shadow-md flex-shrink-0">
			<div class="flex items-center justify-between px-4 py-2">
				<!-- やめるボタン -->
				<button
					onclick={endGame}
					class="text-gray-500 hover:text-gray-700 text-lg"
				>
					← やめる
				</button>

				<div class="flex items-center gap-3">
					<!-- タイマー -->
					<div class="text-2xl font-bold {timerColor} {timerPulse ? 'animate-pulse' : ''}">
						{formatTime(timeLeft)}
					</div>
					<span class="text-gray-400">|</span>
					<span class="text-lg text-gray-600">{questionType === 'yomi' ? 'よみ' : 'かき'}</span>
				</div>

				<!-- スコア -->
				<div class="text-xl font-bold text-purple-600">
					{totalScore}もん
				</div>
			</div>
		</header>

		<main class="flex-1 flex overflow-hidden min-h-0">
			{#if currentQuestion}
				<!-- 左側: 文章表示 -->
				<div class="w-1/2 flex flex-col bg-gradient-to-br from-amber-50 to-yellow-100 p-3">
					<div class="flex-1 min-h-0 flex items-center justify-center">
						<VerticalSentence
							sentence={questionType === 'kaki'
								? (currentQuestion.example.sentenceWithRuby || currentQuestion.example.sentence)
								: currentQuestion.example.sentence}
							targetKanji={currentQuestion.kanji.character}
							targetReading={questionType === 'kaki' ? currentQuestion.example.reading : undefined}
							showBlank={questionType === 'kaki'}
							showRuby={questionType === 'kaki'}
						/>
					</div>
				</div>

				<!-- 右側: 回答エリア -->
				<div class="w-1/2 flex flex-col justify-center items-center p-4 bg-white/50">
					{#if questionType === 'yomi'}
						<!-- 読み問題 -->
						<div class="mb-4 text-center">
							<span class="inline-block rounded-full bg-green-100 px-4 py-2 text-xl font-bold text-green-700">
								「{currentQuestion.kanji.character}」の よみかたは？
							</span>
						</div>

						<div class="grid grid-cols-2 gap-3 mb-4">
							{#each choices as choice}
								{@const isSelected = selectedAnswer === choice}
								{@const isCorrectChoice = choice === currentQuestion.example.reading}
								<button
									onclick={() => handleYomiSelect(choice)}
									disabled={showResult}
									class="w-32 h-16 rounded-2xl text-2xl font-bold transition-all active:scale-95
										{showResult && isCorrectChoice ? 'bg-green-500 text-white' : ''}
										{showResult && isSelected && !isCorrectChoice ? 'bg-red-400 text-white' : ''}
										{!showResult ? 'bg-white text-gray-700 shadow-lg hover:shadow-xl hover:bg-gray-50' : ''}
										{showResult && !isSelected && !isCorrectChoice ? 'bg-gray-100 text-gray-400' : ''}"
								>
									{getStemReading(choice)}
								</button>
							{/each}
						</div>

					{:else}
						<!-- 書き問題 -->
						<div class="mb-4 text-center">
							<span class="inline-block rounded-full bg-orange-100 px-4 py-2 text-xl font-bold text-orange-700">
								「？」に はいる かんじは？
							</span>
							<div class="mt-2 text-base text-gray-500">
								{#if kakiMode === 'stroke'}
									ただしい ひつじゅんで かこう
								{:else}
									じぶんで かいてみよう
								{/if}
							</div>
						</div>

						<div class="mb-4">
							{#if kakiMode === 'stroke'}
								<!-- 筆順クイズ -->
								{#if KanjiWriterComponent}
									<KanjiWriterComponent
										bind:this={writerRef}
										character={currentQuestion.kanji.character}
										size={240}
										showOutline={true}
										onComplete={handleQuizComplete}
										onMistake={handleQuizMistake}
									/>
								{/if}
							{:else}
								<!-- 手書き認識 -->
								<WritingCanvas
									bind:this={canvasRef}
									width={240}
									height={240}
									strokeColor="#333"
									strokeWidth={3}
								/>
							{/if}
						</div>

						{#if kakiMode === 'freehand' && !showResult}
							<div class="flex gap-2 mb-4">
								<button
									onclick={handleClearCanvas}
									class="rounded-xl bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
								>
									けす
								</button>
								<button
									onclick={handleFreehandSubmit}
									disabled={isRecognizing}
									class="rounded-xl bg-green-500 px-6 py-2 text-white font-bold hover:bg-green-600 disabled:opacity-50"
								>
									{isRecognizing ? 'はんてい中...' : 'できた！'}
								</button>
							</div>
						{/if}

					{/if}

					{#if showResult}
						<div class="text-center">
							{#if isCorrect}
								<div class="text-5xl">⭕</div>
							{:else}
								<div class="text-5xl">❌</div>
								<div class="text-lg text-red-600 mt-1">
									こたえ: {questionType === 'yomi' ? currentQuestion.example.reading : currentQuestion.kanji.character}
								</div>
							{/if}
						</div>
					{:else}
						<!-- スキップボタン -->
						<button
							onclick={handleSkip}
							class="mt-4 text-gray-400 hover:text-gray-600 text-sm"
						>
							スキップ →
						</button>
					{/if}
				</div>
			{:else}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-2xl text-gray-500">{UI.loading}</div>
				</div>
			{/if}
		</main>

	{:else}
		<!-- 結果画面 -->
		<div class="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
			<h1 class="text-3xl font-bold text-purple-700 mb-2">けっか</h1>

			<!-- 総合スコア -->
			<div class="bg-white rounded-3xl p-8 shadow-xl mb-6 text-center">
				<div class="text-6xl font-bold text-purple-600 mb-2">
					{totalScore}<span class="text-3xl text-gray-500">もん</span>
				</div>
				<div class="text-xl text-gray-600">
					せいかい！
				</div>
			</div>

			<!-- 詳細 -->
			<div class="bg-white rounded-2xl p-6 shadow-lg mb-6 w-full max-w-sm">
				<h2 class="text-lg font-bold text-gray-700 mb-4">しょうさい</h2>

				<div class="space-y-3">
					<div class="flex justify-between items-center">
						<span class="text-green-600 font-bold">よみもんだい</span>
						<span class="text-xl">
							{results.yomi.correct} / {results.yomi.total}
						</span>
					</div>
					<div class="flex justify-between items-center">
						<span class="text-orange-600 font-bold">かきもんだい</span>
						<span class="text-xl">
							{results.kaki.correct} / {results.kaki.total}
						</span>
					</div>
				</div>

				{#if results.mistakes.length > 0}
					<div class="mt-4 pt-4 border-t">
						<h3 class="text-sm text-gray-500 mb-2">まちがえた かんじ</h3>
						<div class="flex flex-wrap gap-2">
							{#each [...new Set(results.mistakes.map(m => m.kanji))] as kanji}
								<a
									href="/zukan/{allExamples.find(k => k.character === kanji)?.kanjiId || ''}"
									class="inline-block bg-gray-100 rounded-lg px-3 py-1 text-2xl hover:bg-gray-200"
								>
									{kanji}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- ボタン -->
			<div class="flex gap-4">
				<button
					onclick={startGame}
					class="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold
						   px-8 py-3 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all"
				>
					もういちど
				</button>
				<a
					href="/"
					class="bg-gray-200 text-gray-700 text-xl font-bold
						   px-8 py-3 rounded-full shadow-lg hover:bg-gray-300 active:scale-95 transition-all"
				>
					ホームへ
				</a>
			</div>
		</div>
	{/if}
</div>
