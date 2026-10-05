import { useState } from 'react';

const KEY = 'metroHistoryDarkMode';

export default function useDarkMode(): [boolean, () => void] {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(
        () => localStorage.getItem(KEY) === 'true',
    );

    const toggle = () => {
        const root = document.documentElement;
        root.classList.toggle('dark', !isDarkMode);
        document
            .querySelector('meta[name="theme-color"]')!
            .setAttribute('content', getComputedStyle(root).getPropertyValue('--color-paper'));
        localStorage.setItem(KEY, String(!isDarkMode));
        setIsDarkMode(!isDarkMode);
    };

    return [isDarkMode, toggle];
}
