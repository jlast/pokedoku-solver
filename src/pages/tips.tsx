import { createRoot } from 'react-dom/client';
import { TipsApp } from '../pages/TipsApp';
import '../pages/App.css';
import '../index.css';

const root = createRoot(document.getElementById('root')!);
root.render(<TipsApp />);