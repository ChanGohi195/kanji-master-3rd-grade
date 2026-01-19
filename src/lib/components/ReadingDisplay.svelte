<script lang="ts">
	// 読みを表示（送り仮名は薄い色で区別）
	// 形式: "やす.む" → やす + む（送り仮名）
	interface Props {
		reading: string;
		class?: string;
	}

	let { reading, class: className = '' }: Props = $props();

	// "."で送り仮名を分離
	const parts = $derived(() => {
		if (reading.includes('.')) {
			const [stem, okurigana] = reading.split('.');
			return { stem, okurigana };
		}
		return { stem: reading, okurigana: '' };
	});
</script>

<span class={className}>
	<span>{parts().stem}</span>{#if parts().okurigana}<span class="text-gray-400">{parts().okurigana}</span>{/if}
</span>
