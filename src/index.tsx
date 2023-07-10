import ReactDOM from "react-dom/client";
import { LoadWasm } from "./LoadWasm";
import "./index.css";
import App from "./App";
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <LoadWasm>
    <App />
  </LoadWasm>
);
