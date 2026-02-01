export interface Env {
	TOTAL_MOO_COUNT: DurableObjectNamespace;
	TURNSTILE_SECRET_KEY: string;
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
	private count: number | null = null;
	private readonly lastBatchBySocket = new Map<WebSocket, number>();
	private readonly batchIntervalMs = 500;
	private readonly persistIntervalMs = 30000;
	private readonly broadcastIntervalMs = 500;
	private persistTimer: ReturnType<typeof setTimeout> | null = null;
	private broadcastTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(state: DurableObjectState) {
		this.state = state;
	}

	private async ensureCountLoaded(): Promise<number> {
		if (this.count === null) {
			this.count = (await this.state.storage.get<number>("count")) ?? 0;
		}
		return this.count;
	}

	private schedulePersist(): void {
		if (this.persistTimer !== null) return;
		this.persistTimer = setTimeout(() => {
			this.persistTimer = null;
			void this.flushCountToStorage();
		}, this.persistIntervalMs);
	}

	private async flushCountToStorage(): Promise<void> {
		if (this.count === null) return;
		await this.state.storage.put("count", this.count);
	}

	private scheduleBroadcast(): void {
		if (this.broadcastTimer !== null) return;
		this.broadcastTimer = setTimeout(() => {
			this.broadcastTimer = null;
			if (this.count !== null) this.broadcastCount(this.count);
		}, this.broadcastIntervalMs);
	}

	private async add(delta: number): Promise<number> {
		const current = await this.ensureCountLoaded();
		const next = current + delta;
		this.count = next;
		this.schedulePersist();
		this.scheduleBroadcast();
		return next;
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

	private allowIncrement(ws: WebSocket, amount: number): boolean {
		if (amount <= 0) return false;

		const now = Date.now();
		const lastAt = this.lastBatchBySocket.get(ws);
		if (lastAt !== undefined && now - lastAt < this.batchIntervalMs) {
			return false;
		}

		this.lastBatchBySocket.set(ws, now);
		return true;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/ws") {
			if (request.headers.get("Upgrade") !== "websocket") {
				return new Response("Expected WebSocket upgrade", { status: 426 });
			} 

			if (request.headers.get("Origin") !== "https://moofor.me") {
				return new Response("Invalid origin", { status: 403 });
			}

			const pair = new WebSocketPair();
			const client = pair[0];
			const server = pair[1];

			this.state.acceptWebSocket(server);
			// Send the current count immediately on connect.
			const current = await this.ensureCountLoaded();
			server.send(String(current));

			return new Response(null, { status: 101, webSocket: client });
		}

		if (url.pathname === "/count") {
			const current = await this.ensureCountLoaded();
			return new Response(String(current), {
				headers: { "content-type": "text/plain; charset=utf-8" },
			});
		}

		return new Response("Not found", { status: 404 });
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		const text = parseWebSocketMessage(message).trim();
		let amount = 0;
		if (text.startsWith("inc:")) {
			const parsed = Number(text.slice(4));
			if (Number.isFinite(parsed) && parsed > 0) {
				amount = Math.floor(parsed);
			}
			// max frontend batch 
			const MAX_BATCH = 40;
			amount = MAX_BATCH < amount ? MAX_BATCH : amount;
		} else {
			// invalid message
			return;
		}

		if (amount > 0) {
			if (!this.allowIncrement(ws, amount)) {
				return;
			}
			await this.add(amount);
			return;
		}
	}

	async webSocketClose(ws: WebSocket): Promise<void> {
		this.lastBatchBySocket.delete(ws);
	}
}

async function validateTurnstile(token: string, remoteip: string, secretKey: string): Promise<any> {
	const formData = new FormData();
	formData.append('secret', secretKey);
	formData.append('response', token);
	formData.append('remoteip', remoteip);

	try {
		const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body: formData
		});

		const result: any = await response.json();
		return result;
	} catch (error) {
		console.error('Turnstile validation error:', error);
		return { success: false, 'error-codes': ['internal-error'] };
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/api/")) {
			url.pathname = url.pathname.replace(/^\/api/, "");
		}

		if (url.pathname === "/submit" && request.method === "POST") {
			const body = await request.formData();
			const token = body.get('cf-turnstile-response') as string;
			const ip = request.headers.get('CF-Connecting-IP') ||
				request.headers.get('X-Forwarded-For') ||
				'unknown';

			const validation = await validateTurnstile(token, ip, env.TURNSTILE_SECRET_KEY);

			if (validation.success) {
				return new Response(JSON.stringify({ success: true, message: "Valid submission" }), {
					status: 200,
					headers: { "Content-Type": "application/json" }
				});
			} else {
				return new Response(JSON.stringify({ success: false, error: "Invalid verification", details: validation['error-codes'] }), {
					status: 400,
					headers: { "Content-Type": "application/json" }
				});
			}
		}

		const stub = getTotalMooCountStub(env);
		const doUrl = new URL(url);
		doUrl.pathname = url.pathname;

		if (doUrl.pathname === "/ws") {
			return stub.fetch(new Request(doUrl.toString(), request));
		}

		if (doUrl.pathname === "/count") {
			return stub.fetch(new Request(doUrl.toString(), { method: "GET" }));
		}

		return new Response(
			"OK. Use /ws (WebSocket) and send 'increment' to bump the count. Optional: /count (HTTP).\n",
			{ headers: { "content-type": "text/plain; charset=utf-8" } },
		);
	},
} satisfies ExportedHandler<Env>;
