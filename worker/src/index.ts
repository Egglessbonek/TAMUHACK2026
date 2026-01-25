export interface Env {
	TOTAL_MOO_COUNT: DurableObjectNamespace;
}

function getTotalMooCountStub(env: Env): DurableObjectStub {
	const id = env.TOTAL_MOO_COUNT.idFromName("TOTAL_MOO_COUNT");
	return env.TOTAL_MOO_COUNT.get(id);
}

function parseWebSocketMessage(message: string | ArrayBuffer): string {
	if (typeof message === "string") return message;
	return new TextDecoder().decode(message);
}

export class TotalMooCount implements DurableObject {
	private readonly state: DurableObjectState;
	private readonly rateLimit = new Map<WebSocket, { tokens: number; lastRefill: number }>();
	private readonly refillPerSecond = 25;
	private readonly maxBurst = 25;

	constructor(state: DurableObjectState) {
		this.state = state;
	}

	private async getCount(): Promise<number> {
		return (await this.state.storage.get<number>("count")) ?? 0;
	}

	private async increment(): Promise<number> {
		return this.state.storage.transaction(async (txn) => {
			const current = (await txn.get<number>("count")) ?? 0;
			const next = current + 1;
			await txn.put("count", next);
			return next;
		});
	}

	private broadcastCount(value: number): void {
		const message = String(value);

		for (const ws of this.state.getWebSockets()) {
			try {
				ws.send(message);
			} catch {
				// Ignore send failures; Cloudflare will clean up broken sockets.
			}
		}
	}

	private allowIncrement(ws: WebSocket): boolean {
		const now = Date.now();
		const existing = this.rateLimit.get(ws);
		if (!existing) {
			this.rateLimit.set(ws, { tokens: this.maxBurst - 1, lastRefill: now });
			return true;
		}

		const elapsedMs = now - existing.lastRefill;
		if (elapsedMs > 0) {
			const refill = (elapsedMs / 1000) * this.refillPerSecond;
			existing.tokens = Math.min(this.maxBurst, existing.tokens + refill);
			existing.lastRefill = now;
		}

		if (existing.tokens < 1) {
			return false;
		}

		existing.tokens -= 1;
		return true;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/ws") {
			if (request.headers.get("Upgrade") !== "websocket") {
				return new Response("Expected WebSocket upgrade", { status: 426 });
			}

			const pair = new WebSocketPair();
			const client = pair[0];
			const server = pair[1];

			this.state.acceptWebSocket(server);

			// Send the current count immediately on connect.
			const current = await this.getCount();
			server.send(String(current));

			return new Response(null, { status: 101, webSocket: client });
		}

		if (url.pathname === "/count") {
			const current = await this.getCount();
			return new Response(String(current), {
				headers: { "content-type": "text/plain; charset=utf-8" },
			});
		}

		return new Response("Not found", { status: 404 });
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		const text = parseWebSocketMessage(message).trim();
		if (!text || text === "increment") {
			if (!this.allowIncrement(ws)) {
				return;
			}
			const next = await this.increment();
			this.broadcastCount(next);
			return;
		}
	}

	async webSocketClose(ws: WebSocket): Promise<void> {
		this.rateLimit.delete(ws);
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/api/")) {
			url.pathname = url.pathname.replace(/^\/api/, "");
		}

		const stub = getTotalMooCountStub(env);

		if (url.pathname === "/ws") {
			// Route the WebSocket upgrade to the single Durable Object instance.
			return stub.fetch(new Request(url.toString(), request));
		}

		if (url.pathname === "/count") {
			const doUrl = new URL(url);
			doUrl.pathname = "/count";
			return stub.fetch(new Request(doUrl.toString(), { method: "GET" }));
		}

		return new Response(
			"OK. Use /ws (WebSocket) and send 'increment' to bump the count. Optional: /count (HTTP).\n",
			{ headers: { "content-type": "text/plain; charset=utf-8" } },
		);
	},
} satisfies ExportedHandler<Env>;
