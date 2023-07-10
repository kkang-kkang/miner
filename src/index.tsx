import ReactDOM from "react-dom/client";
import { LoadWasm } from "./components/LoadWasm";
import "./index.css";
import App from "./components/App/App";
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <LoadWasm>
    <App />
  </LoadWasm>,
);
