import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';
import LoadingOverlay from '../components/LoadingOverlay';

function ServerDetails({ server, onBack, runningInstances, onServerUpdate }) {
    const { addNotification } = useNotification();
    const [consoleLog, setConsoleLog] = useState([]);
    const [command, setCommand] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showEulaDialog, setShowEulaDialog] = useState(false);
    const [serverStats, setServerStats] = useState({
        cpu: 0,
        memory: 0,
        players: [],
        uptime: 0
    });
    const [currentStatus, setCurrentStatus] = useState(server.status || 'stopped');
    const [isConnected, setIsConnected] = useState(true);

    const consoleRef = useRef(null);
    const commandInputRef = useRef(null);
    const statsInterval = useRef(null);

    useEffect(() => {
        // Load console history immediately
        loadConsoleLog();

        // Set up all event listeners
        const removeStatusListener = window.electronAPI.onServerStatus?.(({ serverName, status, server: updatedServer }) => {
            if (serverName === server.name) {
                console.log(`[ServerDetails] Status update for ${serverName}: ${status}`);
                setCurrentStatus(status);

                // Update server object if provided
                if (updatedServer && onServerUpdate) {
                    onServerUpdate(updatedServer);
                }
            }
        });

        const removeLogListener = window.electronAPI.onServerLog?.(({ serverName, log }) => {
            if (serverName === server.name) {
                setConsoleLog(prev => {
                    const newLog = [...prev, log];
                    // Keep only last 500 lines
                    if (newLog.length > 500) {
                        return newLog.slice(-500);
                    }
                    return newLog;
                });
            }
        });

        const removeStatsListener = window.electronAPI.onServerStats?.(({ serverName, cpu, memory, uptime, players }) => {
            if (serverName === server.name) {
                setServerStats({
                    cpu: cpu || 0,
                    memory: memory || 0,
                    uptime: uptime || 0,
                    players: players || []
                });
            }
        });

        const removeEulaListener = window.electronAPI.onServerEulaRequired?.(({ serverName }) => {
            if (serverName === server.name) {
                setShowEulaDialog(true);
            }
        });

        const removeConsoleClearedListener = window.electronAPI.onServerConsoleCleared?.(({ serverName }) => {
            if (serverName === server.name) {
                setConsoleLog([]);
            }
        });

        // Check server status periodically
        const checkStatusInterval = setInterval(() => {
            checkServerStatus();
        }, 2000);

        // Initial status and stats check
        checkServerStatus();
        loadServerStats();

        // Set up periodic stats refresh
        statsInterval.current = setInterval(() => {
            loadServerStats();
        }, 2000);

        // Focus command input when component mounts
        if (commandInputRef.current) {
            commandInputRef.current.focus();
        }

        return () => {
            // Clean up all listeners
            if (removeStatusListener) removeStatusListener();
            if (removeLogListener) removeLogListener();
            if (removeStatsListener) removeStatsListener();
            if (removeEulaListener) removeEulaListener();
            if (removeConsoleClearedListener) removeConsoleClearedListener();

            clearInterval(checkStatusInterval);
            if (statsInterval.current) {
                clearInterval(statsInterval.current);
            }
        };
    }, [server.name]);

    // Auto-scroll console to bottom when new lines arrive
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [consoleLog]);

    const checkServerStatus = async () => {
        try {
            if (!window.electronAPI.getServerStatus) return;

            const status = await window.electronAPI.getServerStatus(server.name);
            if (status && status !== currentStatus) {
                setCurrentStatus(status);
            }
        } catch (error) {
            console.error('Failed to check server status:', error);
        }
    };

    const loadConsoleLog = async () => {
        try {
            if (!window.electronAPI.getServerLogs) return;

            const log = await window.electronAPI.getServerLogs(server.name);
            if (Array.isArray(log)) {
                setConsoleLog(log.slice(-500)); // Keep only last 500 lines
            }
        } catch (error) {
            console.error('Failed to load console log:', error);
        }
    };

    const loadServerStats = async () => {
        try {
            if (!window.electronAPI.getServerStats) return;

            const stats = await window.electronAPI.getServerStats(server.name);
            setServerStats(prev => ({
                ...prev,
                ...stats,
                cpu: stats?.cpu || 0,
                memory: stats?.memory || 0,
                players: stats?.players || []
            }));
        } catch (error) {
            console.error('Failed to load server stats:', error);
        }
    };

    const handleSendCommand = async (e) => {
        e.preventDefault();
        if (!command.trim()) return;

        try {
            await window.electronAPI.sendServerCommand(server.name, command);
            setCommand('');

            // Keep focus on input after sending
            if (commandInputRef.current) {
                commandInputRef.current.focus();
            }
        } catch (error) {
            console.error('Failed to send command:', error);
            addNotification(`Failed to send command: ${error.message}`, 'error');
        }
    };

    const checkEulaStatus = async () => {
        if (!window.electronAPI.checkServerEula) {
            console.warn('EULA check not available, proceeding without check');
            return true;
        }

        try {
            return await window.electronAPI.checkServerEula(server.name);
        } catch (error) {
            console.error('Failed to check EULA:', error);
            return true;
        }
    };

    const handleStart = async () => {
        const eulaAccepted = await checkEulaStatus();

        if (!eulaAccepted) {
            setShowEulaDialog(true);
            return;
        }

        proceedWithStart();
    };

    const proceedWithStart = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.startServer(server.name);
            if (result?.success) {
                addNotification(`Starting server ${server.name}...`, 'info');
                setCurrentStatus('starting');
            } else {
                addNotification(`Failed to start server: ${result?.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Failed to start server:', error);
            addNotification(`Failed to start server: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEulaAccept = async () => {
        setShowEulaDialog(false);

        if (window.electronAPI.acceptServerEula) {
            try {
                await window.electronAPI.acceptServerEula(server.name);
            } catch (error) {
                console.error('Failed to accept EULA:', error);
            }
        }

        proceedWithStart();
    };

    const handleEulaCancel = () => {
        setShowEulaDialog(false);
        addNotification('Server start cancelled - EULA not accepted', 'warning');
    };

    const handleStop = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.stopServer(server.name);
            if (result?.success) {
                addNotification(`Stopping server ${server.name}...`, 'info');
                setCurrentStatus('stopping');
            } else {
                addNotification(`Failed to stop server: ${result?.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Failed to stop server:', error);
            addNotification(`Failed to stop server: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestart = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.restartServer(server.name);
            if (result?.success) {
                addNotification(`Restarting server ${server.name}...`, 'info');
                setCurrentStatus('restarting');
            } else {
                addNotification(`Failed to restart server: ${result?.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Failed to restart server:', error);
            addNotification(`Failed to restart server: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearConsole = async () => {
        try {
            if (window.electronAPI.clearServerConsole) {
                await window.electronAPI.clearServerConsole(server.name);
            } else {
                setConsoleLog([]);
            }
            addNotification('Console cleared', 'success');
        } catch (error) {
            console.error('Failed to clear console:', error);
            addNotification('Failed to clear console', 'error');
        }
    };

    const copyConsoleToClipboard = () => {
        const consoleText = consoleLog.join('\n');
        navigator.clipboard.writeText(consoleText).then(() => {
            addNotification('Console content copied to clipboard', 'success');
        }).catch(() => {
            addNotification('Failed to copy console content', 'error');
        });
    };

    const formatUptime = (seconds) => {
        if (!seconds) return '0s';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    };

    const isRunning = currentStatus === 'running';
    const isStarting = currentStatus === 'starting';
    const isStopping = currentStatus === 'stopping';
    const isRestarting = currentStatus === 'restarting';

    return (
        <div className="h-full flex flex-col bg-background">
            {isLoading && <LoadingOverlay message="Processing..." />}

            {/* EULA Dialog */}
            {showEulaDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">Minecraft EULA</h3>
                        <p className="text-gray-300 mb-6">
                            By pressing Start, you are indicating your agreement to the Minecraft EULA
                            (<a
                                href="https://aka.ms/MinecraftEULA"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (window.electronAPI.openExternal) {
                                        window.electronAPI.openExternal('https://aka.ms/MinecraftEULA');
                                    } else {
                                        window.open('https://aka.ms/MinecraftEULA', '_blank');
                                    }
                                }}
                            >
                                https://aka.ms/MinecraftEULA
                            </a>).
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleEulaCancel}
                                className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEulaAccept}
                                className="px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors font-bold"
                            >
                                Start
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-background rounded-lg overflow-hidden">
                            {server.icon && server.icon.startsWith('data:') ? (
                                <img src={server.icon} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                    🖥️
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{server.name}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span className="bg-white/5 px-2 py-0.5 rounded">{server.software}</span>
                                <span>{server.version}</span>
                                <span>Port: {server.port}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 ${isRunning ? 'bg-green-500/20 text-green-400' :
                            isStarting || isRestarting ? 'bg-yellow-500/20 text-yellow-400' :
                                isStopping ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-gray-500/20 text-gray-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' :
                                isStarting || isRestarting ? 'bg-yellow-500 animate-pulse' :
                                    isStopping ? 'bg-orange-500 animate-pulse' :
                                        'bg-gray-500'
                            }`}></div>
                        {isRunning ? 'Running' :
                            isStarting ? 'Starting...' :
                                isStopping ? 'Stopping...' :
                                    isRestarting ? 'Restarting...' :
                                        'Stopped'}
                    </div>

                    {!isRunning && !isStarting && !isStopping && !isRestarting && (
                        <button
                            onClick={handleStart}
                            className="px-4 py-1.5 bg-primary/20 text-primary rounded-lg text-sm font-bold hover:bg-primary/30 transition-colors"
                        >
                            Start
                        </button>
                    )}
                    {isRunning && (
                        <>
                            <button
                                onClick={handleStop}
                                className="px-4 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/30 transition-colors"
                            >
                                Stop
                            </button>
                            <button
                                onClick={handleRestart}
                                className="px-4 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-bold hover:bg-yellow-500/30 transition-colors"
                            >
                                Restart
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 p-6 border-b border-white/5">
                <div className="bg-surface/40 rounded-xl p-4">
                    <div className="text-gray-400 text-sm mb-1">Players</div>
                    <div className="text-2xl font-bold text-white">
                        {serverStats.players?.length || 0}/{server.maxPlayers || 20}
                    </div>
                    {serverStats.players?.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                            {serverStats.players.join(', ')}
                        </div>
                    )}
                </div>
                <div className="bg-surface/40 rounded-xl p-4">
                    <div className="text-gray-400 text-sm mb-1">CPU Usage</div>
                    <div className="text-2xl font-bold text-white">{Math.round(serverStats.cpu)}%</div>
                </div>
                <div className="bg-surface/40 rounded-xl p-4">
                    <div className="text-gray-400 text-sm mb-1">Memory Usage</div>
                    <div className="text-2xl font-bold text-white">
                        {Math.round(serverStats.memory || 0)} MB
                    </div>
                </div>
                <div className="bg-surface/40 rounded-xl p-4">
                    <div className="text-gray-400 text-sm mb-1">Uptime</div>
                    <div className="text-2xl font-bold text-white">
                        {formatUptime(serverStats.uptime)}
                    </div>
                </div>
            </div>

            {/* Console */}
            <div className="flex-1 p-6 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-white">Console</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleClearConsole}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                            title="Clear console"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                        <button
                            onClick={copyConsoleToClipboard}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                            title="Copy console content"
                            disabled={consoleLog.length === 0}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div
                    ref={consoleRef}
                    className="flex-1 bg-black/40 rounded-xl p-4 font-mono text-sm overflow-y-auto custom-scrollbar mb-4 select-text"
                >
                    {consoleLog.map((line, i) => (
                        <div key={i} className="text-gray-300 whitespace-pre-wrap mb-1 hover:bg-white/5 cursor-text">
                            {line}
                        </div>
                    ))}
                    {consoleLog.length === 0 && (
                        <div className="text-gray-500 italic">No console output yet</div>
                    )}
                </div>

                <form onSubmit={handleSendCommand} className="flex gap-2">
                    <input
                        ref={commandInputRef}
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="Enter command... (with or without /)"
                        className="flex-1 bg-background border border-white/10 rounded-xl px-4 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        disabled={!isRunning}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!isRunning || !command.trim()}
                        className="px-6 py-2 bg-primary/20 text-primary rounded-xl font-bold hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </form>
                {!isRunning && (
                    <p className="text-xs text-gray-500 mt-2">
                        Server must be running to send commands
                    </p>
                )}
            </div>
        </div>
    );
}

export default ServerDetails;