/**
 * Compares two version strings.
 * @param {string} v1 Current version (e.g., "1.6.5")
 * @param {string} v2 Target version (e.g., "1.6.6")
 * @returns {number} 1 if v2 > v1, -1 if v1 > v2, 0 if v1 === v2
 */
function compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;

    // Remove leading 'v' if present
    const cleanV1 = v1.startsWith('v') ? v1.substring(1) : v1;
    const cleanV2 = v2.startsWith('v') ? v2.substring(1) : v2;

    const parts1 = cleanV1.split('.').map(Number);
    const parts2 = cleanV2.split('.').map(Number);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;

        if (p2 > p1) return 1;
        if (p1 > p2) return -1;
    }

    return 0;
}

module.exports = { compareVersions };
