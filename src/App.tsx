import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminRoot } from './admin/AdminRoot.tsx';
import { ParticipantRoot } from './participant/ParticipantRoot.tsx';
import { ScreenRoot } from './screen/ScreenRoot.tsx';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScreenRoot />} />
        <Route path="/admin" element={<AdminRoot />} />
        <Route path="/join" element={<ParticipantRoot />} />
      </Routes>
    </BrowserRouter>
  );
}
