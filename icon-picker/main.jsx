/**
 * Icon Picker Extension
 */
export const activate = (api) => {

    const setIconInModal = (iconData) => {
        const h2Elements = Array.from(document.querySelectorAll('h2'));
        const modal = h2Elements.find(el => el.textContent === 'Create New Instance');
        if (!modal) return;

        // Find the input element near the modal
        const container = modal.nextElementSibling;
        const fileInput = container.querySelector('input[type="file"]');
        if (!fileInput) return;

        if (!iconData) {
            return;
        }

        fetch(iconData)
            .then(res => res.blob())
            .then(blob => {
                const file = new window.File([blob], "icon.png", { type: blob.type });
                const dataTransfer = new window.DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;

                // Dispatch change event to trigger the React onChange
                const event = new window.Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);

                api.ui.toast(`Sample icon applied to new template`, 'success');
            })
            .catch(console.error);
    };

    const CreateModalIconPicker = () => {
        const [isOpen, setIsOpen] = React.useState(false);

        const handleSelectIcon = (icon) => {
            setIconInModal(icon);
            setIsOpen(false);
        };

        const handleUpload = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new window.FileReader();
                    reader.onloadend = () => {
                        handleSelectIcon(reader.result);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        };

        return (
            <div className="relative z-50">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    type="button"
                    className="p-2 bg-primary hover:bg-primary-hover text-black rounded-xl shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
                    title="Pick Icon"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </button>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                        }}></div>
                        <div
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-5 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl z-50 w-72 animate-in fade-in slide-in-from-top-2 border-b-primary/30 cursor-default"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                        >
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Default Icons</div>
                            <div className="grid grid-cols-4 gap-3 mb-5">
                                {DEFAULT_ICONS.map(icon => (
                                    <button
                                        key={icon.name}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSelectIcon(icon.data);
                                        }}
                                        type="button"
                                        className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-primary/20 hover:scale-110 rounded-xl transition-all border border-white/5 group"
                                        title={icon.name}
                                    >
                                        <img src={icon.data} alt={icon.name} className="w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleUpload();
                                    }}
                                    type="button"
                                    className="w-full py-2.5 bg-white/5 text-gray-300 font-bold rounded-xl hover:bg-white/10 hover:text-white border border-white/5 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <span>Upload Custom</span>
                                </button>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/5 text-[9px] text-gray-600 text-center uppercase tracking-tighter">
                                Changes apply immediately
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const GlobalOverlay = () => {
        React.useEffect(() => {
            let currentRoot = null;
            let currentTarget = null;

            const observer = new window.MutationObserver(() => {
                const h2Elements = Array.from(document.querySelectorAll('h2'));
                const modal = h2Elements.find(el => el.textContent === 'Create New Instance');

                if (modal) {
                    const formContainer = modal.nextElementSibling;
                    if (formContainer && formContainer.tagName === 'FORM') {
                        const iconContainer = formContainer.querySelector('div.flex.flex-col.items-center.gap-4');
                        if (iconContainer) {
                            // Find the image upload box
                            const imageBox = iconContainer.querySelector('div.group.relative.flex.h-24.w-24');
                            if (imageBox && !imageBox.querySelector('#icon-picker-injected')) {
                                const injectTarget = document.createElement('div');
                                injectTarget.id = 'icon-picker-injected';
                                injectTarget.className = 'absolute bottom-1 right-1 z-[60]';

                                imageBox.appendChild(injectTarget);

                                currentTarget = injectTarget;
                                currentRoot = window.ReactDOM.createRoot(injectTarget);
                                currentRoot.render(window.React.createElement(CreateModalIconPicker));
                            }
                        }
                    }
                } else {
                    if (currentTarget) {
                        try {
                            if (currentRoot) currentRoot.unmount();
                        } catch (e) { }
                        currentTarget = null;
                        currentRoot = null;
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
            return () => {
                observer.disconnect();
                if (currentRoot) {
                    try {
                        currentRoot.unmount();
                    } catch (e) { }
                }
            };
        }, []);

        return null;
    };

    api.ui.registerView('app.overlay', GlobalOverlay);
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
