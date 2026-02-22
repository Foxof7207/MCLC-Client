import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';
import ToggleBox from '../components/ToggleBox';
import ConfirmationModal from '../components/ConfirmationModal';

function Settings() {
    const { t, i18n } = useTranslation();
    const { addNotification } = useNotification();
    const [settings, setSettings] = useState({
        javaPath: '',
        javaArgs: '-Xmx4G',
        gameResolution: { width: 854, height: 480 },
        launcherTheme: 'dark',
        minimizeOnLaunch: true,
        quitOnGameExit: false,
        animationsExaggerated: false,
        copySettingsEnabled: false,
        copySettingsSourceInstance: '',
        minMemory: 1024,
        maxMemory: 4096,
        resolutionWidth: 854,
        resolutionHeight: 480,
        enableDiscordRPC: true,
        autoUploadLogs: true,
        showDisabledFeatures: false,
        optimization: true,
        enableAutoInstallMods: true,
        autoInstallMods: [],
        language: 'en_us',
        cloudBackupSettings: {
            enabled: false,
            provider: 'GOOGLE_DRIVE',
            autoRestore: false
        }
    });

    const [cloudStatus, setCloudStatus] = useState({
        GOOGLE_DRIVE: { loggedIn: false, user: null },
        DROPBOX: { loggedIn: false, user: null },
        ONEDRIVE: { loggedIn: false, user: null }
    });

    const [showSoftResetModal, setShowSoftResetModal] = useState(false);
    const [showFactoryResetModal, setShowFactoryResetModal] = useState(false);
    const [instances, setInstances] = useState([]);
    const [isInstallingJava, setIsInstallingJava] = useState(false);
    const [javaInstallProgress, setJavaInstallProgress] = useState(null);
    const [showJavaModal, setShowJavaModal] = useState(false);
    const [installedRuntimes, setInstalledRuntimes] = useState([]);
    const [autoInstallModsInput, setAutoInstallModsInput] = useState('');
    const [searchingAutoInstallMods, setSearchingAutoInstallMods] = useState(false);
    const [autoInstallModsSearchResults, setAutoInstallModsSearchResults] = useState([]);
    const [autoInstallModsMetadata, setAutoInstallModsMetadata] = useState({});
    const [autoInstallModsListSearch, setAutoInstallModsListSearch] = useState('');
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
        if (!confirm(t('settings.java.delete_confirm'))) return;
        try {
            const res = await window.electronAPI.deleteJavaRuntime(dirPath);
            if (res.success) {
                addNotification(t('settings.java.delete_success'), "success");
                loadJavaRuntimes();
            } else {
                addNotification(t('settings.java.delete_failed', { error: res.error }), "error");
            }
        } catch (e) {
            addNotification(`Error: ${e.message}`, "error");
        }
    };

    const loadSettings = async () => {
        const res = await window.electronAPI.getSettings();
        if (res.success) {
            const loadedSettings = {
                ...settings,
                ...res.settings,
                cloudBackupSettings: {
                    ...settings.cloudBackupSettings,
                    ...(res.settings.cloudBackupSettings || {})
                }
            };
            // Map old language codes
            const languageMap = { 'en': 'en_us', 'de': 'de_de' };
            if (languageMap[loadedSettings.language]) {
                loadedSettings.language = languageMap[loadedSettings.language];
            }
            setSettings(loadedSettings);
            initialSettingsRef.current = loadedSettings;
        }
        loadCloudStatus();
    };

    const loadCloudStatus = async () => {
        try {
            const status = await window.electronAPI.cloudGetStatus();
            setCloudStatus(status);
        } catch (e) {
            console.error("Failed to load cloud status", e);
        }
    };

    const handleCloudLogin = async (providerId) => {
        try {
            const res = await window.electronAPI.cloudLogin(providerId);
            if (res.success) {
                addNotification(t('settings.cloud.login_success', { provider: providerId.replace('_', ' ') }), 'success');
                loadCloudStatus();
            } else {
                addNotification(t('login.failed') + ': ' + res.error, 'error');
            }
        } catch (e) {
            addNotification(`Error: ${e.message}`, 'error');
        }
    };

    const handleCloudLogout = async (providerId) => {
        try {
            const res = await window.electronAPI.cloudLogout(providerId);
            if (res.success) {
                addNotification(t('settings.cloud.logout_success', { provider: providerId.replace('_', ' ') }), 'success');
                loadCloudStatus();
            }
        } catch (e) {
            addNotification(`Error: ${e.message}`, 'error');
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
                addNotification(t('settings.saved_success'), 'success');
            }
        } else {
            addNotification(t('settings.save_failed'), 'error');
        }
    };
    const handleUpdate = async (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        try {
            await window.electronAPI.saveSettings(newSettings);

        } catch (error) {
            addNotification('Failed to save settings', 'error');
        }
    };

    const handleSoftReset = async () => {
        addNotification('Initiating Soft Reset...', 'info');
        await window.electronAPI.softReset();
    };

    const handleFactoryReset = async () => {
        addNotification('Initiating Factory Reset... Goodbye!', 'error');
        await window.electronAPI.factoryReset();
    };

    const handleBrowseJava = async () => {
        const result = await window.electronAPI.openFileDialog({
            properties: ['openFile'],
            filters: [{ name: 'Java Executable', extensions: ['exe', 'bin'] }]
        });
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return;
        }
        const selectedPath = result.filePaths[0];
        if (selectedPath && (selectedPath.toLowerCase().endsWith('.exe') || selectedPath.toLowerCase().endsWith('.bin'))) {
            handleChange('javaPath', selectedPath);
        } else {
            addNotification(t('settings.java.select_valid'), 'error');
        }
    };
    const handleManualSave = () => {
        saveSettings(settings, false);
    };

    const addAutoInstallMod = async () => {
        const input = autoInstallModsInput.trim();
        if (!input) {
            addNotification(t('settings.auto_install.add_failed'), 'error');
            return;
        }
        if (settings.autoInstallMods.includes(input)) {
            addNotification(t('settings.auto_install.already_exists'), 'warning');
            setAutoInstallModsInput('');
            return;
        }
        let modName = input;
        const foundInSearch = autoInstallModsSearchResults.find(m => m.project_id === input);
        if (foundInSearch) {
            modName = foundInSearch.title;
        } else {

            try {
                const response = await fetch(`https://api.modrinth.com/v2/project/${input}`);
                if (response.ok) {
                    const data = await response.json();
                    modName = data.title;
                }
            } catch (err) {
                console.error('Failed to fetch mod details:', err);
            }
        }
        const newAutoInstallMods = [...(settings.autoInstallMods || []), input];
        handleChange('autoInstallMods', newAutoInstallMods);
        setAutoInstallModsMetadata(prev => ({ ...prev, [input]: modName }));
        setAutoInstallModsInput('');
        setAutoInstallModsSearchResults([]);
        addNotification(t('settings.auto_install.add_success'), 'success');
    };

    const removeAutoInstallMod = (modId) => {
        const newAutoInstallMods = (settings.autoInstallMods || []).filter(m => m !== modId);
        handleChange('autoInstallMods', newAutoInstallMods);
        setAutoInstallModsMetadata(prev => {
            const newMetadata = { ...prev };
            delete newMetadata[modId];
            return newMetadata;
        });
        addNotification(t('settings.auto_install.remove_success'), 'success');
    };

    const searchModrinthMod = async (query) => {
        if (!query.trim()) {
            setAutoInstallModsSearchResults([]);
            return;
        }

        setSearchingAutoInstallMods(true);
        try {
            const response = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();
            setAutoInstallModsSearchResults(data.hits || []);
        } catch (err) {
            console.error('Failed to search mods:', err);
            addNotification(t('settings.auto_install.search_failed'), 'error');
            setAutoInstallModsSearchResults([]);
        } finally {
            setSearchingAutoInstallMods(false);
        }
    };

    const BentoTile = ({ children, title, subtitle, className = '', icon, span = "col-span-1" }) => (
        <div className={`bg-surface/50 backdrop-blur-md rounded-2xl border border-white/5 p-6 hover:border-primary/20 hover:scale-[1.02] transition-all duration-300 group flex flex-col ${span} ${className}`}>
            {(title || icon) && (
                <div className="flex items-center gap-3 mb-4">
                    {icon && <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>}
                    <div>
                        {title && <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{title}</h3>}
                        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                    </div>
                </div>
            )}
            <div className="flex-1">
                {children}
            </div>
        </div>
    );

    return (
        <div className="p-10 text-white h-full overflow-y-auto custom-scrollbar">
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">{t('settings.title')}</h1>
                    <p className="text-gray-400 max-w-lg">{t('settings.desc')}</p>
                </div>
                <button
                    onClick={handleManualSave}
                    className="group px-8 py-3 bg-primary hover:bg-primary-hover text-black rounded-xl text-sm font-bold transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 shadow-lg hover:shadow-primary/20"
                >
                    <svg className="w-5 h-5 transition-transform group-hover:-translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>{t('settings.save_btn')}</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
                {/* Memory Allocation - 2x2 */}
                <BentoTile
                    title={t('settings.memory.title')}
                    span="md:col-span-2 md:row-span-2"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
                >
                    <div className="flex flex-col h-full justify-between py-4">
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t('settings.memory.min')}</label>
                                <input
                                    type="number"
                                    value={settings.minMemory}
                                    onChange={(e) => handleChange('minMemory', parseInt(e.target.value) || 0)}
                                    className="w-full bg-black/30 border border-white/5 rounded-lg p-3 text-lg focus:border-primary outline-none font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t('settings.memory.max')}</label>
                                <input
                                    type="number"
                                    value={settings.maxMemory}
                                    onChange={(e) => handleChange('maxMemory', parseInt(e.target.value) || 0)}
                                    className="w-full bg-black/30 border border-white/5 rounded-lg p-3 text-lg focus:border-primary outline-none font-mono"
                                />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <input
                                type="range"
                                min="512"
                                max="16384"
                                step="512"
                                value={settings.maxMemory}
                                onChange={(e) => handleChange('maxMemory', parseInt(e.target.value))}
                                className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
                                <span className="text-sm text-gray-400">Total Allocation</span>
                                <span className="text-2xl font-black text-primary font-mono">{Math.floor(settings.maxMemory / 1024 * 10) / 10} GB</span>
                            </div>
                        </div>
                    </div>
                </BentoTile>

                {/* Java Path - 2x1 */}
                <BentoTile
                    title={t('settings.java.title')}
                    span="md:col-span-2"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                >
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={settings.javaPath || ''}
                                readOnly
                                placeholder={t('settings.java.detecting')}
                                className="flex-1 bg-black/20 border border-white/5 rounded-lg px-4 py-2 text-sm text-gray-400 truncate"
                            />
                            <button onClick={handleBrowseJava} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition border border-white/5">
                                {t('settings.java.browse')}
                            </button>
                        </div>
                        <button
                            onClick={() => setShowJavaModal(true)}
                            disabled={isInstallingJava}
                            className="w-full py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-black rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border border-primary/20"
                        >
                            {isInstallingJava ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <span>{t('settings.java.install')}</span>}
                        </button>
                    </div>
                </BentoTile>

                {/* Resolution - 1x1 */}
                <BentoTile
                    title={t('settings.resolution.title')}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
                >
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="number"
                            value={settings.resolutionWidth}
                            onChange={(e) => handleChange('resolutionWidth', parseInt(e.target.value) || 0)}
                            className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-sm text-center font-mono"
                        />
                        <input
                            type="number"
                            value={settings.resolutionHeight}
                            onChange={(e) => handleChange('resolutionHeight', parseInt(e.target.value) || 0)}
                            className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-sm text-center font-mono"
                        />
                    </div>
                </BentoTile>

                {/* General Settings - 1x1 */}
                <BentoTile
                    title={t('settings.general.title')}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
                >
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">{t('settings.general.language')}</label>
                            <select
                                value={settings.language || 'en_us'}
                                onChange={(e) => {
                                    const newLang = e.target.value;
                                    handleChange('language', newLang);
                                    i18n.changeLanguage(newLang);
                                }}
                                className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:border-primary outline-none"
                            >
                                <option value="en_us">{t('settings.general.english')}</option>
                                <option value="en_uk">{t('settings.general.english_uk')}</option>
                                <option value="de_de">{t('settings.general.german')}</option>
                                <option value="de_ch">{t('settings.general.swiss_german')}</option>
                                <option value="es_es">{t('settings.general.spanish')}</option>
                                <option value="fr_fr">{t('settings.general.french')}</option>
                                <option value="it_it">{t('settings.general.italian')}</option>
                                <option value="pl_pl">{t('settings.general.polish')}</option>
                                <option value="pt_br">{t('settings.general.portuguese_br')}</option>
                                <option value="pt_pt">{t('settings.general.portuguese_pt')}</option>
                                <option value="ro_ro">{t('settings.general.romanian')}</option>
                                <option value="ru_ru">{t('settings.general.russian')}</option>
                                <option value="sk_sk">{t('settings.general.slovak')}</option>
                                <option value="sl_si">{t('settings.general.slovenian')}</option>
                                <option value="sv_se">{t('settings.general.swedish')}</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">{t('settings.general.startup_page')}</label>
                            <select
                                value={settings.startPage || 'dashboard'}
                                onChange={(e) => handleChange('startPage', e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:border-primary outline-none"
                            >
                                <option value="dashboard">{t('common.dashboard')}</option>
                                <option value="library">{t('common.library')}</option>
                            </select>
                        </div>
                    </div>
                </BentoTile>

                {/* Instance Creation - 2x1 */}
                <BentoTile
                    title={t('settings.instance.title')}
                    span="md:col-span-2"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>}
                >
                    <div className="space-y-4">
                        <ToggleBox
                            checked={settings.copySettingsEnabled || false}
                            onChange={(val) => handleChange('copySettingsEnabled', val)}
                            label={t('settings.instance.copy_settings')}
                        />
                        {settings.copySettingsEnabled && (
                            <select
                                value={settings.copySettingsSourceInstance || ''}
                                onChange={(e) => handleChange('copySettingsSourceInstance', e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:border-primary outline-none"
                            >
                                <option value="">{t('settings.instance.source_instance')}</option>
                                {instances.map(inst => (
                                    <option key={inst.name} value={inst.name}>{inst.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </BentoTile>

                {/* Cloud & Backup - 2x1 */}
                <BentoTile
                    title={t('settings.cloud.title')}
                    span="md:col-span-2"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>}
                >
                    <div className="grid grid-cols-2 gap-4 h-full items-center">
                        {['GOOGLE_DRIVE', 'DROPBOX'].map(id => (
                            <button
                                key={id}
                                onClick={() => cloudStatus[id]?.loggedIn ? handleCloudLogout(id) : handleCloudLogin(id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${cloudStatus[id]?.loggedIn ? 'bg-primary/20 border-primary/40' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${cloudStatus[id]?.loggedIn ? 'bg-green-400' : 'bg-gray-600'}`} />
                                <span className="text-xs font-bold">{id.replace('_', ' ')}</span>
                            </button>
                        ))}
                    </div>
                </BentoTile>

                {/* Quick Toggles - 2x2 Grid */}
                <div className="md:col-span-2 md:row-span-2 grid grid-cols-1 gap-4">
                    <BentoTile className="flex-1" title={t('styling.interactive_effects')}>
                        <div className="space-y-4">
                            <ToggleBox
                                checked={settings.enableDiscordRPC}
                                onChange={(val) => handleChange('enableDiscordRPC', val)}
                                label={t('settings.integration.discord_rpc')}
                            />
                            <ToggleBox
                                checked={settings.optimization || false}
                                onChange={(val) => handleChange('optimization', val)}
                                label={t('settings.integration.optimization')}
                            />
                            <ToggleBox
                                checked={settings.animationsExaggerated || false}
                                onChange={(val) => handleChange('animationsExaggerated', val)}
                                label={t('settings.integration.animations_exaggerated')}
                            />
                            <ToggleBox
                                checked={settings.showDisabledFeatures || false}
                                onChange={(val) => handleChange('showDisabledFeatures', val)}
                                label={t('settings.integration.disabled_features')}
                            />
                        </div>
                    </BentoTile>
                    <BentoTile className="flex-1" title={t('settings.integration.title')}>
                        <div className="space-y-4">
                            <ToggleBox
                                checked={settings.enableAutoInstallMods || false}
                                onChange={(val) => handleChange('enableAutoInstallMods', val)}
                                label={t('settings.integration.auto_mod_install')}
                            />
                            <ToggleBox
                                checked={settings.autoUploadLogs || false}
                                onChange={(val) => handleChange('autoUploadLogs', val)}
                                label={t('settings.integration.auto_logs')}
                            />
                            <ToggleBox
                                checked={settings.minimizeOnLaunch || false}
                                onChange={(val) => handleChange('minimizeOnLaunch', val)}
                                label={t('settings.integration.minimize_on_launch')}
                            />
                            <ToggleBox
                                checked={settings.quitOnGameExit || false}
                                onChange={(val) => handleChange('quitOnGameExit', val)}
                                label={t('settings.integration.quit_on_game_exit')}
                            />
                        </div>
                    </BentoTile>
                </div>

                {/* Mod Management - 2x2 */}
                {settings.enableAutoInstallMods && (
                    <BentoTile
                        title="Mod Management"
                        span="md:col-span-2 md:row-span-2"
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    >
                        <div className="flex flex-col h-full gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={autoInstallModsInput}
                                    onChange={(e) => {
                                        setAutoInstallModsInput(e.target.value);
                                        if (e.target.value.trim()) searchModrinthMod(e.target.value);
                                        else setAutoInstallModsSearchResults([]);
                                    }}
                                    placeholder="Add mod by ID..."
                                    className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-2 text-sm"
                                />
                                {autoInstallModsSearchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/10 rounded-lg shadow-2xl z-20 max-h-40 overflow-y-auto">
                                        {autoInstallModsSearchResults.map(mod => (
                                            <button key={mod.project_id} onClick={() => { setAutoInstallModsInput(mod.project_id); setAutoInstallModsSearchResults([]); }} className="w-full text-left px-4 py-2 hover:bg-white/5 text-xs border-b border-white/5">
                                                {mod.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[200px]">
                                {settings.autoInstallMods?.map(mod => (
                                    <div key={mod} className="flex justify-between items-center bg-black/20 p-2 rounded-lg text-xs">
                                        <span className="truncate pr-2">{autoInstallModsMetadata[mod] || mod}</span>
                                        <button onClick={() => removeAutoInstallMod(mod)} className="text-red-400 hover:text-red-300">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </BentoTile>
                )}

                {/* Reset Actions - 2x1 */}
                <BentoTile title="Reset Zone" span="md:col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setShowSoftResetModal(true)} className="py-2.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-black rounded-lg text-xs font-bold transition-all border border-yellow-500/20">
                            Soft Reset
                        </button>
                        <button onClick={() => setShowFactoryResetModal(true)} className="py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-black rounded-lg text-xs font-bold transition-all border border-red-500/20">
                            Factory Reset
                        </button>
                    </div>
                </BentoTile>
            </div>

            {/* Modals and Overlays */}
            {showSoftResetModal && (
                <ConfirmationModal
                    title="Soft Reset"
                    message="This will clear temporary cache but keep your settings and instances. Continue?"
                    onConfirm={() => { handleSoftReset(); setShowSoftResetModal(false); }}
                    onCancel={() => setShowSoftResetModal(false)}
                />
            )}
            {showFactoryResetModal && (
                <ConfirmationModal
                    title="Factory Reset"
                    message="WARNING: This will delete ALL data, instances, and settings. This cannot be undone."
                    onConfirm={() => { handleFactoryReset(); setShowFactoryReset(false); }}
                    onCancel={() => setShowFactoryResetModal(false)}
                    isDangerous={true}
                />
            )}
            {/* Java Install Modal */}
            {showJavaModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
                    <div className="bg-surface border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-scale-in">
                        <h3 className="text-2xl font-black mb-2">{t('settings.java.install')}</h3>
                        <p className="text-gray-400 mb-8 text-sm leading-relaxed">{t('settings.java.install_desc')}</p>
                        <div className="space-y-3">
                            {[8, 17, 21].map(v => (
                                <button key={v} onClick={() => handleInstallJava(v)} className="w-full p-4 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/20 transition-all font-bold text-left flex justify-between items-center group">
                                    <span>Java {v} (LTS)</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowJavaModal(false)} className="mt-8 w-full text-center text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Settings;