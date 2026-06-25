<script lang="ts">
	import { onMount } from 'svelte';

	let { delayMs = 300 }: { delayMs?: number } = $props();

	let isVisible = $state(false);

	onMount(() => {
		const timeout = window.setTimeout(() => {
			isVisible = true;
		}, delayMs);

		return () => window.clearTimeout(timeout);
	});
</script>

{#if isVisible}
	<div
		class="pointer-events-none absolute inset-0 flex items-center justify-center"
		aria-hidden="true"
	>
		<span class="h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
		></span>
	</div>
{/if}
