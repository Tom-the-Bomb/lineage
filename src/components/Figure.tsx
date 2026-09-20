export default function Figure({ value, label }: { value: string | number; label: string }) {
    return (
        <div>
            <div className="text-lg leading-tight font-semibold tabular-nums">{value}</div>
            <div className="text-3xs text-ink-faint tracking-wider uppercase">{label}</div>
        </div>
    );
}
