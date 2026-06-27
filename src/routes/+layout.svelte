<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		const root = document.documentElement;
		const viewport = window.visualViewport;
		let animationFrame: number | undefined;

		function updateViewportHeight(): void {
			animationFrame = undefined;
			root.style.setProperty(
				'--drawthis-viewport-height',
				`${viewport?.height ?? window.innerHeight}px`
			);
		}

		function scheduleViewportHeightUpdate(): void {
			if (animationFrame !== undefined) {
				return;
			}

			animationFrame = window.requestAnimationFrame(updateViewportHeight);
		}

		scheduleViewportHeightUpdate();
		window.addEventListener('resize', scheduleViewportHeightUpdate);
		viewport?.addEventListener('resize', scheduleViewportHeightUpdate);
		viewport?.addEventListener('scroll', scheduleViewportHeightUpdate);

		return () => {
			if (animationFrame !== undefined) {
				window.cancelAnimationFrame(animationFrame);
			}

			window.removeEventListener('resize', scheduleViewportHeightUpdate);
			viewport?.removeEventListener('resize', scheduleViewportHeightUpdate);
			viewport?.removeEventListener('scroll', scheduleViewportHeightUpdate);
			root.style.removeProperty('--drawthis-viewport-height');
		};
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
