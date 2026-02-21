const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const win = { webContents: { send: () => { } } };

try {
    console.log('Testing instances.js load...');
    const instances = require('./backend/handlers/instances');
    instances(ipcMain, win);
    console.log('Success! Handlers should be registered.');
} catch (e) {
    console.error('FAILED TO LOAD INSTANCES.JS:', e);
}