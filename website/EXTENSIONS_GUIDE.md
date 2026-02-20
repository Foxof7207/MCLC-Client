# MCLC Extension Development Guide

Welcome to the MCLC Extension System! This guide will help you create, package, and share extensions.

## 1. File Structure

An extension is a ZIP file (renamed to `.mclcextension` or kept as `.zip`) containing the following required structure at the root:

```yaml
my-extension/
├── manifest.json  (Required)
├── main.js        (Required - Entry Point for UI)
├── backend.js     (Optional - Entry Point for Backend/Main Process)
└── (other files)
```


### manifest.json

Defines metadata about your extension.

```json
{
  "id": "my-awesome-extension",
  "name": "My Awesome Extension",
  "version": "1.0.0",
  "description": "Adds a cool new feature.",
  "author": "YourName",
  "main": "main.js" 
}
```

## 2. main.js Format

The extension system runs your code in a sandboxed environment. You must expose specific hooks.

### Lifecycle Hooks

* `activate(api)`: Called when the extension is enabled or the app starts.
* `deactivate()`: Called when the extension is disabled or removed.

### Example `main.js`

```javascript
/* main.js */

// You can create a simple React component
const MyWidget = () => {
    return React.createElement('div', { style: { color: 'white' } }, "Hello from Extension!");
};

// Activate Hook
exports.activate = async (api) => {
    console.log("Extension activated!");

    // 1. Show a Toast Notification
    api.ui.toast("My Extension Loaded!", "success");

    // 2. Register a UI Component to a Slot
    // Available Slots: 
    // - 'sidebar.bottom' (Sidebar Menu)
    // - 'header.center' (Top Titlebar Center)
    // - 'header.right' (Top Titlebar Right)
    // - 'instance.details' (Inside the Instance View tabs)
    // - 'app.overlay' (Global Screen Overlay, absolute positioning)
    api.ui.registerView('app.overlay', MyWidget);

    // 3. Use Storage
    const runCount = api.storage.get('runCount') || 0;
    api.storage.set('runCount', runCount + 1);
};

// Deactivate Hook
exports.deactivate = async () => {
    console.log("Extension deactivated!");
    // Cleanup is handled automatically for UI views, but stop any timers/intervals here.
};
```

### Loading Images / Assets
If your extension includes an `assets/` folder (e.g. `assets/logo.png`), you can load this image in your frontend UI using the custom `extension://` protocol!

```jsx
const MyLogo = () => {
    // Format: extension://<your-extension-id>/path/to/file.png
    return <img src="extension://my-awesome-extension/assets/logo.png" alt="Logo" />;
};
```

## 3. Backend Support (Optional)

You can also include a `backend.js` file to run logic in the Electron Main Process (Node.js).

```javascript
/* backend.js */
exports.activate = async (api) => {
    // You have full access to Electron's 'app' and 'ipcMain' through the api object:
    // api.app, api.ipc (wrapper), or require('electron') directly!

    // Example 1: Register IPC Handlers
    api.ipc.handle('my-custom-event', (event, data) => {
        return "Processed by backend: " + data;
    });

    // Example 2: Hook into App lifecycle
    api.app.on('browser-window-created', () => {
        console.log("New window created!");
    });
};


exports.deactivate = async () => {
    // Cleanup IPC handlers or timers
};
```
From your frontend `main.js`, you can call this backend endpoint using:
`api.ipc.invoke('my-custom-event', 'hello').then(console.log);`

## 4. Packaging


1. Select all files inside your extension folder (manifest.json, main.js, etc.).
2. Right-click -> **Compress to ZIP file**.
3. (Optional) Rename `.zip` to `.mcextension`.
4. Your extension is ready to upload!

## 5. Troubleshooting

* **"Missing entry file"**: Ensure `main.js` (or `main.jsx`) is at the *root* of the zip, not inside a subfolder.
* **Check Console**: Open Developer Tools (Ctrl+Shift+I) to see logs from your frontend extension.
* **Backend Logs**: Backend logs from `backend.js` appear in the main launcher terminal/console.
