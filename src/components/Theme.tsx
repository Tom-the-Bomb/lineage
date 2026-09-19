import useDarkMode from '../hooks/useDarkMode';
import darkModeIcon from '../assets/dark.svg';
import lightModeIcon from '../assets/light.svg';

export default function Theme({ className = '' }: { className?: string }) {
    const [isDarkMode, toggleDarkMode] = useDarkMode();

    return (
        <button
            type="button"
            aria-label="Toggle dark mode"
            onClick={toggleDarkMode}
            className={`zoom-btn rounded-full pointer-events-auto cursor-pointer ${className}`}
        >
            {isDarkMode ? (
                <img src={lightModeIcon} alt="Light mode" className="icon h-4 w-4" />
            ) : (
                <img src={darkModeIcon} alt="Dark mode" className="icon h-4 w-4" />
            )}
        </button>
    );
}
