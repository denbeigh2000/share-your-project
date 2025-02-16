export function iv(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(12));
}


export async function importOauthKey(b64key: string): Promise<CryptoKey> {
    return await importKey(
        b64key,
        { name: "AES-GCM", length: 256 },
        ["encrypt", "decrypt"],
    );
}

type Feature = "sign" | "verify" | "encrypt" | "decrypt";

async function importKey(key: string, algorithm: CryptoKey["algorithm"], features: Feature[]) {
    const decodedKey = JSON.parse(key);
    return await crypto.subtle.importKey("jwk", decodedKey, algorithm, false, features);
}

export class Encrypter {
    key: CryptoKey;
    decoder: TextDecoder = new TextDecoder();
    encoder: TextEncoder = new TextEncoder();

    constructor(key: CryptoKey) {
        this.key = key;
    }

    public async decrypt(data: Uint8Array, iv: Uint8Array): Promise<string> {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv) },
            this.key,
            data
        );
        return this.decoder.decode(decrypted);
    }

    public async encrypt(iv: Uint8Array, secret: string): Promise<ArrayBuffer> {
        const encoded = this.encoder.encode(secret);
        return await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            this.key,
            encoded,
        );
    }
}
