import { usePlayer } from './PlayerContext';

const NAV_ITEMS = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'library', icon: '📚', label: 'Library' },
];

export default function MobileNav() {
    const { activeView, setActiveView } = usePlayer();

    return (
        <nav className="mobile-bottom-nav">
            {NAV_ITEMS.map(item => (
                <button
                    key={item.id}
                    className={`mobile-nav-item ${activeView === item.id ? 'active' : ''}`}
                    onClick={() => setActiveView(item.id)}
                >
                    <span className="mobile-nav-icon">{item.icon}</span>
                    <span className="mobile-nav-label">{item.label}</span>
                </button>
            ))}
        </nav>
    );
}
