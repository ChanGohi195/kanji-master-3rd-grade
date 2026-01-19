<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { UI } from '$lib/data/ui-text';
	import { getProgress, type KanjiProgress } from '$lib/db';
	import { getGrowthIcon, getGrowthLabel, formatReadings, type Kanji, type GrowthLevel } from '$lib/types';
	import GrowthIcon from '$lib/components/GrowthIcon.svelte';
	import SpeakButton from '$lib/components/SpeakButton.svelte';

	let kanji: Kanji | null = $state(null);
	let progress: KanjiProgress | null = $state(null);
	let loading = $state(true);
	let totalExamples = $state(5); // 例文総数

	// KanjiWriter動的インポート
	let KanjiWriterComponent: any = $state(null);
	let writerRef: any = $state(null);
	let isPracticing = $state(false);
	let isAnimating = $state(false);

	onMount(async () => {
		const kanjiId = $page.params.id;
		const res = await fetch('/data/kanji-g3.json');
		const kanjiList: Kanji[] = await res.json();
		kanji = kanjiList.find((k) => k.id === kanjiId) || null;
		if (kanji) {
			progress = (await getProgress(kanjiId)) || null;

			// 例文数を取得
			const exRes = await fetch('/data/examples.json');
			const examples = await exRes.json();
			const kanjiExamples = examples.find((e: any) => e.kanjiId === kanjiId);
			if (kanjiExamples) {
				totalExamples = kanjiExamples.examples.length;
			}
		}

		// KanjiWriter読み込み
		if (browser) {
			const module = await import('$lib/components/KanjiWriter.svelte');
			KanjiWriterComponent = module.default;
		}

		loading = false;
	});

	function getGrowth(): GrowthLevel {
		return progress?.growthLevel ?? 0;
	}

	function getBunshoYomiLevel(): GrowthLevel {
		return progress?.bunshoYomiLevel ?? 0;
	}

	function getBunshoKakiLevel(): GrowthLevel {
		return progress?.bunshoKakiLevel ?? 0;
	}

	// 書き順アニメーション
	async function handleAnimate() {
		if (!writerRef || isAnimating) return;
		isAnimating = true;
		isPracticing = false;
		writerRef.cancelQuiz?.();
		await writerRef.animateCharacter();
		isAnimating = false;
	}

	// 練習モード開始
	function handleStartPractice() {
		if (!writerRef) return;
		isPracticing = true;
		writerRef.startQuiz();
	}

	// 練習完了
	function handlePracticeComplete() {
		isPracticing = false;
	}

	// リセット
	function handleReset() {
		isPracticing = false;
		writerRef?.cancelQuiz?.();
	}
</script>

<svelte:head>
	<title>{kanji?.character || 'かんじ'} - {UI.appName}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
	<header class="bg-white shadow-md">
		<div class="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
			<a href="/zukan" class="text-xl text-amber-500 hover:text-amber-700">← {UI.back}</a>
			<h1 class="text-2xl font-bold text-gray-800">かんじ</h1>
			<div class="w-16"></div>
		</div>
	</header>

	<main class="mx-auto max-w-lg px-4 py-6">
		{#if loading}
			<div class="py-20 text-center text-2xl text-gray-500">{UI.loading}</div>
		{:else if !kanji}
			<div class="py-20 text-center text-2xl text-gray-500">{UI.notFound}</div>
		{:else}
			<!-- 書き順キャンバス -->
			<section class="mb-6 rounded-3xl bg-white p-6 shadow-xl">
				<div class="flex flex-col items-center">
					{#if KanjiWriterComponent}
						<KanjiWriterComponent
							bind:this={writerRef}
							character={kanji.character}
							size={200}
							showOutline={true}
							showCharacter={!isPracticing}
							onComplete={handlePracticeComplete}
						/>
					{:else}
						<div class="text-[160px] font-bold leading-none text-gray-800">{kanji.character}</div>
					{/if}

					<!-- 操作ボタン -->
					<div class="mt-4 flex gap-3">
						<button
							onclick={handleAnimate}
							disabled={isAnimating}
							class="rounded-xl bg-purple-100 px-5 py-2 text-lg text-purple-700 hover:bg-purple-200 disabled:opacity-50"
						>
							{isAnimating ? '▶ ...' : '▶ かきじゅん'}
						</button>
						{#if !isPracticing}
							<button
								onclick={handleStartPractice}
								class="rounded-xl bg-orange-500 px-5 py-2 text-lg text-white font-bold hover:bg-orange-600"
							>
								✏️ れんしゅう
							</button>
						{:else}
							<button
								onclick={handleReset}
								class="rounded-xl bg-gray-200 px-5 py-2 text-lg text-gray-700 hover:bg-gray-300"
							>
								🔄 リセット
							</button>
						{/if}
					</div>
				</div>

				<!-- 読み方 + 音声 -->
				<div class="mt-6 space-y-3">
					{#if kanji.readings.kun.length > 0}
						<div class="flex items-center justify-center gap-3">
							<span class="rounded-full bg-green-100 px-3 py-1 text-lg text-green-700">くん</span>
							<span class="text-2xl text-gray-600">{kanji.readings.kun.join('・')}</span>
							<SpeakButton text={kanji.readings.kun.join('、')} size="md" />
						</div>
					{/if}
					{#if kanji.readings.on.length > 0}
						<div class="flex items-center justify-center gap-3">
							<span class="rounded-full bg-blue-100 px-3 py-1 text-lg text-blue-700">おん</span>
							<span class="text-2xl text-gray-600">{kanji.readings.on.join('・')}</span>
							<SpeakButton text={kanji.readings.on.join('、')} size="md" />
						</div>
					{/if}
				</div>

				<!-- 情報 -->
				<div class="mt-4 flex items-center justify-center gap-6 text-xl text-gray-500">
					<span>{kanji.strokeCount}かく</span>
					<span class="flex items-center gap-1">
						<span class="text-2xl">{getGrowthIcon(getGrowth())}</span>
						<span class="text-amber-700">{getGrowthLabel(getGrowth())}</span>
					</span>
				</div>
			</section>

			<!-- 習熟度トラック -->
			<section class="mb-6 rounded-3xl bg-white p-5 shadow-xl">
				<div class="grid grid-cols-2 gap-4 text-center">
					<div class="flex items-center justify-center gap-3">
						<span class="text-3xl">{getGrowthIcon(getBunshoYomiLevel())}</span>
						<div class="text-left">
							<div class="text-lg font-bold text-gray-700">📖 よみ</div>
							<div class="text-sm text-gray-400">{progress?.bunshoYomiCompleted?.length ?? 0}/{totalExamples}</div>
						</div>
					</div>
					<div class="flex items-center justify-center gap-3">
						<span class="text-3xl">{getGrowthIcon(getBunshoKakiLevel())}</span>
						<div class="text-left">
							<div class="text-lg font-bold text-gray-700">✏️ かき</div>
							<div class="text-sm text-gray-400">{progress?.bunshoKakiCompleted?.length ?? 0}/{totalExamples}</div>
						</div>
					</div>
				</div>
			</section>

			<!-- 文章練習ボタン -->
			<section class="grid grid-cols-2 gap-4">
				<a
					href="/bunsho/kaki?kanji={kanji.character}"
					class="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 py-4 text-white
						   shadow-lg hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all"
				>
					<span class="text-2xl">📝</span>
					<span class="text-lg font-bold">ぶんしょう かき</span>
				</a>
				<a
					href="/bunsho/yomi?kanji={kanji.character}"
					class="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 py-4 text-white
						   shadow-lg hover:from-green-600 hover:to-emerald-600 active:scale-95 transition-all"
				>
					<span class="text-2xl">📗</span>
					<span class="text-lg font-bold">ぶんしょう よみ</span>
				</a>
			</section>
		{/if}
	</main>
</div>
