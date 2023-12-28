import { ArrowDownIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Spinner,
  Stack,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber,
  Switch,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { networkBrowser, networkListener, networkManager } from "../LoadWasm/dependency";
import { createBlock } from "../LoadWasm/event/dispatchers";
import { EventType, IDEvent } from "../LoadWasm/network/event";
import { TxStat } from "../TxStat/TxStat";

const blockPageSize = 5;

export default function Monitor(props: { canProceed: boolean; isCloning: boolean }) {
  const { isOpen: txIsOpen, onOpen: txOnOpen, onClose: txOnClose } = useDisclosure();
  const { isOpen: blockIsOpen, onOpen: blockOnOpen, onClose: blockOnClose } = useDisclosure();

  const [isMinable, setIsMinable] = useState<boolean>(false);
  const [mempoolTxs, setMempoolTxs] = useState<Transaction[]>([]);
  const [candidates, setCandidates] = useState<Map<string, Transaction>>(
    new Map<string, Transaction>(),
  );

  const [isBlockLoading, setIsBlockLoading] = useState<boolean>(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [deepestHash, setDeepestHash] = useState<string>("");
  const [hasNextPage, setNextPage] = useState<boolean>(true);

  const appendMoreBlock = async (hash?: string) => {
    const newBlocks: Block[] = [];

    let deepest = hash ?? deepestHash;

    setIsBlockLoading(true);
    for (let i = 0; i < blockPageSize; i++) {
      const block = await networkBrowser.fetchBlock(deepest).then((block) => block!);
      newBlocks.push(block);

      deepest = block.header.prevHash;

      if (block.header.curHash === "00") {
        setNextPage(false);
        break;
      }
    }

    setBlocks((blocks) => [...blocks, ...newBlocks]);
    setDeepestHash(deepest);
    setIsBlockLoading(false);
  };

  useEffect(() => {
    networkListener.attachListener(EventType.TX_CREATED, (_: IDEvent<Transaction>) => {
      networkBrowser.fetchMempool().then(setMempoolTxs);
    });

    networkListener.attachListener(EventType.BLOCK_CREATED, (block: Block) => {
      networkBrowser.fetchMempool().then(setMempoolTxs);
      networkBrowser.fetchBlock(block.header.curHash).then((block) => {
        if (block == null) return;

        setBlocks((blocks) => [block, ...blocks]);
      });
    });
  }, []);

  useEffect(() => {
    if (props.canProceed) {
      networkBrowser.fetchBlockHeadHash().then((hash) => {
        setDeepestHash(hash);
        appendMoreBlock(hash);
      });
      networkBrowser.fetchMempool().then(setMempoolTxs);
    }
  }, [props.canProceed]);

  return (
    <>
      <Button
        onClick={() => {
          txOnOpen();
          setCandidates(new Map<string, Transaction>());
        }}
        isDisabled={!props.canProceed || props.isCloning}
      >
        browse mempool
      </Button>
      <Button onClick={blockOnOpen} isDisabled={!props.canProceed || props.isCloning}>
        browse blocks
      </Button>
      <Drawer size={"sm"} isOpen={txIsOpen} placement="right" onClose={txOnClose}>
        <DrawerOverlay />
        <DrawerContent fontFamily={"monospace"} bg={"#252A33"}>
          <DrawerHeader color={"white"}>Browse Mempool</DrawerHeader>
          <DrawerBody>
            <Stack overflow={"scroll"}>
              {mempoolTxs.map((tx) => (
                <Card my={1}>
                  <CardBody>
                    <Text width={"95%"} mb={3}>
                      <Code
                        width={"100%"}
                        textOverflow={"ellipsis"}
                        overflow={"hidden"}
                        whiteSpace={"nowrap"}
                      >
                        HASH: {tx.hash}
                      </Code>
                    </Text>
                    <Box textOverflow={"ellipsis"} overflow={"hidden"} whiteSpace={"nowrap"}>
                      to:{tx.outputs[0].addr}
                    </Box>
                    <Box>input count: {tx.inputs.length}</Box>
                    <Box>amount: {tx.outputs[0].amount}</Box>
                    <Box>timestamp: {tx.createdAt}</Box>
                    <Box mt={3} display={"flex"} justifyContent={"end"} width={"100%"}>
                      <Text fontSize={15} mr={4}>
                        select tx
                      </Text>
                      <Switch
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCandidates((candidates) => candidates.set(tx.hash, tx));
                          } else {
                            setCandidates((candidates) => {
                              candidates.delete(tx.hash);
                              return candidates;
                            });
                          }
                          setIsMinable(candidates.size !== 0);
                        }}
                      ></Switch>
                    </Box>
                  </CardBody>
                </Card>
              ))}
            </Stack>
          </DrawerBody>
          <DrawerFooter height={"100px"}>
            <Button
              isDisabled={!isMinable}
              colorScheme="blue"
              onClick={() => {
                setIsMinable(false);
                txOnClose();
                const candidateHashes = Array.from(candidates.values()).map((tx) => tx.hash);
                networkListener.dispatch(EventType.CREATING_BLOCK, {});
                createBlock({ transactionHashes: candidateHashes }).then(
                  networkManager.broadcastNewBlock.bind(networkManager),
                );
                setCandidates(new Map<string, Transaction>());
              }}
            >
              mine selected transactions
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Drawer size={"lg"} isOpen={blockIsOpen} placement="right" onClose={blockOnClose}>
        <DrawerOverlay />
        <DrawerContent fontFamily={"monospace"} bg={"#252A33"}>
          <DrawerHeader color={"white"}>Browse Blocks</DrawerHeader>
          <DrawerBody
            onScroll={(event) => {
              const element = event.target as HTMLElement;
              if (element.scrollHeight - element.scrollTop <= element.clientHeight + 1) {
                if (!isBlockLoading && hasNextPage) {
                  appendMoreBlock();
                }
              }
            }}
          >
            <Stack>
              <Box display={"flex"} flexDir={"column"} alignItems={"center"} width={"100%"}>
                {blocks.map((block) => (
                  <>
                    <ArrowDownIcon my={3} w={8} h={8} color={"gray.600"} />
                    <Card my={1} width={"lg"}>
                      <CardHeader
                        height={"32px"}
                        fontSize={"16px"}
                        textOverflow={"ellipsis"}
                        overflow={"hidden"}
                        whiteSpace={"nowrap"}
                      >
                        HASH: {block.header.curHash}
                      </CardHeader>
                      <CardBody>
                        <Stack>
                          <Box>
                            <StatGroup>
                              <Stat>
                                <StatLabel fontSize={"12px"}>difficulty</StatLabel>
                                <StatNumber fontSize={"20px"}>{block.header.difficulty}</StatNumber>
                              </Stat>
                              <Stat>
                                <StatLabel color={""} fontSize={"12px"}>
                                  nonce
                                </StatLabel>
                                <StatNumber fontSize={"20px"}>{block.header.nonce}</StatNumber>
                              </Stat>
                            </StatGroup>
                            <StatGroup width={"100%"}>
                              <Stat mt={"3"} width={"50%"}>
                                <StatLabel fontSize={"12px"}>merkle root</StatLabel>
                                <StatNumber
                                  fontSize={"20px"}
                                  textOverflow={"ellipsis"}
                                  overflow={"hidden"}
                                  whiteSpace={"nowrap"}
                                >
                                  {block.header.dataHash}
                                </StatNumber>
                              </Stat>
                              <Stat mt={"3"} width={"50%"}>
                                <StatLabel fontSize={"12px"}>previous hash</StatLabel>
                                <StatNumber
                                  fontSize={"20px"}
                                  textOverflow={"ellipsis"}
                                  overflow={"hidden"}
                                  whiteSpace={"nowrap"}
                                >
                                  {block.header.prevHash}
                                </StatNumber>
                              </Stat>
                            </StatGroup>
                            <Stat mt={"3"}>
                              <StatLabel fontSize={"12px"}>timestamp</StatLabel>
                              <StatNumber fontSize={"20px"}>{block.header.timestamp}</StatNumber>
                            </Stat>
                          </Box>
                          {block.body ? <TxStat blockBody={block.body} /> : <></>}
                        </Stack>
                      </CardBody>
                    </Card>
                  </>
                ))}
              </Box>
              <Box width={"100%"} height={"50px"} display={"flex"} justifyContent={"center"}>
                {isBlockLoading ? (
                  <Spinner
                    thickness="4px"
                    speed="0.7s"
                    emptyColor="gray.400"
                    color="blue.500"
                    size="lg"
                  />
                ) : (
                  <></>
                )}
              </Box>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
