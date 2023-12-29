import { Box, Card, Code, Tab, TabList, TabPanel, TabPanels, Tabs, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { networkBrowser } from "../LoadWasm/dependency";

export function TxStat(props: { blockBody: BlockBody }) {
  const {
    blockBody: { coinbaseTxHash, txHashes },
  } = props;

  const [coinbaseTx, setCoinbaseTx] = useState<Transaction | null>(null);
  const [txs, setTxs] = useState<(Transaction | null)[]>([]);

  useEffect(() => {
    networkBrowser.fetchTransaction(coinbaseTxHash).then(setCoinbaseTx);
    txHashes.forEach(async (hash) => {
      const tx = await networkBrowser.fetchTransaction(hash);
      setTxs((txs) => [...txs, tx]);
    });
  }, []);

  return (
    <Box>
      <Tabs variant={"enclosed"} position={"relative"}>
        <TabList>
          <Tab width={"100px"} isDisabled={coinbaseTx == null}>
            <Text
              fontSize={"12px"}
              width={"100%"}
              textOverflow={"ellipsis"}
              overflow={"hidden"}
              whiteSpace={"nowrap"}
            >
              coinbase
            </Text>
          </Tab>
          {txHashes.map((hash, idx) => (
            <Tab width={"100px"} isDisabled={txs[idx] == null}>
              <Text
                fontSize={"12px"}
                width={"100%"}
                textOverflow={"ellipsis"}
                overflow={"hidden"}
                whiteSpace={"nowrap"}
              >
                {hash}
              </Text>
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {[coinbaseTx, ...txs].map((tx) =>
            tx == null ? (
              <TabPanel></TabPanel>
            ) : (
              <TabPanel>
                <Box>
                  <Code
                    fontSize={"16px"}
                    width={"100%"}
                    textOverflow={"ellipsis"}
                    overflow={"hidden"}
                    whiteSpace={"nowrap"}
                  >
                    HASH: {tx.hash}
                  </Code>
                  <Text>timestamp: {tx.createdAt}</Text>
                </Box>
                <Box mt={2}>
                  <Text fontSize={"16px"}>inputs</Text>
                  <Box mt={2} display={"flex"} gap={2} overflowX={"scroll"}>
                    {tx.inputs.map((input) => (
                      <Card
                        my={1}
                        p={1}
                        minWidth={"65px"}
                        maxWidth={"120px"}
                        overflow={"hidden"}
                        display={"-webkit-box"}
                        style={{ WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}
                      >
                        {input.sig || "COINBASE"}
                      </Card>
                    ))}
                  </Box>
                </Box>
                <Box mt={2}>
                  <Text fontSize={"16px"}>outputs</Text>
                  <Box display={"flex"} mt={2} gap={2}>
                    <Card p={2} width={"50%"} height={"50px"} fontSize={"14px"}>
                      <Text
                        width={"90%"}
                        textOverflow={"ellipsis"}
                        overflow={"hidden"}
                        whiteSpace={"nowrap"}
                      >
                        to: {tx.outputs[0].addr}
                      </Text>
                      <Text
                        width={"50%"}
                        textOverflow={"ellipsis"}
                        overflow={"hidden"}
                        whiteSpace={"nowrap"}
                      >
                        amount: {tx.outputs[0].amount}
                      </Text>
                    </Card>

                    {tx.outputs.length > 1 ? (
                      <Card width={"50%"} p={2} height={"50px"} fontSize={"14px"}>
                        <Text
                          width={"90%"}
                          textOverflow={"ellipsis"}
                          overflow={"hidden"}
                          whiteSpace={"nowrap"}
                        >
                          to: {tx.outputs[1].addr}
                        </Text>
                        <Text
                          width={"50%"}
                          textOverflow={"ellipsis"}
                          overflow={"hidden"}
                          whiteSpace={"nowrap"}
                        >
                          amount: {tx.outputs[1].amount}
                        </Text>
                      </Card>
                    ) : (
                      <></>
                    )}
                  </Box>
                </Box>
              </TabPanel>
            ),
          )}
        </TabPanels>
      </Tabs>
    </Box>
  );
}
