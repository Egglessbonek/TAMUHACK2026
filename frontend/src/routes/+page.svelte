<script>
	import { onMount } from 'svelte';

	let count = $state(0);
	let connected = $state(false);
	let error = $state('');
    let ws = null;

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
        if (!connected) {
            error = 'Not connected to WebSocket';
            return;
        }
        try {
            ws.send("count_moo");
        } catch (e) {
            error = String(e);
        }
    }

	onMount(() => {
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
				const message = event.data;
                if (message.startsWith('mc|')) {
                    const parts = message.split('|');
                    if (parts.length === 2) {
                        const newCount = parseInt(parts[1], 10);
                        if (!isNaN(newCount)) {
                            count = newCount;
                        }
                    }
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
	<button type="button" onclick={increment}>Increment</button>
	{#if error}
		<p style="color: #b91c1c;">{error}</p>
	{/if}
</main>
