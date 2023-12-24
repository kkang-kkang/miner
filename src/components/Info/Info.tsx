import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { networkBrowser, networkListener, networkManager } from "../LoadWasm/dependency";
import { PeerInfo } from "../LoadWasm/network";
import { EventType } from "../LoadWasm/network/event";
import Monitor from "../Monitor/Monitor";

export default function Info(props: { canProceed: boolean; nickname: string; addr: string }) {
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [headHash, setHeadHash] = useState<string>("");
  const [blockCount, setBlockCount] = useState<number>(0);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [sid, setSid] = useState<string>("");

  useEffect(() => {
    networkListener.attachListener(EventType.PEER_CONNECTED, (sid: string) => {
      networkBrowser.fetchPeer(sid).then((peer) => {
        setPeers((peers) => [...peers, peer]);
      });
    });
    networkListener.attachListener(EventType.PEER_DISCONNECTED, (sid: string) => {
      setPeers((peers) => peers.filter((peer) => peer.sid !== sid));
    });
    networkListener.attachListener(EventType.BLOCK_CREATED, (_: Block) => {
      networkBrowser.fetchBlockHeadHash().then(setHeadHash);
      networkBrowser.fetchBlockCount().then(setBlockCount);
    });
  }, []);

  useEffect(() => {
    if (props.canProceed || isCloning) {
      networkBrowser.fetchBlockHeadHash().then(setHeadHash);
      networkBrowser.fetchBlockCount().then(setBlockCount);
      setSid(networkBrowser.fetchSid());
    }
  }, [props.canProceed, isCloning]);

  return (
    <Box
      //   opacity={"0.9"}
      bg={"#252A33"}
      width={"550px"}
      borderRadius={"15px"}
      px={6}
      py={10}
      fontFamily={"monospace"}
    >
      <Stack width={"100%"} height={"100%"}>
        <Box height={"280px"} display={"flex"} flexDir={"column"} justifyContent={"space-between"}>
          <Box>
            <Stat mb={5} color={"#ECECEC"}>
              <StatLabel fontSize={"20px"}>head</StatLabel>
              <StatNumber
                width={"500px"}
                textOverflow={"ellipsis"}
                overflow={"hidden"}
                whiteSpace={"nowrap"}
              >
                {headHash}
              </StatNumber>
              <StatHelpText>height: {blockCount}</StatHelpText>
            </Stat>
            <Box display={"flex"} flexDir={"row"}>
              <Stat color={"#ECECEC"}>
                <StatLabel fontSize={"16px"}>nickname</StatLabel>
                <StatNumber
                  fontSize={"20px"}
                  width={"190px"}
                  textOverflow={"ellipsis"}
                  overflow={"hidden"}
                  whiteSpace={"nowrap"}
                >
                  {props.nickname ? props.nickname : "<anonymous>"}
                </StatNumber>
                <StatHelpText
                  fontSize={"12px"}
                  width={"190px"}
                  textOverflow={"ellipsis"}
                  overflow={"hidden"}
                  whiteSpace={"nowrap"}
                >
                  id: {sid}
                </StatHelpText>
              </Stat>
              <Stat color={"#ECECEC"} left={-10}>
                <StatLabel fontSize={"16px"}>public key</StatLabel>
                <StatNumber
                  fontSize={"20px"}
                  width={"250px"}
                  textOverflow={"ellipsis"}
                  overflow={"hidden"}
                  whiteSpace={"nowrap"}
                >
                  {props.addr}
                </StatNumber>
              </Stat>
            </Box>
          </Box>

          <Box color={"#ECECEC"} fontSize={"20px"}>
            current: {peers.length} node{peers.length === 1 ? "" : "s"}
          </Box>
        </Box>
        <Stack height={"75%"} py={3} borderY={"1px"} borderColor={"#595969"} overflow={"scroll"}>
          {peers.map((peer) => {
            return (
              <Card>
                <CardHeader height={"20px"}>
                  <Code>nickname: {peer.nickname}</Code>
                </CardHeader>
                <CardBody>
                  <Box>ip: {peer.ip}</Box>
                  <Box>unique id: {peer.sid}</Box>
                  <Box>{peer.location?.city}</Box>
                </CardBody>
              </Card>
            );
          })}
        </Stack>
        <Box py={6} display={"flex"} justifyContent={"space-evenly"}>
          <Monitor canProceed={props.canProceed} isCloning={isCloning} />
          <Button
            variant={"outline"}
            colorScheme={"telegram"}
            isDisabled={!props.canProceed || isCloning || peers.length === 0}
            onClick={() => {
              setIsCloning(true);
              networkManager.cloneBlockchain().then(() => {
                setIsCloning(false);
              });
            }}
          >
            sync db
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
