import darkModeIcon from '../assets/dark.svg';
import lightModeIcon from '../assets/light.svg';
import useDarkMode from '../hooks/useDarkMode';

export default function Theme() {
    const [isDarkMode, toggleDarkMode] = useDarkMode();

    return (
        <button
            type="button"
            aria-label="Toggle dark mode"
            onClick={toggleDarkMode}
            className="zoom-btn pointer-events-auto cursor-pointer rounded-full"
        >
            {isDarkMode ? (
                <img src={lightModeIcon} alt="Light mode" className="icon h-4 w-4" />
            ) : (
                <img src={darkModeIcon} alt="Dark mode" className="icon h-4 w-4" />
            )}
        </button>
    );
}
