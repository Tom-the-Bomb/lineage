import { Link } from 'react-router-dom';
import type { SystemConfig } from '../systems';

export default function HeaderCard({ config }: { config: SystemConfig }) {
    return (
        <div className="panel max-w-xs px-4 py-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-mono text-2xs tracking-wide">
                <img
                    src={config.logo}
                    alt=""
                    className="h-4 w-4 object-contain"
                />
                <span className="text-ink-faint">system:</span>
                <h1 className="font-medium text-ink">{config.title}</h1>
            </div>
            <h2 className="flex items-baseline gap-2 leading-none">
                <span className="font-mono text-sm text-ink-faint">//</span>
                <span
                    className="font-zh text-xl font-medium tracking-[0.12em] text-ink"
                    lang="zh-Hans"
                >
                    {config.chineseTitle}
                </span>
            </h2>
            <p className="text-xs text-ink-muted">{config.description}</p>
            <div className="meta flex items-center gap-3 pt-1">
                <span>
                    {config.minDate.getUTCFullYear()} →{' '}
                    {config.maxDate.getUTCFullYear()}
                </span>
                <Link
                    to={'/'}
                    className="pointer-events-auto decoration-rule underline-offset-4 hover:text-ink"
                >
                    view more →
                </Link>
            </div>
        </div>
    );
}
