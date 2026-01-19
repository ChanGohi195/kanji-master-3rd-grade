<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import HanziWriter from 'hanzi-writer';

	let {
		character,
		size = 280,
		showOutline = true,
		showCharacter = false,
		strokeAnimationSpeed = 1,
		delayBetweenStrokes = 300,
		onComplete = () => {},
		onCorrectStroke = () => {},
		onMistake = () => {}
	}: {
		character: string;
		size?: number;
		showOutline?: boolean;
		showCharacter?: boolean;
		strokeAnimationSpeed?: number;
		delayBetweenStrokes?: number;
		onComplete?: () => void;
		onCorrectStroke?: (data: any) => void;
		onMistake?: (data: any) => void;
	} = $props();

	let container: HTMLDivElement;
	let writer: HanziWriter | null = null;
	let quizActive = $state(false);
	let loadError = $state(false);
	let currentCharacter = '';

	onMount(() => {
		createWriter();
	});

	onDestroy(() => {
		if (writer) {
			writer.cancelQuiz();
		}
	});

	async function createWriter() {
		if (writer) {
			writer.cancelQuiz();
		}

		if (container) {
			container.innerHTML = '';
		}

		loadError = false;

		try {
			writer = HanziWriter.create(container, character, {
				width: size,
				height: size,
				padding: 5,
				showOutline,
				showCharacter,
				strokeAnimationSpeed,
				delayBetweenStrokes,
				strokeColor: '#333',
				outlineColor: '#ddd',
				drawingColor: '#333',
				drawingWidth: 8,
				showHintAfterMisses: 2,
				highlightOnComplete: true,
				charDataLoader: async (char: string) => {
					const encoded = encodeURIComponent(char);
					const url = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/' + encoded + '.json';
					const res = await fetch(url);
					if (!res.ok) {
						throw new Error('Character data not found');
					}
					return res.json();
				},
				onLoadCharDataError: () => {
					loadError = true;
				}
			});
		} catch (e) {
			loadError = true;
		}
	}

	$effect(() => {
		if (character === currentCharacter) return;
		currentCharacter = character;
		if (container && character) {
			createWriter();
			quizActive = false;
		}
	});

	export function animateStroke(strokeNum: number) {
		writer?.animateStroke(strokeNum);
	}

	export function animateCharacter() {
		return new Promise<void>((resolve) => {
			writer?.animateCharacter({
				onComplete: () => resolve()
			});
		});
	}

	export function startQuiz() {
		quizActive = true;
		writer?.quiz({
			onCorrectStroke: (data) => {
				onCorrectStroke(data);
			},
			onMistake: (data) => {
				onMistake(data);
			},
			onComplete: (data) => {
				quizActive = false;
				onComplete();
			}
		});
	}

	export function cancelQuiz() {
		quizActive = false;
		writer?.cancelQuiz();
	}

	export function showHint() {
		writer?.showHint();
	}

	export function hideCharacter() {
		writer?.hideCharacter();
	}

	export function showCharacterFn() {
		writer?.showCharacter();
	}

	export function isQuizActive(): boolean {
		return quizActive;
	}
</script>

{#if loadError}
	<div
		class="kanji-writer rounded-2xl border-4 border-amber-200 bg-white flex items-center justify-center"
		style="width: {size}px; height: {size}px;"
	>
		<span class="text-gray-800 font-bold" style="font-size: {size * 0.7}px; line-height: 1;">{character}</span>
	</div>
{:else}
	<div
		bind:this={container}
		class="kanji-writer rounded-2xl border-4 border-amber-200 bg-white"
		style="width: {size}px; height: {size}px;"
	></div>
{/if}

<style>
	.kanji-writer {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.kanji-writer :global(svg) {
		display: block;
	}
</style>
