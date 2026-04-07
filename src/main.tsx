import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

async function disableLegacyCaching() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn("Falha ao limpar cache legado do app", error);
  }
}

void disableLegacyCaching();

createRoot(document.getElementById("root")!).render(<App />);
