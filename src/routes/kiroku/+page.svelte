<script lang="ts">
	import { onMount } from 'svelte';
	import { UI } from '$lib/data/ui-text';
	import { getTotalStudyTime, getTotalQuestionCount, getTodayStats } from '$lib/db';

	let totalTime = $state(0);
	let totalCount = $state(0);
	let todayTime = $state(0);
	let todayCount = $state(0);
	let loading = $state(true);

	onMount(async () => {
		const [total, count, today] = await Promise.all([
			getTotalStudyTime(),
			getTotalQuestionCount(),
			getTodayStats()
		]);

		totalTime = total;
		totalCount = count;
		todayTime = today.time;
		todayCount = today.count;
		loading = false;
	});

	function formatTime(ms: number): { hours: number; minutes: number } {
		const totalMinutes = Math.floor(ms / 60000);
		return {
			hours: Math.floor(totalMinutes / 60),
			minutes: totalMinutes % 60
		};
	}

	const totalFormatted = $derived(formatTime(totalTime));
	const todayFormatted = $derived(formatTime(todayTime));
</script>

<svelte:head>
	<title>きろく - {UI.appName}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
	<header class="bg-gradient-to-r from-amber-400 to-orange-400 shadow-lg">
		<div class="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
			<a href="/" class="text-2xl text-white hover:text-amber-100">←</a>
			<h1 class="text-3xl font-bold text-white drop-shadow-md">きろく</h1>
			<div class="w-8"></div>
		</div>
	</header>

	<main class="mx-auto max-w-lg px-4 py-6">
		{#if loading}
			<div class="py-20 text-center text-xl text-gray-500">よみこみちゅう...</div>
		{:else}
			<!-- 今日のがんばり -->
			<section class="mb-6 rounded-3xl bg-white p-6 shadow-xl">
				<h2 class="mb-4 text-center text-2xl font-bold text-amber-600">
					きょうの がんばり
				</h2>
				<div class="space-y-4">
					<div class="flex items-center gap-4 rounded-2xl bg-amber-50 p-4">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-3xl">
							&#x23F0;
						</div>
						<div>
							{#if todayFormatted.hours > 0}
								<p class="text-xl font-bold text-amber-700">
									{todayFormatted.hours}じかん {todayFormatted.minutes}ふん
								</p>
							{:else if todayFormatted.minutes > 0}
								<p class="text-xl font-bold text-amber-700">
									{todayFormatted.minutes}ふん
								</p>
							{:else}
								<p class="text-xl font-bold text-amber-700">まだ れんしゅう してないよ</p>
							{/if}
							<p class="text-base text-amber-600">べんきょう した じかん</p>
						</div>
					</div>

					<div class="flex items-center gap-4 rounded-2xl bg-orange-50 p-4">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-3xl">
							&#x270D;
						</div>
						<div>
							{#if todayCount > 0}
								<p class="text-xl font-bold text-orange-700">{todayCount}もん といたよ！</p>
							{:else}
								<p class="text-xl font-bold text-orange-700">まだ といて ないよ</p>
							{/if}
							<p class="text-base text-orange-600">といた もんだい</p>
						</div>
					</div>
				</div>
			</section>

			<!-- これまでのきろく -->
			<section class="rounded-3xl bg-white p-6 shadow-xl">
				<h2 class="mb-4 text-center text-2xl font-bold text-orange-600">
					これまでの きろく
				</h2>
				<div class="space-y-4">
					<div class="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-200 text-3xl">
							&#x1F3C6;
						</div>
						<div>
							{#if totalFormatted.hours > 0}
								<p class="text-xl font-bold text-amber-700">
									ぜんぶで {totalFormatted.hours}じかん {totalFormatted.minutes}ふん
								</p>
							{:else}
								<p class="text-xl font-bold text-amber-700">
									ぜんぶで {totalFormatted.minutes}ふん
								</p>
							{/if}
							<p class="text-base text-amber-600">がんばった じかん</p>
						</div>
					</div>

					<div class="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-orange-50 to-red-50 p-4">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-200 to-red-200 text-3xl">
							&#x1F4DD;
						</div>
						<div>
							<p class="text-xl font-bold text-orange-700">ぜんぶで {totalCount}もん</p>
							<p class="text-base text-orange-600">といた もんだい</p>
						</div>
					</div>
				</div>

				{#if totalCount >= 100}
					<div class="mt-6 rounded-2xl bg-gradient-to-r from-yellow-100 to-amber-100 p-4 text-center">
						<p class="text-lg font-bold text-yellow-700">
							&#x2728; すごい！{totalCount}もん も といたね！ &#x2728;
						</p>
					</div>
				{:else if totalCount >= 50}
					<div class="mt-6 rounded-2xl bg-gradient-to-r from-green-100 to-emerald-100 p-4 text-center">
						<p class="text-lg font-bold text-green-700">
							&#x1F44F; もうすこしで 100もん だ！
						</p>
					</div>
				{/if}
			</section>
		{/if}
	</main>
</div>
