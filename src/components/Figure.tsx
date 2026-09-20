export default function Figure({
    value,
    label,
}: {
    value: string | number;
    label: string;
}) {
    return (
        <div>
            <div className="text-lg font-semibold leading-tight tabular-nums">
                {value}
            </div>
            <div className="text-3xs uppercase tracking-wider text-ink-faint">
                {label}
            </div>
        </div>
    );
}
