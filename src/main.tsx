import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { inTauri } from "@/lib/backend";
import { useGame } from "@/store/gameStore";
import "./styles.css";

if (!inTauri) document.body.classList.add("browser");

void useGame
  .getState()
  .init()
  .then(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
