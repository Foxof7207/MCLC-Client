/**
 * Stats Monitor Extension
 * Demonstrates the new Extension API including IPC and Launcher stats.
 */
export const activate = (api) => {
    api.ui.registerView('instance.details', StatsMonitor);
};

const StatsMonitor = ({ context }) => {
    const [stats, setStats] = React.useState(null);
    const api = window.MCLC_API;

    React.useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const processes = await api.launcher.getActiveProcesses();
                const targetProcesses = context?.instanceName
                    ? processes.filter(p => p.name === context.instanceName)
                    : processes;

                if (targetProcesses.length > 0) {
                    const statsData = await Promise.all(targetProcesses.map(async p => {
                        const s = await api.launcher.getProcessStats(p.pid);
                        return { ...p, ...s };
                    }));
                    setStats(statsData[0] || null);
                } else {
                    setStats(null);
                }
            } catch (e) {
                console.error("Failed to fetch stats", e);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [context]);

    // Always render, but dim if offline
    const isOffline = !stats;
    const cpuDisplay = isOffline ? '-' : `${stats.cpu}%`;
    const memDisplay = isOffline ? '-' : `${stats.memory} MB`;

    return (
        <div className={`flex items-center gap-4 px-4 py-3 rounded-2xl border border-white/5 text-sm shadow-xl flex-none transition-all duration-300 ${isOffline ? 'bg-surface/50 opacity-50' : 'bg-surface'}`}>
            <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isOffline ? 'text-gray-500' : 'text-primary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span className="text-gray-300 font-medium">CPU:</span>
                <span className="font-mono text-white tracking-widest">{cpuDisplay}</span>
            </div>
            <div className="w-px h-6 bg-white/10"></div>
            <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isOffline ? 'text-gray-500' : 'text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span className="text-gray-300 font-medium">RAM:</span>
                <span className="font-mono text-white tracking-widest">{memDisplay}</span>
            </div>
            {isOffline && <span className="text-xs text-gray-500 ml-2 uppercase tracking-widest font-bold">Offline</span>}
        </div>
    );
};
