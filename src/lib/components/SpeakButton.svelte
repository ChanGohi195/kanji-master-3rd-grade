<script lang="ts">
	import { speak, initSpeech, isSpeechAvailable } from '../services/speech';
	import { onMount } from 'svelte';

	let {
		text,
		size = 'md'
	}: {
		text: string;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	let speaking = $state(false);
	let available = $state(false);

	onMount(() => {
		available = initSpeech();
	});

	async function handleClick() {
		if (speaking || !available) return;
		speaking = true;
		try {
			await speak(text);
		} catch (e) {
			console.error('Speech error:', e);
		}
		speaking = false;
	}

	const sizeClasses = {
		sm: 'w-10 h-10 text-xl',
		md: 'w-14 h-14 text-2xl',
		lg: 'w-16 h-16 text-3xl'
	};
</script>

{#if available}
	<button
		onclick={handleClick}
		disabled={speaking}
		class="speak-btn rounded-full bg-blue-100 hover:bg-blue-200 active:bg-blue-300 
			   flex items-center justify-center transition-all
			   disabled:opacity-50 {sizeClasses[size]}"
		aria-label="よみあげる"
	>
		{speaking ? '🔊' : '🔈'}
	</button>
{/if}

<style>
	.speak-btn:active {
		transform: scale(0.95);
	}
</style>
