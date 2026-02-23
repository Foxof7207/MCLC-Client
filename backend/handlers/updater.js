const { app, shell } = require('electron');
const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const { compareVersions } = require('../utils/version-utils');
const pkg = require('../../package.json');

const REPO = 'MCLC-Client/MCLC-Client';
const GITHUB_API = `https://api.github.com/repos/${REPO}/releases/latest`;

module.exports = (ipcMain, mainWindow) => {
    let testVersionOverride = null;

    ipcMain.handle('updater:check', async () => {
        try {
            console.log(`[Updater] Checking for updates... (Current: ${testVersionOverride || pkg.version})`);
            const response = await axios.get(GITHUB_API, {
                headers: { 'User-Agent': 'MCLC-AutoUpdater' }
            });

            const release = response.data;
            const latestVersion = release.tag_name; // e.g., "v1.6.5"
            const currentVersion = testVersionOverride || pkg.version;

            const comparison = compareVersions(currentVersion, latestVersion);
            const needsUpdate = comparison === 1;

            let asset = null;
            if (needsUpdate) {
                const platform = process.platform;
                const assets = release.assets;

                if (platform === 'win32') {
                    asset = assets.find(a => a.name.endsWith('.exe'));
                } else if (platform === 'linux') {
                    asset = assets.find(a => a.name.endsWith('.AppImage')) ||
                        assets.find(a => a.name.endsWith('.deb')) ||
                        assets.find(a => a.name.endsWith('.rpm'));
                } else if (platform === 'darwin') {
                    asset = assets.find(a => a.name.endsWith('.zip')) ||
                        assets.find(a => a.name.endsWith('.dmg'));
                }
            }

            return {
                currentVersion,
                latestVersion,
                needsUpdate,
                releaseNotes: release.body,
                asset: asset ? {
                    name: asset.name,
                    size: asset.size,
                    url: asset.browser_download_url
                } : null
            };
        } catch (error) {
            console.error('[Updater] Check failed:', error.message);
            return { error: error.message };
        }
    });

    ipcMain.handle('updater:download', async (_, assetUrl, assetName) => {
        try {
            const downloadDir = path.join(app.getPath('userData'), 'updates');
            await fs.ensureDir(downloadDir);
            const targetPath = path.join(downloadDir, assetName);

            console.log(`[Updater] Downloading update to ${targetPath}...`);

            const response = await axios({
                url: assetUrl,
                method: 'GET',
                responseType: 'stream'
            });

            const totalLength = response.headers['content-length'];
            let downloadedLength = 0;

            const writer = fs.createWriteStream(targetPath);
            response.data.pipe(writer);

            response.data.on('data', (chunk) => {
                downloadedLength += chunk.length;
                const progress = totalLength ? (downloadedLength / totalLength) * 100 : 0;
                mainWindow.webContents.send('updater:progress', progress);
            });

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            return { success: true, path: targetPath };
        } catch (error) {
            console.error('[Updater] Download failed:', error.message);
            return { error: error.message };
        }
    });

    ipcMain.handle('updater:install', async (_, filePath) => {
        try {
            console.log(`[Updater] Installing update from ${filePath}...`);

            if (process.platform === 'win32') {
                // Launch installer and quit
                spawn(filePath, ['/S'], { // /S for silent if supported, or just launch it
                    detached: true,
                    stdio: 'ignore'
                }).unref();
                app.quit();
            } else if (process.platform === 'linux') {
                if (filePath.endsWith('.AppImage')) {
                    fs.chmodSync(filePath, 0o755);
                    spawn(filePath, [], { detached: true, stdio: 'ignore' }).unref();
                    app.quit();
                } else {
                    shell.openPath(path.dirname(filePath)); // Open folder for deb/rpm
                }
            } else {
                shell.openPath(filePath);
            }

            return { success: true };
        } catch (error) {
            console.error('[Updater] Install failed:', error.message);
            return { error: error.message };
        }
    });

    ipcMain.handle('updater:set-test-version', (_, version) => {
        console.log(`[Updater] Setting test version override to: ${version}`);
        testVersionOverride = version;
        return { success: true, currentVersion: version };
    });

    // Helper for fully automatic update flow
    async function runAutoUpdate() {
        console.log('[Updater] Running automatic background update check...');
        try {
            const res = await ipcMain.emit('updater:check');
        } catch (e) { }
    }
};

/**
 * Perform background update check and auto-install if available
 */
async function performAutoUpdate(ipcMain, mainWindow) {
    if (!require('electron').app.isPackaged) {
        console.log('[Updater] Skipping auto-update in development mode.');
        return;
    }
    console.log('[Updater] Starting background auto-update process...');
    try {
        // We reuse the logic from the check handler
        const response = await axios.get(`https://api.github.com/repos/MCLC-Client/MCLC-Client/releases/latest`, {
            headers: { 'User-Agent': 'MCLC-AutoUpdater' }
        });

        const release = response.data;
        const latestVersion = release.tag_name;
        const currentVersion = require('../../package.json').version;

        if (require('../utils/version-utils').compareVersions(currentVersion, latestVersion) === 1) {
            console.log(`[Updater] Auto-Update available: ${latestVersion}. Starting silent download...`);

            const platform = process.platform;
            const asset = release.assets.find(a => {
                if (platform === 'win32') return a.name.endsWith('.exe');
                if (platform === 'linux') return a.name.endsWith('.AppImage') || a.name.endsWith('.deb');
                if (platform === 'darwin') return a.name.endsWith('.zip');
                return false;
            });

            if (!asset) {
                console.log('[Updater] No compatible asset found for auto-update.');
                return;
            }

            const downloadDir = path.join(require('electron').app.getPath('userData'), 'updates');
            await fs.ensureDir(downloadDir);
            const targetPath = path.join(downloadDir, asset.name);

            // Silent download
            const writer = fs.createWriteStream(targetPath);
            const downloadRes = await axios({ url: asset.browser_download_url, method: 'GET', responseType: 'stream' });
            downloadRes.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log('[Updater] Auto-Update downloaded. Restarting to install...');

            // Trigger install logic
            if (platform === 'win32') {
                spawn(targetPath, ['/S'], { detached: true, stdio: 'ignore' }).unref();
                require('electron').app.quit();
            } else if (platform === 'linux' && targetPath.endsWith('.AppImage')) {
                fs.chmodSync(targetPath, 0o755);
                spawn(targetPath, [], { detached: true, stdio: 'ignore' }).unref();
                require('electron').app.quit();
            }
        } else {
            console.log('[Updater] No auto-update needed.');
        }
    } catch (error) {
        console.error('[Updater] Auto-update failed:', error.message);
    }
}

module.exports.performAutoUpdate = performAutoUpdate;
