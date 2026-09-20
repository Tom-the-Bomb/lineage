import { Routes, Route } from 'react-router-dom';
import InteractiveMap from './components/Map';
import Mtr from './components/articles/Mtr';
import Home from './components/Home';

import { systemKeys } from './systems';

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            {systemKeys.map(systemKey => (
                <Route
                    key={systemKey}
                    path={`/${systemKey}`}
                    element={<InteractiveMap system={systemKey} key={systemKey} />}
                />
            ))}
            <Route path="/mtr/article" element={<Mtr />} />
        </Routes>
    );
}
