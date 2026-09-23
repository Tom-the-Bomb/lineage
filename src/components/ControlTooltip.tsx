import type { CSSProperties, ReactNode } from 'react';

interface ControlTooltipProps {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
}

export default function ControlTooltip({ children, className = '', style }: ControlTooltipProps) {
    return (
        <span
            role="tooltip"
            className={`tooltip control-tip group-hover:opacity-100 group-focus-visible:opacity-100
                ${className}`}
            style={style}
        >
            {children}
            <span
                className="tooltip-arrow top-full left-1/2 -mt-1 -translate-x-1/2 border-r border-b"
            />
        </span>
    );
}
