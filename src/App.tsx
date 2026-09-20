import { Route, Routes } from 'react-router-dom';
import Mtr from './components/articles/Mtr';
import Home from './components/Home';
import InteractiveMap from './components/Map';

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
