const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const { installJava } = require('../utils/java-utils');

module.exports = (ipcMain) => {
    const appData = app.getPath('userData');
    const runtimesDir = path.join(appData, 'runtimes');

    ipcMain.handle('java:install', async (event, version) => {
        try {
            console.log(`[JavaHandler] Request to install Java ${version}`);
            const sender = event.sender;

            const result = await installJava(version, runtimesDir, (step, progress) => {
                sender.send('java:progress', { step, progress });
            });

            return result;
        } catch (e) {
            console.error('[JavaHandler] Error:', e);
            return { success: false, error: e.message };
        }
    });
};
