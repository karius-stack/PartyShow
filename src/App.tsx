import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminRoot } from './admin/AdminRoot.tsx';
import { ScreenRoot } from './screen/ScreenRoot.tsx';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScreenRoot />} />
        <Route path="/admin" element={<AdminRoot />} />
      </Routes>
    </BrowserRouter>
  );
}
