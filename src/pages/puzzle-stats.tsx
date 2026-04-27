import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PuzzleStatsApp from "./PuzzleStatsApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PuzzleStatsApp />
  </StrictMode>,
);
