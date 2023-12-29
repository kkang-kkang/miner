import { Box, Text, useToast } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import Info from "../Info/Info";
import { initializeNode, networkListener } from "../LoadWasm/dependency";
import { setMinerAddress } from "../LoadWasm/event/dispatchers";
import { EventType, IDEvent } from "../LoadWasm/network/event";
import { Terminale } from "../Terminal/Terminal";
import "./App.css";

export default function App(props: { nickname: string; addr: string; token: string }) {
  const [canProceed, setCanProceed] = useState<boolean>(false);

  const toast = useToast({ isClosable: true, position: "top", duration: 3000 });

  useEffect(() => {
    setMinerAddress(props.addr);
    initializeNode(props.nickname, props.token).then(() => setCanProceed(true));

    networkListener.attachListener(EventType.TX_CREATED, (event: IDEvent<Transaction>) => {
      toast({
        status: "info",
        title: "Transaction Added",
        description: (
          <Text textOverflow={"ellipsis"} overflow={"hidden"} whiteSpace={"nowrap"}>
            Hash: {event.data.hash}
          </Text>
        ),
      });
    });
    networkListener.attachListener(EventType.BLOCK_CREATED, (block: Block) => {
      toast({
        status: "success",
        title: "Block Added",
        description: (
          <Text textOverflow={"ellipsis"} overflow={"hidden"} whiteSpace={"nowrap"}>
            Hash: {block.header.curHash}
          </Text>
        ),
      });
    });
  }, []);

  return (
    <>
      <Box width={"100%"} height={"100%"} display={"flex"} justifyContent={"space-between"} p={5}>
        <Terminale canProceed={canProceed} />
        <Info canProceed={canProceed} addr={props.addr} nickname={props.nickname} />
      </Box>
    </>
  );
}
