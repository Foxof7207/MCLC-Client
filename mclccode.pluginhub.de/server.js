const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;
const CODES_DIR = path.join(__dirname, 'codes');

// Ensure codes directory exists
fs.ensureDirSync(CODES_DIR);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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

// Save modpack data
app.post('/api/modpack/save', async (req, res) => {
    try {
        const { name, mods, resourcePacks, shaders, instanceVersion, instanceLoader } = req.body;
        
        console.log('[Server] Received save request:', { name, modsCount: mods?.length, resourcePacksCount: resourcePacks?.length, shadersCount: shaders?.length });

        if (!mods && !resourcePacks && !shaders) {
            return res.status(400).json({ error: 'No content to export' });
        }

        const code = generateCode();
        const modpackData = {
            code,
            name: name || 'Exported Modpack',
            createdAt: Date.now(),
            instanceVersion,
            instanceLoader,
            mods: mods || [],
            resourcePacks: resourcePacks || [],
            shaders: shaders || []
        };

        await fs.writeJson(path.join(CODES_DIR, `${code}.json`), modpackData, { spaces: 2 });
        
        console.log('[Server] Saved modpack with code:', code);
        res.json({ success: true, code });
    } catch (error) {
        console.error('[Server] Save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Load modpack data by code
app.get('/api/modpack/:code', async (req, res) => {
    try {
        const { code } = req.params;
        console.log('[Server] Loading code:', code);
        
        const filePath = path.join(CODES_DIR, `${code}.json`);
        
        if (!await fs.pathExists(filePath)) {
            console.log('[Server] Code not found:', code);
            return res.status(404).json({ error: 'Code not found' });
        }

        const modpackData = await fs.readJson(filePath);
        console.log('[Server] Found modpack:', modpackData.name);
        res.json({ success: true, data: modpackData });
    } catch (error) {
        console.error('[Server] Load error:', error);
        res.status(500).json({ error: error.message });
    }
});

// List all codes (optional, for debugging)
app.get('/api/modpack/list', async (req, res) => {
    try {
        const files = await fs.readdir(CODES_DIR);
        const codes = files
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''));
        res.json({ success: true, codes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Modpack code server running on http://localhost:${PORT}`);
    console.log(`📁 Codes directory: ${CODES_DIR}`);
});