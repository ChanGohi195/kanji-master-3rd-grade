<script lang="ts">
	import { onMount } from 'svelte';
	import { UI } from '$lib/data/ui-text';
	import { getGrowthCounts } from '$lib/db';

	let totalKanji = $state(200);
	let growthCounts = $state<Record<number, number>>({ 0: 200, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
	let loading = $state(true);

	onMount(async () => {
		try {
			const counts = await getGrowthCounts();
			const learned = Object.values(counts).reduce((a, b) => a + b, 0);
			growthCounts = { ...counts, 0: totalKanji - learned };
		} catch (e) {
			console.error(e);
		}
		loading = false;
	});

	const discoveredCount = $derived(
		growthCounts[1] + growthCounts[2] + growthCounts[3] + growthCounts[4] + growthCounts[5]
	);
</script>

<svelte:head>
	<title>{UI.appName}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
	<!-- ヘッダー -->
	<header class="bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg">
		<div class="mx-auto max-w-lg px-6 py-6 text-center">
			<h1 class="text-4xl font-bold text-white drop-shadow-md">{UI.appName}</h1>
			<p class="mt-1 text-xl text-blue-100">{UI.grade}</p>
		</div>
	</header>

	<main class="mx-auto max-w-lg px-4 py-6">
		<!-- 進捗サマリー -->
		<section class="mb-6 rounded-3xl bg-white p-5 shadow-xl">
			<div class="mb-3 flex items-center justify-between text-lg">
				<span class="text-gray-600">あつめた かんじ</span>
				<span class="font-bold text-indigo-600">{discoveredCount} / {totalKanji}</span>
			</div>
			<div class="h-3 overflow-hidden rounded-full bg-gray-200">
				<div
					class="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-500"
					style="width: {totalKanji > 0 ? (discoveredCount / totalKanji) * 100 : 0}%"
				></div>
			</div>
			<div class="mt-3 flex justify-around text-center">
				<div><div class="text-2xl">🌱</div><div class="text-base font-bold text-green-400">{growthCounts[1]}</div></div>
				<div><div class="text-2xl">🌿</div><div class="text-base font-bold text-green-500">{growthCounts[2]}</div></div>
				<div><div class="text-2xl">🌳</div><div class="text-base font-bold text-green-600">{growthCounts[3]}</div></div>
				<div><div class="text-2xl">🌸</div><div class="text-base font-bold text-pink-500">{growthCounts[4] + growthCounts[5]}</div></div>
			</div>
		</section>

		<!-- メインメニュー -->
		<section class="mb-6 flex flex-col gap-4">
			<a href="/bunsho"
				class="group flex items-center gap-4 rounded-3xl bg-white p-5 shadow-lg
					   transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95">
				<div class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-4xl
							group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">📝</div>
				<div>
					<span class="text-2xl font-bold text-gray-700">れんしゅう</span>
					<p class="text-base text-gray-500">ぶんしょうで よみかき</p>
				</div>
			</a>

			<a href="/challenge"
				class="group flex items-center gap-4 rounded-3xl bg-white p-5 shadow-lg
					   transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95">
				<div class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100 text-4xl
							group-hover:from-purple-200 group-hover:to-pink-200 transition-colors">⏱️</div>
				<div>
					<span class="text-2xl font-bold text-gray-700">チャレンジ</span>
					<p class="text-base text-gray-500">タイムアタック！</p>
				</div>
			</a>

			<a href="/zukan"
				class="group flex items-center gap-4 rounded-3xl bg-white p-5 shadow-lg
					   transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95">
				<div class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-4xl
							group-hover:from-purple-200 group-hover:to-indigo-200 transition-colors">📚</div>
				<div>
					<span class="text-2xl font-bold text-gray-700">{UI.zukan}</span>
					<p class="text-base text-gray-500">あつめた かんじ</p>
				</div>
			</a>

			<a href="/kiroku"
				class="group flex items-center gap-4 rounded-3xl bg-white p-5 shadow-lg
					   transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95">
				<div class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-4xl
							group-hover:from-amber-200 group-hover:to-orange-200 transition-colors">📊</div>
				<div>
					<span class="text-2xl font-bold text-gray-700">きろく</span>
					<p class="text-base text-gray-500">がんばった じかん</p>
				</div>
			</a>
		</section>

		<!-- 設定 -->
		<section class="text-center">
			<a href="/settings"
				class="inline-flex items-center gap-2 rounded-full bg-gray-100 px-6 py-3 text-xl text-gray-600
					   hover:bg-gray-200 transition-colors">
				⚙️ {UI.settings}
			</a>
		</section>
	</main>
</div>
