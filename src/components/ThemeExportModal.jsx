import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function ThemeExportModal({ onClose, onExport }) {
    const { t } = useTranslation();
    const [name, setName] = useState('');

    const handleExport = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onExport(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#151515] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                <form onSubmit={handleExport}>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-2">{t('styling.export')}</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            {t('styling.export_desc', 'Enter a name for your theme before exporting.')}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">
                                    {t('styling.theme_name', 'Theme Name')}
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                                    placeholder={t('styling.enter_name', 'My Awesome Theme')}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={32}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white/5 border-t border-white/5 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium text-sm"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed font-bold text-black transition-colors shadow-lg shadow-primary/20"
                        >
                            {t('styling.export', 'Export')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ThemeExportModal;
