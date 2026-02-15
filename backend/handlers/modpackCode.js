const axios = require('axios');

// WICHTIG: http:// hinzufügen!
const SERVER_URL = 'http://localhost:4000';

console.log('[ModpackCode-Handler] 🔧 Modul wird geladen...');

module.exports = (ipcMain, win) => {
    console.log('[ModpackCode-Handler] 🔌 Registriere Handler...');

    // Export modpack as code
    ipcMain.handle('modpack:export-code', async (event, data) => {
        console.log('[ModpackCode-Handler] 📤 Export handler WURDE AUFGERUFEN!', data);
        try {
            const { name, mods, resourcePacks, shaders, instanceVersion, instanceLoader } = data;

            console.log('[ModpackCode-Handler] Exporting modpack:', {
                name,
                modsCount: mods?.length,
                resourcePacksCount: resourcePacks?.length,
                shadersCount: shaders?.length
            });

            // Validate that we have at least one type selected
            if ((!mods || mods.length === 0) &&
                (!resourcePacks || resourcePacks.length === 0) &&
                (!shaders || shaders.length === 0)) {
                return {
                    success: false,
                    error: 'No content selected for export. Please select at least one mod, resource pack, or shader.'
                };
            }

            // Prepare data for server
            const exportData = {
                name: name || 'My Modpack',
                mods: mods?.map(m => ({
                    projectId: m.projectId,
                    versionId: m.versionId,
                    fileName: m.name,
                    title: m.title || m.name,
                    icon: m.icon
                })) || [],
                resourcePacks: resourcePacks?.map(p => ({
                    projectId: p.projectId,
                    versionId: p.versionId,
                    fileName: p.name,
                    title: p.title || p.name,
                    icon: p.icon
                })) || [],
                shaders: shaders?.map(s => ({
                    projectId: s.projectId,
                    versionId: s.versionId,
                    fileName: s.name,
                    title: s.title || s.name,
                    icon: s.icon
                })) || [],
                instanceVersion,
                instanceLoader
            };

            console.log('[ModpackCode-Handler] 📡 Sending to server:', exportData);

            // Send to server
            const response = await axios.post(`${SERVER_URL}/api/modpack/save`, exportData, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('[ModpackCode-Handler] ✅ Server response:', response.data);

            if (response.data.success) {
                return {
                    success: true,
                    code: response.data.code
                };
            } else {
                return {
                    success: false,
                    error: 'Server returned an error'
                };
            }
        } catch (error) {
            console.error('[ModpackCode-Handler] ❌ Export error:', error);
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    error: 'Cannot connect to code server. Make sure server.js is running on port 4000.'
                };
            }
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Failed to connect to server'
            };
        }
    });

    // Import modpack from code
    ipcMain.handle('modpack:import-code', async (event, code) => {
        console.log('[ModpackCode-Handler] 📥 Import handler WURDE AUFGERUFEN!', code);
        try {
            console.log('[ModpackCode-Handler] Importing code:', code);

            if (!code || code.length !== 8) {
                return { success: false, error: 'Invalid code format. Code must be 8 characters.' };
            }

            // Fetch from server
            const response = await axios.get(`${SERVER_URL}/api/modpack/${code}`, {
                timeout: 10000
            });

            console.log('[ModpackCode-Handler] ✅ Server response:', response.data);

            if (!response.data.success) {
                return { success: false, error: 'Code not found' };
            }

            const modpackData = response.data.data;

            // Validate data structure
            if (!modpackData.mods && !modpackData.resourcePacks && !modpackData.shaders) {
                return { success: false, error: 'Invalid modpack data format' };
            }

            return {
                success: true,
                data: modpackData
            };
        } catch (error) {
            console.error('[ModpackCode-Handler] ❌ Import error:', error);
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    error: 'Cannot connect to code server. Make sure server.js is running on port 4000.'
                };
            }
            if (error.response?.status === 404) {
                return { success: false, error: 'Code not found' };
            }
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Failed to connect to server'
            };
        }
    });

    // List all available codes (optional, for debugging)
    ipcMain.handle('modpack:list-codes', async () => {
        try {
            console.log('[ModpackCode-Handler] 📋 Listing codes');
            const response = await axios.get(`${SERVER_URL}/api/modpack/list`);
            return response.data;
        } catch (error) {
            console.error('[ModpackCode-Handler] ❌ List error:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('[ModpackCode-Handler] ✅ ALLE Handler registriert!');
    console.log('[ModpackCode-Handler] Verfügbare Commands:',
        ['modpack:export-code', 'modpack:import-code', 'modpack:list-codes']);
};