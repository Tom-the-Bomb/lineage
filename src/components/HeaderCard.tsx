import { Link } from 'react-router-dom';
import type { SystemConfig } from '../systems';

export default function HeaderCard({ config }: { config: SystemConfig }) {
    return (
        <div className="panel flex max-w-xs flex-col gap-1.5 px-4 py-3">
            <div className="text-2xs flex items-center gap-2 font-mono tracking-wide">
                {config.logos.map(logo => (
                    <img src={logo} alt="" className="h-4 w-4 object-contain" />
                ))}
                <span className="text-ink-faint">system:</span>
                <h1 className="text-ink font-medium">{config.title}</h1>
            </div>
            <h2 className="flex items-baseline gap-2 leading-none">
                <span className="text-ink-faint font-mono text-sm">//</span>
                <span
                    className="font-zh text-ink text-xl font-medium tracking-[0.12em]"
                    lang="zh-Hans"
                >
                    {config.localTitle}
                </span>
            </h2>
            <p className="text-ink-muted text-xs">{config.description}</p>
            <div className="meta flex items-center gap-3 pt-1">
                <span>
                    {config.minDate.getUTCFullYear()} → {config.maxDate.getUTCFullYear()}
                </span>
                <Link
                    to={'/'}
                    className="decoration-rule hover:text-ink pointer-events-auto
                        underline-offset-4"
                >
                    view more →
                </Link>
            </div>
        </div>
    );
}
