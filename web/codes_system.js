const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CODES_DIR = path.join(__dirname, 'codes');
if (!fs.existsSync(CODES_DIR)) {
    console.log(`[CodesSystem] Creating codes directory: ${CODES_DIR}`);
    fs.mkdirSync(CODES_DIR, { recursive: true });
}
function cleanupOldCodes() {
    console.log('[CodesSystem] Running cleanup for old codes...');
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    fs.readdir(CODES_DIR, (err, files) => {
        if (err) {
            console.error('[CodesSystem] Failed to read codes directory for cleanup:', err);
            return;
        }

        files.forEach(file => {
            if (!file.endsWith('.json')) return;

            const filePath = path.join(CODES_DIR, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (data.expires && now > data.expires) {
                    fs.unlink(filePath, err => {
                        if (err) console.error(`[CodesSystem] Failed to delete expired code: ${file}`, err);
                        else console.log(`[CodesSystem] Deleted expired code: ${file}`);
                    });
                }
            } catch (e) {
                // If corrupted, maybe delete based on mtime as fallback
                fs.stat(filePath, (err, stats) => {
                    if (!err && now - stats.mtimeMs > SEVEN_DAYS_MS) {
                        fs.unlink(filePath, () => { });
                    }
                });
            }
        });
    });
}
setInterval(cleanupOldCodes, 60 * 60 * 1000);

cleanupOldCodes();
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code;
    do {
        code = '';
        const bytes = crypto.randomBytes(8);
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(bytes[i] % chars.length);
        }
    } while (fs.existsSync(path.join(CODES_DIR, `${code}.json`)));
    return code;
}
module.exports = function (app, ADMIN_PASSWORD) {
    console.log('[CodesSystem] Initializing routes...');
    function handleSave(req, res) {
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
                expires: Date.now() + (7 * 24 * 60 * 60 * 1000),
                uses: 0
            };

            const filePath = path.join(CODES_DIR, `${code}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

            console.log(`[CodesSystem] Saved modpack ${code} (${name})`);
            res.json({ success: true, code });
        } catch (error) {
            console.error('[CodesSystem] Save error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    app.post('/api/codes/save', handleSave);
    app.post('/api/modpack/save', handleSave);
    function handleList(req, res) {
        try {
            const clientPass = req.body.password || req.query.password || req.headers['x-admin-password'];
            if (clientPass !== ADMIN_PASSWORD) {
                console.warn(`[CodesSystem] Unauthorized list attempt.`);
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            if (!fs.existsSync(CODES_DIR)) {
                return res.json({ success: true, codes: [] });
            }
            const files = fs.readdirSync(CODES_DIR).filter(f => f.endsWith('.json'));
            const codes = files.map(file => {
                try {
                    const content = JSON.parse(fs.readFileSync(path.join(CODES_DIR, file), 'utf8'));
                    if (content.expires && Date.now() > content.expires) return null;
                    return {
                        code: content.code || file.replace('.json', ''),
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

            console.log(`[CodesSystem] Listed ${codes.length} codes`);
            res.json({ success: true, codes });
        } catch (error) {
            console.error('[CodesSystem] List error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    app.get('/api/codes/list', handleList);
    app.post('/api/codes/list', handleList);
    function handleGetCode(req, res) {
        try {
            const { code } = req.params;

            // Path injection protection
            if (!code || !/^[a-zA-Z0-9]+$/.test(code)) {
                return res.status(400).json({ success: false, error: 'Invalid code format' });
            }

            const filePath = path.join(CODES_DIR, `${code}.json`);

            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                data.uses = (data.uses || 0) + 1;
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

                console.log(`[CodesSystem] Served code ${code} (${data.name}) - Uses: ${data.uses}`);
                res.json({ success: true, data });
            } else {
                console.warn(`[CodesSystem] Code not found: ${code}`);
                res.status(404).json({ success: false, error: 'Code not found' });
            }
        } catch (error) {
            console.error('[CodesSystem] Get error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    app.get('/api/codes/:code', handleGetCode);
    app.get('/api/modpack/:code', handleGetCode);
    function handleDelete(req, res) {
        try {
            const clientPass = req.body.password || req.query.password || req.headers['x-admin-password'];
            if (clientPass !== ADMIN_PASSWORD) {
                console.warn(`[CodesSystem] Unauthorized delete attempt for ${req.params.code}.`);
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            const { code } = req.params;

            // Path injection protection
            if (!code || !/^[a-zA-Z0-9]+$/.test(code)) {
                return res.status(400).json({ success: false, error: 'Invalid code format' });
            }

            const filePath = path.join(CODES_DIR, `${code}.json`);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[CodesSystem] Deleted code: ${code}`);
                res.json({ success: true });
            } else {
                res.status(404).json({ success: false, error: 'Code not found' });
            }
        } catch (error) {
            console.error('[CodesSystem] Delete error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    app.delete('/api/codes/:code', handleDelete);
    app.post('/api/codes/delete/:code', handleDelete);
};