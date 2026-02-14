import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import LoadingOverlay from '../components/LoadingOverlay';

function ServerDetails({ server, onBack, runningInstances, onServerUpdate }) {
    const { addNotification } = useNotification();
    const [consoleLog, setConsoleLog] = useState([]);
    const [command, setCommand] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [serverStats, setServerStats] = useState({
        cpu: 0,
        memory: 0,
        players: []
    });

    useEffect(() => {
        // Load console history
        loadConsoleLog();

        // Subscribe to console output
        const removeListener = window.electronAPI.onServerConsoleOutput(({ serverName, line }) => {
            if (serverName === server.name) {
                setConsoleLog(prev => [...prev, line].slice(-100)); // Keep last 100 lines
            }
        });

        // Subscribe to server stats
        const removeStatsListener = window.electronAPI.onServerStats(({ serverName, stats }) => {
            if (serverName === server.name) {
                setServerStats(stats);
            }
        });

        return () => {
            if (removeListener) removeListener();
            if (removeStatsListener) removeStatsListener();
        };
    }, [server.name]);

    const loadConsoleLog = async () => {
        const log = await window.electronAPI.getServerConsole(server.name);
        setConsoleLog(log || []);
    };

    const handleSendCommand = async (e) => {
        e.preventDefault();
        if (!command.trim()) return;

        await window.electronAPI.sendServerCommand(server.name, command);
        setCommand('');
    };

    const handleStart = async () => {
        setIsLoading(true);
        await window.electronAPI.startServer(server.name);
        addNotification(`Starting server ${server.name}...`, 'info');
        setIsLoading(false);
    };

    const handleStop = async () => {
        setIsLoading(true);
        await window.electronAPI.stopServer(server.name);
        addNotification(`Stopping server ${server.name}...`, 'info');
        setIsLoading(false);
    };

    const handleRestart = async () => {
        setIsLoading(true);
        await window.electronAPI.restartServer(server.name);
        addNotification(`Restarting server ${server.name}...`, 'info');
        setIsLoading(false);
    };

    const status = runningInstances[server.name] || 'stopped';
    const isRunning = status === 'running';
    const isStarting = status === 'starting';
    const isStopping = status === 'stopping';

    return (
        <div className="h-full flex flex-col">
            {isLoading && <LoadingOverlay message="Processing..." />}

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
                            isStarting ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' :
                                isStarting ? 'bg-yellow-500 animate-pulse' :
                                    'bg-gray-500'
                            }`}></div>
                        {isRunning ? 'Running' : isStarting ? 'Starting...' : isStopping ? 'Stopping...' : 'Stopped'}
                    </div>

                    {!isRunning && !isStarting && !isStopping && (
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
            <div className="grid grid-cols-3 gap-4 p-6 border-b border-white/5">
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
                    <div className="text-2xl font-bold text-white">{serverStats.cpu || 0}%</div>
                </div>
                <div className="bg-surface/40 rounded-xl p-4">
                    <div className="text-gray-400 text-sm mb-1">Memory Usage</div>
                    <div className="text-2xl font-bold text-white">
                        {Math.round((serverStats.memory || 0) / 1024 / 1024)} MB
                    </div>
                </div>
            </div>

            {/* Console */}
            <div className="flex-1 p-6 flex flex-col min-h-0">
                <h2 className="text-lg font-bold text-white mb-3">Console</h2>
                <div className="flex-1 bg-black/40 rounded-xl p-4 font-mono text-sm overflow-y-auto custom-scrollbar mb-4">
                    {consoleLog.map((line, i) => (
                        <div key={i} className="text-gray-300 whitespace-pre-wrap mb-1">
                            {line}
                        </div>
                    ))}
                    {consoleLog.length === 0 && (
                        <div className="text-gray-500 italic">No console output yet</div>
                    )}
                </div>

                <form onSubmit={handleSendCommand} className="flex gap-2">
                    <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="Enter command..."
                        className="flex-1 bg-background border border-white/10 rounded-xl px-4 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        disabled={!isRunning}
                    />
                    <button
                        type="submit"
                        disabled={!isRunning || !command.trim()}
                        className="px-6 py-2 bg-primary/20 text-primary rounded-xl font-bold hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ServerDetails;