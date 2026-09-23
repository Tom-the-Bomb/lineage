export default function Figure({ value, label }: { value: string | number; label: string }) {
    return (
        <span className="block">
            <span className="block text-lg leading-tight font-semibold tabular-nums">{value}</span>
            <span className="text-3xs text-ink-faint block tracking-wider uppercase">{label}</span>
        </span>
    );
}
