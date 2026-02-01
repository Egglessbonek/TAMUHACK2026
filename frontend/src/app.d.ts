declare global {
    interface Window {
        onTurnstileSuccess: (token: string) => void;
    }
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        interface Platform {
            env: {
                COUNTER: DurableObjectNamespace;
            };
            context: {
                waitUntil(promise: Promise<any>): void;
            };
            caches: CacheStorage & { default: Cache };
        }
    }
}

export {};
