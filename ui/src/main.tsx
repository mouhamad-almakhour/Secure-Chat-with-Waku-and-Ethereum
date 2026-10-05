import React from "react";
import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import "./styles.css";
// eciesjs expects Buffer. Set it before loading the browser chat modules.
Object.assign(globalThis, { Buffer });
void import("./App")
  .then(({ default: App }) =>
    createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  )
  .catch(() => {
    document.getElementById("root")!.textContent =
      "MA Secure Chat could not start. Reload the page to try again.";
  });
