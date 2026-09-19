import { useEffect, useState } from 'react';

const KEY = 'metroHistoryDarkMode';

export default function useDarkMode(): [boolean, () => void] {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(
        () => localStorage.getItem(KEY) === 'true',
    );

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    const toggle = () => {
        localStorage.setItem(KEY, String(!isDarkMode));
        setIsDarkMode(!isDarkMode);
    };

    return [isDarkMode, toggle];
}
