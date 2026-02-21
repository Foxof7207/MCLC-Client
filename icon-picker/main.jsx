/**
 * Icon Picker Extension
 */
export const activate = (api) => {
    const IconPicker = ({ context }) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const instanceName = context?.instanceName;

        const handleSelectIcon = async (icon) => {
            try {
                const res = await api.ipc.invoke('set-instance-icon', { 
                    instanceName, 
                    iconData: icon 
                });
                if (res.success) {
                    api.ui.toast(`Icon updated for ${instanceName}`, 'success');
                    setIsOpen(false);
                } else {
                    api.ui.toast(`Failed to update icon: ${res.error}`, 'error');
                }
            } catch (e) {
                console.error("[IconPicker] Error selecting icon:", e);
            }
        };

        const handleUpload = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        handleSelectIcon(reader.result);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        };

        if (!instanceName) return null;

        return (
            <div className="relative" style={{ overflow: 'visible' }}>
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-white/10 rounded-xl border border-white/5 transition-all shadow-lg group"
                >
                    <div className="w-5 h-5 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-gray-300 font-medium text-sm">Pick Icon</span>
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                        <div className="absolute top-full left-0 mt-2 p-5 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl z-50 w-72 animate-in fade-in slide-in-from-top-2 border-b-primary/30">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Default Icons</div>
                            <div className="grid grid-cols-4 gap-3 mb-5">
                                {DEFAULT_ICONS.map(icon => (
                                    <button
                                        key={icon.name}
                                        onClick={() => handleSelectIcon(icon.data)}
                                        className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-primary/20 hover:scale-110 rounded-xl transition-all border border-white/5 group"
                                        title={icon.name}
                                    >
                                        <img src={icon.data} alt={icon.name} className="w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                            
                            <div className="space-y-2">
                                <button 
                                    onClick={handleUpload}
                                    className="w-full py-2.5 bg-white/5 text-gray-300 font-bold rounded-xl hover:bg-white/10 hover:text-white border border-white/5 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <span>Upload Custom</span>
                                </button>
                                
                                <button 
                                    onClick={() => handleSelectIcon(null)}
                                    className="w-full py-2.5 bg-red-500/10 text-red-500 font-bold rounded-xl hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Remove Icon</span>
                                </button>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-white/5 text-[9px] text-gray-600 text-center uppercase tracking-tighter">
                                Changes apply immediately to sidebar
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    api.ui.registerView('instance.details', IconPicker);
};

const DEFAULT_ICONS = [
    { name: 'Sword', data: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmNGIzYTIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTQuNSA5IDIyIDEuNSIvPjxwYXRoIGQ9Im0xNS44IDExLjMgNC43IDQuN3EuNy43LjcgMS43dC0uNyAxLjdsLTEuMiAxLjJxLS43LjctMS43Ljd0LTEuNy0uN2wtNC43LTQuNyIvPjxwYXRoIGQ9Ik0xMSAyMCAyIDExIi8+PHBhdGggZD0ibTEzIDE4LTktOSIvPjxwYXRoIGQ9Ik0xNSAxNiA2IDciLz48cGF0aCBkPSJNOSA3IDcgOSIvPjxwYXRoIGQ9Im01IDExIDIgMiIvPjwvc3ZnPg==' },
    { name: 'Pickaxe', data: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmYmJmMjQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtMTQuNSA4IDcuNS03LjUiLz48cGF0aCBkPSJNMTYgMiBzIDIgMiAyIDUgbCAtNyA3IGwgLTIgLTIgbCA3IC03IHMgLTMgMCAtNSAtMiIvPjxwYXRoIGQ9Ik0zIDIxIGwgNSAtNSIvPjxwYXRoIGQ9Ik0zIDExIGwgMyAzIGwgNCAtNCBsIC0zIC0zIGwgLTQgNCBaIi8+PC9zdmc+' },
    { name: 'Axe', data: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmODcxNzEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtMTQgMTIgLTggNSBsIC0yIC0yIGwgNSAtOCBaIi8+PHBhdGggZD0ibTIwIDQgLTggOCIvPjxwYXRoIGQ9Ik03IDEwIGMgMCAtMSAyIC0zIDUgLTMgcyA0IDIgNSA1IHMgLTIgNSAtNSA1IHMgLTUgLTIgLTUgLTViIi8+PC9zdmc+' },
    { name: 'Creeper', data: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0YWRlODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIi8+PHBhdGggZD0iTTggOUg5VjEwSDhaTTE1IDlIMTZWMTBIOTVaTTkgMTNIMTVWMTZIOSBaTTEyIDEzVjE1WiIvPjwvc3ZnPg==' },
    { name: 'Diamond', data: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2MGExZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtNiAzIDIxMiA5IDktOS05LTktOVoiLz48cGF0aCBkPSJNMTEgMyAxMiAyMSIvPjxwYXRoIGQ9Ik03IDggMTcgOCIvPjwvc3ZnPg==' },
    { name: 'Heart', data: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmMTQ2Njc5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE5IDcuNWMwLTIuNy0yLjMtNS01LTUtMS43IDAtMy4xIDEuMS0zLjggMi41LS43LTEuNC0yLjEtMi41LTMuOC0yLjUtMi43IDAtNSA0LTMgNi43IDAgNS41IDkgMTEuOCA5IDExLjhzIDkgNi4zIDkgMTEuOGMwLTIuNy0yLjMtNi43LTUtNi43WiIvPjwvc3ZnPg==' },
    { name: 'Compass', data: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNhMWExYTEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxwYXRoIGQ9Im0xNi4yIDcuOC0yIDEuNCA0LjhMMTcgNy44eiIvPjwvc3ZnPg==' },
    { name: 'Redstone', data: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNlZjQ0NDQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTEgNCAxMiAzIDEzIDQiLz48cGF0aCBkPSJNNCAxMSAzIDEyIDQgMTMiLz48cGF0aCBkPSJNMjAgMTEgMjEgMTIgMjAgMTMiLz48cGF0aCBkPSJNMTEgMjAgMTIgMjEgMTMgMjAiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0Ii8+PC9zdmc+' },
];
