const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Ensure codes directory exists
// Use absolute path relative to script location to avoid issues with CWD
const CODES_DIR = path.resolve(__dirname, 'codes');
console.log(`[Server] Codes directory set to: ${CODES_DIR}`);
fs.ensureDirSync(CODES_DIR);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Cleanup old codes (older than 7 days)
function cleanupOldCodes() {
    console.log('[Server] Running cleanup for old codes...');
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    fs.readdir(CODES_DIR, (err, files) => {
        if (err) {
            console.error('[Server] Failed to read codes directory for cleanup:', err);
            return;
        }

        files.forEach(file => {
            if (!file.endsWith('.json')) return;

            const filePath = path.join(CODES_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;

                if (now - stats.mtimeMs > SEVEN_DAYS_MS) {
                    fs.unlink(filePath, err => {
                        if (err) console.error(`[Server] Failed to delete expired code: ${file}`, err);
                        else console.log(`[Server] Deleted expired code: ${file}`);
                    });
                }
            });
        });
    });
}

// Run cleanup every hour
setInterval(cleanupOldCodes, 60 * 60 * 1000);
// Run on startup
cleanupOldCodes();

// Generate a random 8-character code
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (fs.pathExistsSync(path.join(CODES_DIR, `${code}.json`)));
    return code;
}

// Routes
app.post('/api/modpack/save', (req, res) => {
    try {
        const { name, mods, resourcePacks, shaders, instanceVersion, instanceLoader, keybinds } = req.body;
        const code = generateCode();

        const data = {
            code,
            name: name || 'Exported Modpack',
            version: instanceVersion,
            loader: instanceLoader,
            mods: mods || [],
            resourcePacks: resourcePacks || [],
            shaders: shaders || [],
            keybinds: keybinds || null,
            created: Date.now(),
            expires: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
            uses: 0
        };

        const filePath = path.join(CODES_DIR, `${code}.json`);
        fs.writeJsonSync(filePath, data, { spaces: 2 });

        console.log(`[Server] Saved modpack ${code} (${name})`);
        res.json({ success: true, code });
    } catch (error) {
        console.error('[Server] Save error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/modpack/:code', (req, res) => {
    try {
        const { code } = req.params;
        const filePath = path.join(CODES_DIR, `${code}.json`);

        if (fs.existsSync(filePath)) {
            const data = fs.readJsonSync(filePath);

            // Increment uses
            data.uses = (data.uses || 0) + 1;
            fs.writeJsonSync(filePath, data);

            console.log(`[Server] Served modpack ${code} (${data.name}) - Uses: ${data.uses}`);
            res.json({ success: true, data });
        } else {
            console.warn(`[Server] Code not found: ${code}`);
            res.status(404).json({ success: false, error: 'Code not found' });
        }
    } catch (error) {
        console.error('[Server] Get error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// List all codes
app.get('/api/modpack/list', (req, res) => {
    try {
        const files = fs.readdirSync(CODES_DIR).filter(f => f.endsWith('.json'));
        const codes = files.map(file => {
            try {
                const content = fs.readJsonSync(path.join(CODES_DIR, file));
                return {
                    code: content.code,
                    name: content.name,
                    version: content.version,
                    loader: content.loader,
                    uses: content.uses || 0,
                    created: content.created,
                    expires: content.expires
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        res.json({ success: true, codes });
    } catch (error) {
        console.error('[Server] List error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a code
app.delete('/api/modpack/:code', (req, res) => {
    try {
        const { code } = req.params;
        const filePath = path.join(CODES_DIR, `${code}.json`);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[Server] Deleted code: ${code}`);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Code not found' });
        }
    } catch (error) {
        console.error('[Server] Delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Modpack Code Server running on port ${PORT}`);
    console.log(`Storage directory: ${CODES_DIR}`);
});