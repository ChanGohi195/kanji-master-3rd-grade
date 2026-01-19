<script lang="ts">
	import { UI } from '$lib/data/ui-text';
	import { settings } from '$lib/stores/settings';
	import { clearAllData } from '$lib/db';

	let showPinInput = $state(false);
	let pinInput = $state('');
	let pinError = $state(false);

	function handlePinSubmit() {
		if (pinInput === $settings.parentPin) {
			window.location.href = '/parent';
		} else {
			pinError = true;
			pinInput = '';
		}
	}

	function handlePinDigit(digit: string) {
		if (pinInput.length < 4) {
			pinInput += digit;
			pinError = false;
		}
		if (pinInput.length === 4) {
			setTimeout(handlePinSubmit, 200);
		}
	}

	function handlePinClear() {
		pinInput = '';
		pinError = false;
	}

	async function handleClearData() {
		if (confirm('ほんとうに がくしゅうきろくを けしますか？')) {
			await clearAllData();
			alert('けしました');
		}
	}
</script>

<svelte:head>
	<title>{UI.settings} - {UI.appName}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
	<header class="bg-white shadow-md">
		<div class="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
			<a href="/" class="text-xl text-gray-500 hover:text-gray-700">← {UI.back}</a>
			<h1 class="text-2xl font-bold text-gray-800">{UI.settings}</h1>
			<div class="w-16"></div>
		</div>
	</header>

	<main class="mx-auto max-w-lg px-4 py-6">
		{#if !showPinInput}
			<!-- 音声設定 -->
			<section class="mb-6 rounded-3xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-2xl font-bold text-gray-700">🔊 おと</h2>
				<label class="flex items-center justify-between">
					<span class="text-xl text-gray-600">よみあげ</span>
					<input
						type="checkbox"
						checked={$settings.soundEnabled}
						onchange={(e) => settings.update(s => ({ ...s, soundEnabled: e.currentTarget.checked }))}
						class="h-8 w-8 rounded"
					/>
				</label>
			</section>

			<!-- 線の太さ -->
			<section class="mb-6 rounded-3xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-2xl font-bold text-gray-700">✏️ {UI.strokeWidth}</h2>
				<input
					type="range"
					min="2"
					max="8"
					step="1"
					value={$settings.strokeWidth}
					oninput={(e) => settings.update(s => ({ ...s, strokeWidth: parseInt(e.currentTarget.value) }))}
					class="w-full h-3 rounded-lg appearance-none bg-gray-200"
				/>
				<div class="mt-2 text-center text-xl text-gray-600">{$settings.strokeWidth}</div>
			</section>

			<!-- ほごしゃモード -->
			<section class="mb-6 rounded-3xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-2xl font-bold text-gray-700">👨‍👩‍👧 {UI.parentMode}</h2>
				<button
					onclick={() => showPinInput = true}
					class="w-full rounded-2xl bg-indigo-500 py-4 text-xl font-bold text-white hover:bg-indigo-600 active:scale-95"
				>
					{UI.enterPin}
				</button>
			</section>

			<!-- データ削除 -->
			<section class="mb-6 rounded-3xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-2xl font-bold text-gray-700">🗑️ データ</h2>
				<button
					onclick={handleClearData}
					class="w-full rounded-2xl bg-red-100 py-4 text-xl font-bold text-red-600 hover:bg-red-200 active:scale-95"
				>
					がくしゅうきろくをけす
				</button>
			</section>
		{:else}
			<!-- PIN入力画面 -->
			<section class="rounded-3xl bg-white p-6 shadow-lg">
				<div class="mb-6 text-center">
					<h2 class="text-2xl font-bold text-gray-700">{UI.enterPin}</h2>
					<p class="mt-2 text-lg text-gray-500">4けたの すうじを いれてね</p>
				</div>

				<!-- PIN表示 -->
				<div class="mb-6 flex justify-center gap-3">
					{#each [0, 1, 2, 3] as i}
						<div class="flex h-16 w-16 items-center justify-center rounded-2xl border-4
							{pinError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}">
							<span class="text-3xl">{pinInput[i] ? '●' : ''}</span>
						</div>
					{/each}
				</div>

				{#if pinError}
					<div class="mb-4 text-center text-xl text-red-500">ちがいます</div>
				{/if}

				<!-- 数字キーパッド -->
				<div class="grid grid-cols-3 gap-3">
					{#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'] as key}
						{#if key === ''}
							<div></div>
						{:else if key === '←'}
							<button
								onclick={handlePinClear}
								class="rounded-2xl bg-gray-200 py-5 text-2xl font-bold text-gray-600 hover:bg-gray-300 active:scale-95"
							>
								{key}
							</button>
						{:else}
							<button
								onclick={() => handlePinDigit(key)}
								class="rounded-2xl bg-indigo-100 py-5 text-3xl font-bold text-indigo-700 hover:bg-indigo-200 active:scale-95"
							>
								{key}
							</button>
						{/if}
					{/each}
				</div>

				<button
					onclick={() => { showPinInput = false; pinInput = ''; pinError = false; }}
					class="mt-6 w-full text-xl text-gray-500 hover:text-gray-700"
				>
					{UI.back}
				</button>
			</section>
		{/if}
	</main>
</div>
