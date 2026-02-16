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

    ipcMain.handle('java:list', async () => {
        try {
            await fs.ensureDir(runtimesDir);
            const dirs = await fs.readdir(runtimesDir);
            const runtimes = [];

            for (const dir of dirs) {
                const fullPath = path.join(runtimesDir, dir);
                const stats = await fs.stat(fullPath);
                if (stats.isDirectory()) {
                    let javaBin = process.platform === 'win32'
                        ? path.join(fullPath, 'bin', 'java.exe')
                        : path.join(fullPath, 'bin', 'java');

                    // Allow for some folder variation (e.g. jdk-17/bin/java vs jdk-17/Contents/Home/bin/java on Mac)
                    // But for now, java-utils installs in a standard way.
                    // We can check if the bin exists.
                    if (await fs.pathExists(javaBin)) {
                        runtimes.push({
                            name: dir,
                            path: javaBin,
                            dirPath: fullPath
                        });
                    }
                }
            }
            return { success: true, runtimes };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('java:delete', async (event, dirPath) => {
        try {
            // Security check: ensure dirPath is within runtimesDir
            if (!dirPath.startsWith(runtimesDir)) {
                throw new Error("Invalid path");
            }
            await fs.remove(dirPath);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('java:open-folder', async () => {
        try {
            await fs.ensureDir(runtimesDir);
            const { shell } = require('electron');
            await shell.openPath(runtimesDir);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });
};