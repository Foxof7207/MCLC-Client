
const path = require('path');

// Mock dependencies
const ipcMainMock = {
    handle: (channel, callback) => {
        console.log(`[Mock] Registered handler: ${channel}`);
    }
};

const winMock = {
    webContents: {
        send: (channel, data) => {
            console.log(`[Mock] Sent IPC: ${channel}`, data);
        }
    }
};

// Mock electron app
const electronMock = {
    app: {
        getPath: (name) => {
            if (name === 'userData') return path.join(__dirname, 'mock_userdata');
            return '';
        }
    },
    ipcMain: ipcMainMock,
    dialog: {
        showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
        showSaveDialog: async () => ({ filePath: '' })
    },
    shell: {
        openPath: async () => { }
    }
};

// Mock other modules if needed, but requiring the file typically triggers the side effects (registration)
// We need to override require for 'electron' if possible, or just rely on the fact that instances.js takes ipcMain as arg.
// instances.js requires 'electron' for shell, dialog, app. We need to mock those.

// Since we can't easily mock require in this simple script without a loader like proxyquire,
// we will try to load it and see if it crashes on require. 
// However, instances.js does `const { ipcMain, app, shell, dialog } = require('electron');` at top level.
// This will fail in a node script if electron is not available or if we are not in electron.

console.log('Test script: verifying syntax and basic loading...');

try {
    // Check syntax only first
    const fs = require('fs');
    const code = fs.readFileSync('./backend/handlers/instances.js', 'utf8');
    new Function(code); // Syntax check triggers error if invalid
    console.log('Syntax check passed.');
} catch (e) {
    console.error('Syntax error:', e.message);
    process.exit(1);
}

console.log('Note: Full runtime loading verification requires running in Electron environment.');
console.log('Refactor seems syntactically correct.');
