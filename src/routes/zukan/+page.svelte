<script lang="ts">
	import { onMount } from 'svelte';
	import { UI } from '$lib/data/ui-text';
	import { getAllProgress, type KanjiProgress } from '$lib/db';
	import { getGrowthIcon, type Kanji, type GrowthLevel } from '$lib/types';
	import GrowthIcon from '$lib/components/GrowthIcon.svelte';

	let kanjiList: Kanji[] = $state([]);
	let progressMap: Map<string, KanjiProgress> = $state(new Map());
	let loading = $state(true);
	let filterLevel: GrowthLevel | 'all' = $state('all');

	onMount(async () => {
		const [res, progressList] = await Promise.all([
			fetch('/data/kanji-g3.json'),
			getAllProgress()
		]);
		kanjiList = await res.json();
		progressMap = new Map(progressList.map((p) => [p.kanjiId, p]));
		loading = false;
	});

	function getProgress(kanjiId: string): KanjiProgress | undefined {
		return progressMap.get(kanjiId);
	}

	function getGrowth(kanjiId: string): GrowthLevel {
		return progressMap.get(kanjiId)?.growthLevel ?? 0;
	}

	const filteredList = $derived(
		filterLevel === 'all'
			? kanjiList
			: kanjiList.filter((k) => getGrowth(k.id) === filterLevel)
	);

	const counts = $derived(() => {
		const c: Record<GrowthLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
		for (const k of kanjiList) {
			c[getGrowth(k.id)]++;
		}
		return c;
	});

	function getBgClass(level: GrowthLevel): string {
		if (level === 0) return 'bg-gray-100 text-gray-300 border-gray-200';
		if (level === 1) return 'bg-green-50 text-gray-700 border-green-300';
		if (level === 2) return 'bg-green-100 text-gray-800 border-green-400';
		if (level === 3) return 'bg-emerald-100 text-gray-900 border-emerald-500';
		if (level === 5) return 'mastered-kanji text-gray-900 border-amber-400';
		if (level === 4) return 'bg-pink-50 text-gray-900 border-pink-400 shadow-md';
		return 'bg-white';
	}
</script>

<svelte:head>
	<title>{UI.zukanTitle} - {UI.appName}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
	<header class="sticky top-0 z-10 bg-white shadow-md">
		<div class="mx-auto max-w-lg px-4 py-4">
			<div class="flex items-center justify-between">
				<a href="/" class="text-xl text-blue-500 hover:text-blue-700">← {UI.back}</a>
				<h1 class="text-2xl font-bold text-gray-800">{UI.zukanTitle}</h1>
				<span class="text-xl text-gray-600">{filteredList.length}/{kanjiList.length}</span>
			</div>

			<!-- フィルター -->
			<div class="mt-4 flex flex-wrap justify-center gap-2">
				<button
					onclick={() => filterLevel = 'all'}
					class="rounded-full px-4 py-2 text-lg font-medium transition-all
						{filterLevel === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}"
				>
					ぜんぶ
				</button>
				{#each [0, 1, 2, 3, 4, 5] as level}
					<button
						onclick={() => filterLevel = level as GrowthLevel}
						class="rounded-full px-4 py-2 text-lg font-medium transition-all
							{filterLevel === level ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}"
					>
						{getGrowthIcon(level as GrowthLevel)} {counts()[level as GrowthLevel]}
					</button>
				{/each}
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-lg px-4 py-6">
		{#if loading}
			<div class="py-20 text-center text-2xl text-gray-500">{UI.loading}</div>
		{:else if filteredList.length === 0}
			<div class="py-20 text-center text-2xl text-gray-500">{UI.notFound}</div>
		{:else}
			<!-- 5列グリッド -->
			<section class="grid grid-cols-5 gap-3">
				{#each filteredList as kanji}
					{@const growth = getGrowth(kanji.id)}
					{@const progress = getProgress(kanji.id)}
					{@const yomiLevel = progress?.bunshoYomiLevel ?? 0}
					{@const kakiLevel = progress?.bunshoKakiLevel ?? 0}
					<a
						href="/zukan/{kanji.id}"
						class="relative flex aspect-square flex-col items-center justify-center rounded-2xl border-4
							   transition-all hover:scale-110 active:scale-95 {getBgClass(growth)}"
					>
						{#if growth === 0}
							<span class="text-4xl font-bold">?</span>
						{:else}
							<span class="text-4xl font-bold">{kanji.character}</span>
						{/if}
						<!-- 2トラック表示 -->
						<div class="absolute -bottom-1 flex gap-1 text-sm">
							<span title="よみ">{getGrowthIcon(yomiLevel as GrowthLevel)}</span>
							<span title="かき">{getGrowthIcon(kakiLevel as GrowthLevel)}</span>
						</div>
					</a>
				{/each}
			</section>

			<!-- 凡例 -->
			<div class="mt-6 flex justify-center gap-6 text-sm text-gray-500">
				<span>📖 よみ</span>
				<span>✏️ かき</span>
			</div>
		{/if}
	</main>
</div>

<style>
	.mastered-kanji {
		background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fef3c7 100%);
		border-width: 3px;
		box-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
		animation: shimmer 2s ease-in-out infinite;
	}

	@keyframes shimmer {
		0%, 100% {
			box-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
		}
		50% {
			box-shadow: 0 0 20px rgba(251, 191, 36, 0.8), 0 0 30px rgba(251, 191, 36, 0.4);
		}
	}
</style>
