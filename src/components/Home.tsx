import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="flex flex-col gap-4">
            <Link to="/sh">Shanghai Metro</Link>
            <Link to="/mtr">MTR</Link>
            <Link to="/tp">Taipei Metro</Link>
        </div>
    );
}
