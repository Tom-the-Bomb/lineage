import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import arrowUpRight from '../assets/arrow-up-right.svg';
import type { ChangelogEvent } from '../schemas';
import { systemKeys, systems } from '../systems';
import { formatDate } from '../utils';
import Theme from './Theme';

const previews = import.meta.glob<string>('../assets/*/preview.svg', {
    eager: true,
    query: '?url',
    import: 'default',
});

function MilestonePreview({ events }: { events: ChangelogEvent[] }) {
    const entries = events.map(({ date, descriptions }) => (
        <li key={date}>
            <time dateTime={date} className="meta">
                {formatDate(new Date(date))}
            </time>
            <p className="text-ink-muted mt-2 text-xs leading-relaxed">
                {descriptions.join(' · ')}
            </p>
        </li>
    ));

    return (
        <div className="home-history">
            <div className="home-history-window">
                <div className="home-history-track">
                    <ol>{entries}</ol>
                    <ol aria-hidden="true">{entries}</ol>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    const atlasRef = useRef<HTMLElement>(null);

    useEffect(() => {
        document.title = 'Lineage';
        document.body.style.overflow = '';

        const links = atlasRef.current!.querySelectorAll<HTMLAnchorElement>('a');
        let frame = 0;

        function updateFocus() {
            frame = 0;
            const center = window.innerHeight / 2;
            for (const link of links) {
                const rect = link.getBoundingClientRect();
                const distance = Math.abs(rect.top + rect.height / 2 - center);
                const focus = Math.max(0, 1 - distance / (window.innerHeight * 0.6));
                link.style.setProperty('--focus', String(focus));
                link.style.setProperty('--history-play-state', focus > 0 ? 'running' : 'paused');
            }
        }

        function onScroll() {
            if (!frame) {
                frame = requestAnimationFrame(updateFocus);
            }
        }

        updateFocus();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    return (
        <div className="home-page isolate mx-auto max-w-6xl px-6 sm:px-10">
            <header className="absolute top-5 right-6 z-20">
                <Theme />
            </header>
            <main className="pt-21">
                <div className="pt-6 pb-16 text-center sm:pt-10 sm:pb-20">
                    <img src="/logo.svg" alt="" className="mx-auto mb-5 size-12 sm:size-14" />
                    <h1 className="text-6xl leading-none font-semibold tracking-tight sm:text-8xl">
                        Lineage<span style={{ color: '#2563eb' }}>.</span>
                    </h1>
                    <p className="text-ink-muted mx-auto mt-5 max-w-72 text-sm leading-relaxed">
                        Every line has a beginning.
                        <br />
                        Explore the networks that shape our cities.
                    </p>
                </div>
                <section ref={atlasRef} aria-label="Choose a network" className="home-atlas">
                    {systemKeys.map(key => {
                        const system = systems[key];
                        const events = system.events.filter(event =>
                            system.milestoneDates.includes(event.date),
                        );
                        return (
                            <Link key={key} to={`/${key}`} className="home-network-link group">
                                <img
                                    src={previews[`../assets/${key}/preview.svg`]}
                                    alt=""
                                    className="home-network-art"
                                />
                                <div
                                    className="border-rule-strong/60 relative mt-4 flex items-center
                                        gap-3 border-t pt-4"
                                >
                                    <div className="flex gap-1.5">
                                        {system.logos.map(logo => (
                                            <img
                                                key={logo}
                                                src={logo}
                                                alt=""
                                                className="size-7 shrink-0 object-contain"
                                                style={{
                                                    width: system.logoSize,
                                                    height: system.logoSize,
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex-1">
                                        <h2
                                            className="group-hover:text-accent
                                                group-focus-visible:text-accent text-lg
                                                font-semibold tracking-tight transition-colors"
                                        >
                                            {system.name}
                                        </h2>
                                        <p className="font-zh text-ink-faint mt-1 text-xs">
                                            {system.localTitle}
                                        </p>
                                    </div>
                                    <span
                                        aria-hidden="true"
                                        className="text-ink-faint group-hover:text-accent h-7 w-5
                                            shrink-0 bg-current transition-transform
                                            group-hover:translate-x-1"
                                        style={{
                                            mask: `url("${arrowUpRight}") center / contain no-repeat`,
                                        }}
                                    />
                                </div>
                                <p className="meta mt-4 tabular-nums">
                                    {system.minDate.getUTCFullYear()} —{' '}
                                    {system.maxDate.getUTCFullYear()}
                                </p>
                                <MilestonePreview events={events} />
                            </Link>
                        );
                    })}
                </section>
            </main>
            <footer className="meta py-12 text-center">
                Lineage © 2026 · Transit through time ·{' '}
                <a className="hover:text-ink" href="https://github.com/Tom-the-Bomb/lineage">
                    GitHub
                </a>
            </footer>
        </div>
    );
}
