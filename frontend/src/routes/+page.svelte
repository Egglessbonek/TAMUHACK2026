<script>
	import { onMount } from 'svelte';

	let count = $state(0);
	let connected = $state(false);
	let error = $state('');

	function getWsUrl() {
		const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
		return `${wsProtocol}://${location.host}/api/ws`;
	}

	async function refresh() {
		try {
			const res = await fetch('/api/counter');
			const data = await res.json();
			count = data.count;
		} catch (e) {
			error = String(e);
		}
	}

	async function increment() {
		error = '';
		try {
			const res = await fetch('/api/increment', { method: 'POST' });
			const data = await res.json();
			count = data.count;
		} catch (e) {
			error = String(e);
		}
	}

	onMount(() => {
		let ws;

		refresh();

		try {
			ws = new WebSocket(getWsUrl());
			ws.onopen = () => (connected = true);
			ws.onclose = () => (connected = false);
			ws.onerror = () => {
				connected = false;
				error = 'WebSocket error';
			};
			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (typeof data.count === 'number') count = data.count;
				} catch {
					// ignore
				}
			};
		} catch (e) {
			error = String(e);
		}

		return () => {
			try {
				ws?.close();
			} catch {
				// ignore
			}
		};
	});
</script>

<main>
	<h1>Global Counter</h1>
	<p>Count: <strong>{count}</strong></p>
	<p>Status: {connected ? 'connected' : 'disconnected'}</p>
	<button type="button" on:click={increment}>Increment</button>
	{#if error}
		<p style="color: #b91c1c;">{error}</p>
	{/if}
</main>
