import React from "react";
import { createRoot } from "react-dom/client";
import NovoProblema from "./Pages/NovoProblema";
import "../css/app.css";

createRoot(document.getElementById("app")).render(
    <React.StrictMode>
        <NovoProblema />
    </React.StrictMode>
);
