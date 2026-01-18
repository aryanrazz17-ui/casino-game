export const FairnessUtils = {
    /**
     * Verify a specific result float
     */
    verifyFloat: async (serverSeed: string, clientSeed: string, nonce: number): Promise<number> => {
        const msg = new TextEncoder().encode(`${clientSeed}:${nonce}`);
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(serverSeed),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, msg);
        const hashArray = Array.from(new Uint8Array(signature));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Take first 8 chars (4 bytes)
        const sub = hashHex.substring(0, 8);
        const intVal = parseInt(sub, 16);
        return intVal / 0xffffffff;
    },

    /**
     * Verify Mines grid
     */
    verifyShuffle: async (serverSeed: string, clientSeed: string, nonce: number, length: number): Promise<number[]> => {
        const array = Array.from({ length }, (_, i) => i);

        for (let i = length - 1; i > 0; i--) {
            const msg = new TextEncoder().encode(`${clientSeed}:${nonce}:${i}`);
            const key = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(serverSeed),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );
            const signature = await crypto.subtle.sign('HMAC', key, msg);
            const hashArray = Array.from(new Uint8Array(signature));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const randomInt = parseInt(hashHex.substring(0, 8), 16);
            const j = randomInt % (i + 1);

            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    /**
     * Standard Server Seed Hashing
     */
    hashServerSeed: async (serverSeed: string): Promise<string> => {
        const msg = new TextEncoder().encode(serverSeed);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msg);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};
