<script lang="ts">
	import { UI } from '$lib/data/ui-text';
</script>

<svelte:head>
	<title>ぶんしょう - {UI.appName}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
	<header class="bg-white shadow-md">
		<div class="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
			<a href="/" class="text-xl text-purple-500 hover:text-purple-700">← {UI.back}</a>
			<h1 class="text-2xl font-bold text-gray-800">ぶんしょう</h1>
			<div class="w-16"></div>
		</div>
	</header>

	<main class="mx-auto max-w-lg px-4 py-8">
		<section class="mb-8 text-center">
			<p class="text-xl text-gray-600">ぶんしょうの なかで<br>かんじを がくしゅう しよう！</p>
		</section>

		<section class="grid gap-6">
			<a
				href="/bunsho/yomi"
				class="flex items-center gap-6 rounded-3xl bg-white p-6 shadow-xl
					   transition-all hover:scale-105 hover:shadow-2xl active:scale-95"
			>
				<div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100 text-5xl">
					📖
				</div>
				<div class="flex-1">
					<div class="text-2xl font-bold text-gray-800">よみモード</div>
					<div class="mt-1 text-lg text-gray-500">かんじの よみかたを あてよう</div>
				</div>
				<div class="text-3xl text-gray-300">→</div>
			</a>

			<a
				href="/bunsho/kaki"
				class="flex items-center gap-6 rounded-3xl bg-white p-6 shadow-xl
					   transition-all hover:scale-105 hover:shadow-2xl active:scale-95"
			>
				<div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-100 text-5xl">
					✏️
				</div>
				<div class="flex-1">
					<div class="text-2xl font-bold text-gray-800">かきモード</div>
					<div class="mt-1 text-lg text-gray-500">ただしい かんじを えらぼう</div>
				</div>
				<div class="text-3xl text-gray-300">→</div>
			</a>
		</section>
	</main>
</div>
