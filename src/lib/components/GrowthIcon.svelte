<script lang="ts">
	import type { GrowthLevel } from '../types';
	import { getGrowthIcon, getGrowthLabel } from '../types';

	let {
		level,
		size = 'md',
		showLabel = false
	}: {
		level: GrowthLevel;
		size?: 'sm' | 'md' | 'lg';
		showLabel?: boolean;
	} = $props();

	const sizeClasses = {
		sm: 'text-xl',
		md: 'text-2xl',
		lg: 'text-4xl'
	};
</script>

<span class="growth-icon inline-flex items-center gap-1" title={getGrowthLabel(level)}>
	<span class={sizeClasses[size]}>{getGrowthIcon(level)}</span>
	{#if showLabel}
		<span class="text-base text-gray-600">{getGrowthLabel(level)}</span>
	{/if}
</span>
