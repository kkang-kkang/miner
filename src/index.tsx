import { createRoot } from "react-dom/client";
import App from "./components/App/App";
import { LoadWasm } from "./components/LoadWasm";
import "./index.css";
const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <LoadWasm>
    <App />
  </LoadWasm>,
);
