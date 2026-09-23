import { Link } from 'react-router-dom';
import { systemKeys, systems } from '../systems';

export default function Home() {
    return (
        <div className="grid grid-cols-2">
            {systemKeys.map(key => (
                <Link
                    key={key}
                    to={`/${key}`}
                    className="flex flex-col items-center justify-center gap-2 border
                        border-gray-300 p-4 text-center transition hover:bg-gray-100"
                >
                    <img src={systems[key].logos[0]} alt={systems[key].title} className="h-16" />
                    <h2 className="text-lg font-semibold">{systems[key].title}</h2>
                    <p className="text-sm text-gray-600">{systems[key].description}</p>
                </Link>
            ))}
        </div>
    );
}
