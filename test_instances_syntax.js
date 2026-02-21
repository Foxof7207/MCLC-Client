const path = require('path');
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
console.log('Test script: verifying syntax and basic loading...');

try {

    const fs = require('fs');
    const code = fs.readFileSync('./backend/handlers/instances.js', 'utf8');
    new Function(code);
    console.log('Syntax check passed.');
} catch (e) {
    console.error('Syntax error:', e.message);
    process.exit(1);
}

console.log('Note: Full runtime loading verification requires running in Electron environment.');
console.log('Refactor seems syntactically correct.');