import React from "react";
import { createRoot } from "react-dom/client";
import JPBridge from "./JPBridge.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <JPBridge />
  </React.StrictMode>
);
