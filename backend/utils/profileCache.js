const axios = require('axios');

const cache = new Map(); // token -> { data, timestamp }
const CACHE_TTL = 60 * 1000; // 60 seconds

async function getCachedProfile(token) {
    if (!token) return null;

    const now = Date.now();
    const cached = cache.get(token);

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
        console.log('[ProfileCache] Returning cached profile');
        return cached.data;
    }

    try {
        console.log('[ProfileCache] Fetching fresh profile from Mojang');
        const res = await axios.get('https://api.minecraftservices.com/minecraft/profile', {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000
        });

        cache.set(token, {
            data: res.data,
            timestamp: now
        });

        return res.data;
    } catch (e) {
        // If it's a 429, and we have a stale cache, maybe return it?
        // But for now, just let it throw or handle it
        if (e.response?.status === 429 && cached) {
            console.warn('[ProfileCache] 429 hit, returning stale cache');
            return cached.data;
        }
        throw e;
    }
}

// Clear cache on logout if needed (optional)
function clearCache(token) {
    if (token) cache.delete(token);
    else cache.clear();
}

module.exports = {
    getCachedProfile,
    clearCache
};
