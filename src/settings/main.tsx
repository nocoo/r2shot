import React from "react";
import ReactDOM from "react-dom/client";
import { Settings } from "./Settings";

const root = document.getElementById("root");
if (!root) throw new Error("root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Settings />
  </React.StrictMode>,
);
