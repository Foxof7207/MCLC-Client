import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNotification } from './NotificationContext';


// Simple ID generator to avoid nanoid dependency issues
const generateId = () => Math.random().toString(36).substr(2, 9);

const ExtensionContext = createContext();

// GLOBAL KILL SWITCH - Set to false to disable all extension features
const EXTENSIONS_ENABLED = true;

export const useExtensions = () => useContext(ExtensionContext);

export const ExtensionProvider = ({ children }) => {
    const [installedExtensions, setInstalledExtensions] = useState([]);
    const [activeExtensions, setActiveExtensions] = useState({}); // { [id]: { exports, api, cleanup: [] } }
    const [views, setViews] = useState({}); // { "sidebar.bottom": [ { id, extensionId, component } ] }
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();

    // API exposed to extensions
    const createExtensionApi = (extensionId) => ({
        // UI Registration
        ui: {
            registerView: (slotName, component) => {
                setViews(prev => {
                    const slotViews = prev[slotName] || [];
                    // Remove existing view for this extension in this slot if any
                    const filteredViews = slotViews.filter(v => v.extensionId !== extensionId);
                    return {
                        ...prev,
                        [slotName]: [...filteredViews, { id: generateId(), extensionId, component }]
                    };
                });
            },
            toast: (message, type = 'info') => {
                console.log(`[Extension:${extensionId}] Toast: ${message} (${type})`);
                if (addNotification) {
                    addNotification(`[${extensionId}] ${message}`, type);
                }
            }

        },
        // IPC Communication
        ipc: {
            invoke: (channel, ...args) => {
                // If it's a core method mapped in electronAPI
                const coreMethod = channel.replace(/:/g, '_'); // Some methods might be named differently
                if (window.electronAPI[channel]) return window.electronAPI[channel](...args);

                // If it's the extension's own backend
                return window.electronAPI.invokeExtension(extensionId, channel, ...args);
            },
            on: (channel, callback) => {
                return window.electronAPI.onExtensionMessage(extensionId, channel, callback);
            }
        },
        // Launcher specific API
        launcher: {
            getActiveProcesses: () => window.electronAPI.getActiveProcesses(),
            getProcessStats: (pid) => window.electronAPI.getProcessStats(pid),
        },
        // Storage
        storage: {
            get: (key) => {
                try {
                    const data = localStorage.getItem(`ext:${extensionId}:${key}`);
                    return data ? JSON.parse(data) : null;
                } catch (e) { return null; }
            },
            set: (key, value) => {
                localStorage.setItem(`ext:${extensionId}:${key}`, JSON.stringify(value));
            }
        },
        // Meta
        meta: { id: extensionId }
    });


    // Unload an extension
    const unloadExtension = async (extensionId) => {
        const active = activeExtensions[extensionId];
        if (!active) return;

        console.log(`[Extension] Unloading ${extensionId}...`);

        // 1. Call deactivate hook
        if (active.exports && typeof active.exports.deactivate === 'function') {
            try {
                await active.exports.deactivate();
            } catch (e) {
                console.error(`[Extension] Error during deactivate for ${extensionId}:`, e);
            }
        }

        // 2. Cleanup Views
        setViews(prev => {
            const next = {};
            for (const [slot, items] of Object.entries(prev)) {
                next[slot] = items.filter(item => item.extensionId !== extensionId);
            }
            return next;
        });

        // 3. Remove from active state
        setActiveExtensions(prev => {
            const next = { ...prev };
            delete next[extensionId];
            return next;
        });
        console.log(`[Extension] ${extensionId} unloaded.`);
    };

    // Load a single extension (sandboxed execution)
    const loadExtension = async (ext) => {
        if (activeExtensions[ext.id]) return; // Already loaded

        try {
            console.log(`[Extension] Loading ${ext.id}...`);
            const entryPath = ext.localPath + '/' + (ext.main || 'index.js');
            const importUrl = `app-media:///${entryPath}`;

            // Fetch code
            const response = await fetch(importUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${entryPath}`);
            const code = await response.text();

            // Prepare Sandbox
            const customRequire = (moduleName) => {
                if (moduleName === 'react') return window.React;
                if (moduleName === 'react-dom') return window.ReactDOM;
                if (moduleName === 'react-dom/client') return window.ReactDOM;
                // Add more shared modules here
                throw new Error(`Cannot find module '${moduleName}'`);
            };

            const exports = {};
            const module = { exports };
            const api = createExtensionApi(ext.id);
            // Expose a temporary global for JSX components to access the API
            window.MCLC_API = api;

            // Execute
            const wrapper = new Function('require', 'exports', 'module', 'React', 'api', code);
            wrapper(customRequire, exports, module, window.React, api);


            const ExportedModule = module.exports;

            // Store active state BEFORE calling activate (in case activate calls registerView immediately)
            setActiveExtensions(prev => ({
                ...prev,
                [ext.id]: {
                    exports: ExportedModule,
                    api: api
                }
            }));

            // Lifecycle: Activate
            // Support both new 'activate' export and legacy 'register' export
            if (typeof ExportedModule.activate === 'function') {
                await ExportedModule.activate(api);
                console.log(`[Extension] Activated ${ext.id}`);
            } else if (typeof ExportedModule.register === 'function') {
                // Legacy support
                ExportedModule.register(api);
                console.log(`[Extension] Registered ${ext.id} (Legacy)`);
            } else if (ExportedModule.default) {
                console.warn(`[Extension] ${ext.id} has no activate/register hook. Default export ignored.`);
            }

        } catch (err) {
            console.error(`[Extension] Failed to load ${ext.id}:`, err);
            // Ensure we don't leave partial state? 
            // activeExtensions is only set if execution succeeds so far, 
            // but if activate fails, maybe we should unload?
            // For now, keep it simple.
        }
    };

    // Toggle Extension
    const toggleExtension = async (id, enabled) => {
        try {
            console.log(`[ExtensionContext] Toggling ${id} to ${enabled}`);

            // Get the extension BEFORE state update
            const ext = installedExtensions.find(e => e.id === id);
            if (!ext) {
                console.error(`Extension ${id} not found`);
                return;
            }

            // 1. Update Backend Persistence
            const result = await window.electronAPI.toggleExtension(id, enabled);
            if (!result.success) {
                console.error(`Failed to toggle extension in backend: ${result.error}`);
                return;
            }

            // 2. Update Local State (UI)
            setInstalledExtensions(prev => prev.map(e =>
                e.id === id ? { ...e, enabled } : e
            ));

            // 3. Dynamic Load/Unload
            if (enabled) {
                // Use the extension we found earlier, but with the new enabled state
                await loadExtension({ ...ext, enabled: true });
            } else {
                await unloadExtension(id);
            }
        } catch (e) {
            console.error("Failed to toggle extension:", e);
        }
    };

    const refreshExtensions = async () => {
        if (!EXTENSIONS_ENABLED) {
            setLoading(false);
            return;
        }
        if (!window.electronAPI) return;

        try {
            const result = await window.electronAPI.getExtensions();
            if (result.success) {
                setInstalledExtensions(result.extensions);
                // Load only ENABLED extensions
                for (const ext of result.extensions) {
                    if (ext.enabled && !activeExtensions[ext.id]) {
                        await loadExtension(ext);
                    } else if (!ext.enabled && activeExtensions[ext.id]) {
                        await unloadExtension(ext.id);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to refresh extensions:", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        refreshExtensions();


        // Listen for file opens
        if (window.electronAPI && window.electronAPI.onExtensionFile) {
            const cleanup = window.electronAPI.onExtensionFile(async (filePath) => {
                const confirm = window.confirm(`Do you want to install this extension?\n\n${filePath}`);
                if (confirm) {
                    try {
                        const result = await window.electronAPI.installExtension(filePath);
                        if (result.success) {
                            alert(`Extension installed!`);
                            refreshExtensions();
                        } else {
                            alert(`Failed to install: ${result.error}`);
                        }
                    } catch (e) {
                        alert(`Error: ${e.message}`);
                    }
                }
            });
            return cleanup;
        }

    }, []);

    const getViews = (slotName) => views[slotName] || [];

    return (
        <ExtensionContext.Provider value={{
            extensionsEnabled: EXTENSIONS_ENABLED,
            installedExtensions,
            activeExtensions,
            loading,
            getViews,
            loadExtension,
            unloadExtension,
            toggleExtension,
            refreshExtensions
        }}>
            {children}
        </ExtensionContext.Provider>
    );
};
