import { Box, ChakraProvider } from "@chakra-ui/react";
import { createRoot } from "react-dom/client";
import { LoadWasm } from "./components/LoadWasm";
import PreEnter from "./components/PreEnter/PreEnter";
import "./index.css";

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <ChakraProvider>
    <Box
      height={"100vh"}
      bgColor={"#1F2428"} /* bgGradient={"linear(to-t, green.500, blue.700)" } */
    >
      <LoadWasm>
        <PreEnter />
      </LoadWasm>
    </Box>
  </ChakraProvider>,
);
