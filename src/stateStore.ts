import { KVNamespace } from "@cloudflare/workers-types";

const DEFAULT_EXPIRATION_TTL = 60 * 15;  // 15 minutes;

interface Data {
    discordID: string,
}

function generateState(): string {
    const seed = new Uint8Array(16);
    crypto.getRandomValues(seed);

    // This needs to be cast to a normal Array, even though the specific typed
    // arrays have .map() methods, the chars are just all '0'
    const vals = Array.from(seed);
    return btoa(vals.map(c => String.fromCharCode(c)).join(""));
}

export interface StateData {
    state: string,
    expiration: number,
}

export class StateStore {
    kv: KVNamespace;
    ttlSec: number;

    constructor(kv: KVNamespace, ttlSec: number = DEFAULT_EXPIRATION_TTL) {
        this.kv = kv;
        this.ttlSec = ttlSec;
    }

    async put(discordID: string): Promise<StateData> {
        const state = generateState();

        const nowTs = (new Date()).getTime()
        const now = Math.floor(nowTs / 1000);
        const expiration = now + this.ttlSec;

        await this.kv.put(state, JSON.stringify({ discordID }), { expiration });
        return { state, expiration };
    }

    async get(state: string): Promise<string | null> {
        const result = await this.kv.get<Data>(state, { type: "json" });
        if (!result)
            return null;

        await this.kv.delete(state);

        return result.discordID;
    }
}
