import { useCallback, useEffect, useRef, useState } from 'react';

export default function useScrollOverflow(count: number, visible: boolean) {
    const listRef = useRef<HTMLDivElement>(null);
    const hintRef = useRef<HTMLDivElement>(null);
    const [overflowing, setOverflowing] = useState(false);
    const [hiddenBelow, setHiddenBelow] = useState(0);

    const measure = useCallback(() => {
        const el = listRef.current;
        if (!el) {
            return;
        }

        const height = el.firstElementChild!.clientHeight;
        const remaining = height - el.scrollTop - el.clientHeight;

        setOverflowing(height > el.clientHeight + (hintRef.current?.offsetHeight ?? 0) + 1);
        setHiddenBelow(height ? Math.max(0, Math.round((remaining / height) * count)) : 0);
    }, [count]);

    useEffect(() => {
        const el = listRef.current;
        if (!el) {
            return;
        }
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        observer.observe(el.firstElementChild!);
        return () => observer.disconnect();
    }, [measure, visible]);

    return { listRef, hintRef, measure, overflowing, hiddenBelow };
}
