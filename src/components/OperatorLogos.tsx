import type { State } from '../schemas';
import type { SystemConfig } from '../systems';
import { isActive } from '../utils';

const LOGO_HEIGHT = 16;
const SMALL_SCALE = 0.625;

interface OperatorLogosProps {
    operators: State[];
    time: number;
    config: SystemConfig;
    small?: boolean;
}

export default function OperatorLogos({ operators, time, config, small }: OperatorLogosProps) {
    const height = (config.tooltipLogoSize ?? LOGO_HEIGHT) * (small ? SMALL_SCALE : 1);
    return (
        <>
            {operators.map(({ name, dateRange }) => {
                const logo = config.operators[name];
                return (
                    logo &&
                    isActive(dateRange, time) && (
                        <img
                            key={name}
                            src={logo.src}
                            alt={logo.alt}
                            className="max-w-none"
                            style={{ height }}
                        />
                    )
                );
            })}
        </>
    );
}
