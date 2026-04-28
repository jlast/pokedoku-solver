import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TipsApp from "./TipsApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TipsApp />
  </StrictMode>,
);
