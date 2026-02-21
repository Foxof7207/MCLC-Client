const manifest = {
    "id": "example-extension",
    "name": "HelloWorld",
    "version": "1.0.0",
    "description": "A starter extension that shows a simple greeting.",
    "entry": "index.jsx",
    "author": "MCLC Team"
};
/**
 * Entry point for the extension.
 *
 * Instead of exporting a React component directly, you now export a `register` function.
 * This function receives an `api` object that allows you to interact with the host application.
 *
 * @param {object} api - The MCLC Extension API
 */
export const register = (api) => {
    api.registerView('sidebar.bottom', ExtensionSidebarItem);
};

const ExtensionSidebarItem = () => {
    const [toggled, setToggled] = React.useState(false);

    return (
        <div
            style={{
                padding: '10px',
                background: toggled ? 'rgba(34, 224, 122, 0.2)' : 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '0.8rem',
                border: toggled ? '1px solid #22e07a' : '1px solid transparent',
                transition: 'all 0.2s'
            }}
            onClick={() => setToggled(!toggled)}
        >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>EXT MENU</div>
            {toggled ? 'Active' : 'Click Me'}
        </div>
    );
};