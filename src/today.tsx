import { createRoot } from 'react-dom/client';
import { TodayApp } from './TodayApp';

const puzzle = (window as unknown as { __TODAY_PUZZLE__: unknown }).__TODAY_PUZZLE__;

const root = createRoot(document.getElementById('root')!);
root.render(<TodayApp puzzle={puzzle as Parameters<typeof TodayApp>[0]['puzzle']} />);
