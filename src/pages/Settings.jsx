import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';
import ToggleBox from '../components/ToggleBox';

function Settings() {
    const { addNotification } = useNotification();
    const [settings, setSettings] = useState({
        javaPath: '',
        minMemory: 1024,
        maxMemory: 4096,
        resolutionWidth: 854,
        resolutionHeight: 480,
        enableDiscordRPC: true,
        autoUploadLogs: true,
        showDisabledFeatures: false,
        copySettingsEnabled: false,
        copySettingsSourceInstance: ''
    });
    const [instances, setInstances] = useState([]);
    const [isInstallingJava, setIsInstallingJava] = useState(false);
    const [javaInstallProgress, setJavaInstallProgress] = useState(null);
    const [showJavaModal, setShowJavaModal] = useState(false);
    const [installedRuntimes, setInstalledRuntimes] = useState([]);
    const hasUnsavedChanges = useRef(false);
    const initialSettingsRef = useRef(null);

    useEffect(() => {
        const cleanup = window.electronAPI.onJavaProgress((data) => {
            setJavaInstallProgress(data);
        });
        return cleanup;
    }, []);

    const handleInstallJava = async (version) => {
        setShowJavaModal(false);
        setIsInstallingJava(true);
        setJavaInstallProgress({ step: 'Starting...', progress: 0 });
        try {
            const result = await window.electronAPI.installJava(version);
            if (result.success) {
                handleChange('javaPath', result.path);
                addNotification(`Java ${version} installed successfully`, 'success');
                loadJavaRuntimes();
            } else {
                addNotification(`Failed to install Java: ${result.error}`, 'error');
            }
        } catch (e) {
            addNotification(`Error: ${e.message}`, 'error');
        } finally {
            setIsInstallingJava(false);
            setJavaInstallProgress(null);
        }
    };

    useEffect(() => {
        loadSettings();
        loadInstances();
        loadJavaRuntimes();
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges.current) {
                saveSettings(settings);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);

            if (hasUnsavedChanges.current) {
                saveSettings(settings, true);
            }
        };
    }, []);

    const loadInstances = async () => {
        const list = await window.electronAPI.getInstances();
        setInstances(list || []);
    };

    const loadJavaRuntimes = async () => {
        try {
            const res = await window.electronAPI.getJavaRuntimes();
            if (res.success) {
                setInstalledRuntimes(res.runtimes);
            }
        } catch (err) {
            console.error("Failed to load Java runtimes", err);
        }
    };

    const handleDeleteRuntime = async (dirPath) => {
        if (!confirm("Are you sure you want to delete this Java runtime?")) return;
        try {
            const res = await window.electronAPI.deleteJavaRuntime(dirPath);
            if (res.success) {
                addNotification("Java runtime deleted", "success");
                loadJavaRuntimes();
                // If the deleted runtime was selected, clear the selection?
                // Probably better to leave it and let user realize, or verify.
            } else {
                addNotification(`Failed to delete: ${res.error}`, "error");
            }
        } catch (e) {
            addNotification(`Error: ${e.message}`, "error");
        }
    };

    const loadSettings = async () => {
        const res = await window.electronAPI.getSettings();
        if (res.success) {
            const loadedSettings = { ...settings, ...res.settings };
            setSettings(loadedSettings);
            initialSettingsRef.current = loadedSettings;
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            if (initialSettingsRef.current) {
                const hasChanges = Object.keys(newSettings).some(
                    key => newSettings[key] !== initialSettingsRef.current[key]
                );
                hasUnsavedChanges.current = hasChanges;
            }
            saveSettings(newSettings, true);
            return newSettings;
        });
    };

    const saveSettings = async (newSettings, silent = false) => {
        const res = await window.electronAPI.saveSettings(newSettings);
        if (res.success) {

            initialSettingsRef.current = newSettings;
            hasUnsavedChanges.current = false;
            if (!silent) {
                addNotification('Settings saved successfully', 'success');
            }
        } else {
            addNotification('Failed to save settings', 'error');
        }
    };

    const handleBrowseJava = async () => {
        const path = await window.electronAPI.openFileDialog({
            properties: ['openFile'],
            filters: [{ name: 'Java Executable', extensions: ['exe', 'bin'] }]
        });
        if (path) {
            handleChange('javaPath', path);

        }
    };
    const handleManualSave = () => {
        saveSettings(settings, false);
    };

    return (
        <div className="p-10 text-white h-full overflow-y-auto custom-scrollbar">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-400 mb-10">Manage your launcher preferences.</p>

            { }
            <div className="max-w-3xl mb-6 flex justify-end">
                <button
                    onClick={handleManualSave}
                    className="px-6 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>Save Settings</span>
                </button>
            </div>

            <div className="space-y-6 max-w-3xl">
                { }
                <div className="bg-surface/50 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <h2 className="text-lg font-bold mb-6 text-white">General</h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-white">Startup Page</div>
                            <div className="text-sm text-gray-500 mt-1">Choose which page to show when you open the app</div>
                        </div>
                        <select
                            value={settings.startPage || 'dashboard'}
                            onChange={(e) => handleChange('startPage', e.target.value)}
                            className="bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-primary outline-none text-gray-300 cursor-pointer min-w-[160px]"
                        >
                            <option value="dashboard">Dashboard</option>
                            <option value="library">Library</option>
                        </select>
                    </div>
                </div>

                { }
                {showJavaModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-secondary p-6 rounded-xl border border-white/10 w-96 shadow-2xl animate-scale-in">
                            <h3 className="text-xl font-bold mb-4">Install Java</h3>
                            <p className="text-gray-400 mb-6 text-sm">Select a Java version to install. We recommend Java 17 for most modern versions (1.18+).</p>

                            <div className="space-y-3">
                                {[8, 17, 21].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => handleInstallJava(v)}
                                        className="w-full p-4 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition flex items-center justify-between group"
                                    >
                                        <span className="font-medium">Java {v} (LTS)</span>
                                        <span className="text-primary opacity-0 group-hover:opacity-100 transition">Install &rarr;</span>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowJavaModal(false)}
                                className="mt-6 w-full py-2 text-sm text-gray-400 hover:text-white transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                { }
                <div className="bg-surface/50 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <h2 className="text-lg font-bold mb-6 text-white">Java Runtime</h2>

                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-medium mb-2">Java Executable Path</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={settings.javaPath || ''}
                                readOnly
                                placeholder="Detecting..."
                                className="flex-1 bg-black/20 border border-white/5 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary/50"
                            />
                            <button
                                onClick={handleBrowseJava}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition border border-white/5"
                            >
                                Browse
                            </button>
                            <button
                                onClick={() => setShowJavaModal(true)}
                                disabled={isInstallingJava}
                                className={`px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition flex items-center gap-2 ${isInstallingJava ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isInstallingJava ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>{javaInstallProgress ? `${Math.round(javaInstallProgress.progress)}%` : 'Installing...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        <span>Install Java</span>
                                    </>
                                )}
                            </button>
                        </div>
                        {isInstallingJava && javaInstallProgress && (
                            <div className="mt-2 text-xs text-primary/80 animate-pulse">
                                {javaInstallProgress.step}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Recommended: Leave empty to use bundled Java. Install specific version if needed.
                        </p>
                    </div>

                    {/* Installed Runtimes List */}
                    {installedRuntimes.length > 0 && (
                        <div className="mt-6 border-t border-white/5 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-300">Installed Versions</h3>
                                <button 
                                    onClick={() => window.electronAPI.openJavaFolder()}
                                    className="text-xs text-primary hover:text-primary-hover transition"
                                >
                                    Open Folder
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                {installedRuntimes.map((runtime) => (
                                    <div key={runtime.dirPath} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5 group hover:border-white/10 transition">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <div className="text-sm font-medium text-gray-200 truncate">{runtime.name}</div>
                                            <div className="text-xs text-gray-500 truncate font-mono mt-0.5">{runtime.path}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {settings.javaPath === runtime.path ? (
                                                <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">Active</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleChange('javaPath', runtime.path)}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs rounded transition border border-white/5 hover:border-white/10"
                                                >
                                                    Select
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteRuntime(runtime.dirPath)}
                                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition"
                                                title="Delete Runtime"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                { }
                <div className="bg-surface/50 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <h2 className="text-lg font-bold mb-6 text-white">Memory Allocation</h2>

                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div>
                            <label className="block text-gray-400 text-sm font-medium mb-2">Minimum (MB)</label>
                            <input
                                type="number"
                                value={settings.minMemory}
                                onChange={(e) => handleChange('minMemory', parseInt(e.target.value) || 0)}
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:border-primary outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm font-medium mb-2">Maximum (MB)</label>
                            <input
                                type="number"
                                value={settings.maxMemory}
                                onChange={(e) => handleChange('maxMemory', parseInt(e.target.value) || 0)}
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:border-primary outline-none font-mono"
                            />
                        </div>
                    </div>
                    <div>
                        <input
                            type="range"
                            min="512"
                            max="16384"
                            step="512"
                            value={settings.maxMemory}
                            onChange={(e) => handleChange('maxMemory', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-background-dark rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                            <span>512 MB</span>
                            <span className="text-primary font-bold">{Math.floor(settings.maxMemory / 1024 * 10) / 10} GB</span>
                            <span>16 GB</span>
                        </div>
                    </div>
                </div>

                { }
                <div className="bg-surface/50 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <h2 className="text-lg font-bold mb-6 text-white">Resolution</h2>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className="block text-gray-400 text-sm font-medium mb-2">Width</label>
                            <input
                                type="number"
                                value={settings.resolutionWidth}
                                onChange={(e) => handleChange('resolutionWidth', parseInt(e.target.value) || 0)}
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:border-primary outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm font-medium mb-2">Height</label>
                            <input
                                type="number"
                                value={settings.resolutionHeight}
                                onChange={(e) => handleChange('resolutionHeight', parseInt(e.target.value) || 0)}
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:border-primary outline-none font-mono"
                            />
                        </div>
                    </div>
                </div>

                { }
                <div className="bg-surface/50 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <h2 className="text-lg font-bold mb-6 text-white">Instance Creation</h2>

                    <ToggleBox
                        checked={settings.copySettingsEnabled || false}
                        onChange={(val) => handleChange('copySettingsEnabled', val)}
                        label="Copy Settings from Instance"
                        description="Automatically copy keybinds and options from a selected instance when creating a new one."
                    />

                    {settings.copySettingsEnabled && (
                        <div>
                            <label className="block text-gray-400 text-sm font-medium mb-2">Source Instance</label>
                            <select
                                value={settings.copySettingsSourceInstance || ''}
                                onChange={(e) => handleChange('copySettingsSourceInstance', e.target.value)}
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:border-primary outline-none font-mono text-gray-300"
                            >
                                <option value="">Select an instance...</option>
                                {instances.map((inst) => (
                                    <option key={inst.name} value={inst.name}>{inst.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                { }
                <div className="bg-surface/50 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <h2 className="text-lg font-bold mb-6 text-white">Launcher Integration</h2>

                    <ToggleBox
                        checked={settings.enableDiscordRPC}
                        onChange={(val) => handleChange('enableDiscordRPC', val)}
                        label="Discord Rich Presence"
                        description="Show what you're playing on Discord"
                    />
                    <ToggleBox
                        className="mt-4 pt-4 border-t border-white/5"
                        checked={settings.autoUploadLogs || false}
                        onChange={(val) => handleChange('autoUploadLogs', val)}
                        label="Auto-upload logs on crash"
                        description="Automatically upload logs to mclo.gs if the game crashes"
                    />
                    <ToggleBox
                        className="mt-4 pt-4 border-t border-white/5"
                        checked={settings.showDisabledFeatures || false}
                        onChange={(val) => handleChange('showDisabledFeatures', val)}
                        label="Show Disabled Features"
                        description="Hides or grays out features that are currently disabled (like the Extensions button)."
                    />
                </div>
            </div>
        </div>
    );
}

export default Settings;