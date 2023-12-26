import { Box, Text } from "@chakra-ui/react";
import { ReactElement, useEffect, useState } from "react";
import Terminal, { TerminalOutput } from "react-terminal-ui";
import { networkBrowser, networkListener, networkManager } from "../LoadWasm/dependency";
import { attachWasmErrorListener } from "../LoadWasm/event/dispatchers";
import { ChatPayload, EventType, IDEvent, PeerEvent } from "../LoadWasm/network/event";

const WELCOME_TEXT = `
 __    __                             __    __                      
|  |--|  |--.---.-.-----.-----.______|  |--|  |--.---.-.-----.-----.
|    <|    <|  _  |     |  _  |______|    <|    <|  _  |     |  _  |
|__|__|__|__|___._|__|__|___  |      |__|__|__|__|___._|__|__|___  |
                        |_____|                              |_____|

kkang-kkang:v1

Greetings, stranger! Welcome to the blockchain!
Feel free to choose transactions from mempool and mine them!

You can find our github repository here: https://github.com/kkang-kkang


`;

export function Terminale(props: { canProceed: boolean }) {
  const [lineData, setLineData] = useState<ReactElement[]>([
    <TerminalOutput>{WELCOME_TEXT}</TerminalOutput>,
  ]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [listenerId, setListenerId] = useState<number>(0);

  const pushLine = (line: ReactElement) => {
    setLineData((data) => [...data, line]);
  };

  useEffect(() => {
    const element = document.getElementById("terminal-items");
    element?.scrollTo(0, element.scrollHeight);
  }, [lineData]);

  const randomHexString = (): string => {
    return [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
  };

  useEffect(() => {
    if (isCreating) {
      setListenerId(
        setInterval(() => {
          setLineData((lineData) => {
            const newLindeData = [...lineData];
            newLindeData[lineData.length - 1] = (
              <TerminalOutput>{`hash: ${randomHexString()}`}</TerminalOutput>
            );
            return newLindeData;
          });
        }, 25),
      );
    } else {
      clearInterval(listenerId);
    }
  }, [isCreating]);

  useEffect(() => {
    const listenNodeEvent = (event: EventType, f: (nickname: string) => string) => {
      networkListener.attachListener(event, async (msg: PeerEvent<unknown>) => {
        const nickname = await networkBrowser.fetchNickname(msg.nickname);
        pushLine(<TerminalOutput>{f(nickname || "<anonymous>")}</TerminalOutput>);
      });
    };

    listenNodeEvent(EventType.SEND_OFFER, (name: string) => `sending offer to: ${name}`);
    listenNodeEvent(EventType.SEND_ANSWER, (name: string) => `sending answer to: ${name}`);
    listenNodeEvent(EventType.SEND_ICE, (name: string) => `sending ICE candidate to: ${name}`);
    listenNodeEvent(EventType.SEND_ANSWER_ACK, (name: string) => `sending answer ack to: ${name}`);
    listenNodeEvent(EventType.RECEIVE_OFFER, (name: string) => `offer received from: ${name}`);
    listenNodeEvent(EventType.RECEIVE_ANSWER, (name: string) => `answer received from: ${name}`);
    listenNodeEvent(
      EventType.RECEIVE_ICE,
      (name: string) => `ICE candidate received from: ${name}`,
    );

    networkListener.attachListener(EventType.SEND_BLOCKCHAIN, () => {
      pushLine(<TerminalOutput>cloning blockchain to another node...</TerminalOutput>);
    });
    networkListener.attachListener(EventType.RECEIVE_BLOCKCHAIN, () => {
      pushLine(<TerminalOutput>cloning blockchain from another node...</TerminalOutput>);
    });
    networkListener.attachListener(EventType.PEER_CONNECTED, async (sid: string) => {
      const nickname = await networkBrowser.fetchNickname(sid);
      pushLine(<TerminalOutput>{`signalling to ${nickname} complete`}</TerminalOutput>);
    });
    networkListener.attachListener(EventType.PEER_DISCONNECTED, (_: string) => {
      pushLine(<TerminalOutput>{`peer disconnected`}</TerminalOutput>);
    });
    networkListener.attachListener(EventType.ICE_DONE, async (sid: string) => {
      const nickname = await networkBrowser.fetchNickname(sid);
      pushLine(
        <TerminalOutput>{`ICE candidate exchangement with ${nickname} successfully done`}</TerminalOutput>,
      );
    });
    networkListener.attachListener(EventType.NEW_TX, (event: IDEvent<TxCandidate>) => {
      pushLine(<TerminalOutput>{`new tx requested: request-id=${event.id}`}</TerminalOutput>);
    });
    networkListener.attachListener(EventType.TX_CREATED, (event: IDEvent<Transaction>) => {
      pushLine(<TerminalOutput>{`new tx created: hash=${event.data.hash}`}</TerminalOutput>);
    });
    networkListener.attachListener(EventType.BLOCK_CREATED, (block: Block) => {
      setIsCreating(false);
      setTimeout(() => {
        pushLine(
          <TerminalOutput>{`new block created: hash=${block.header.curHash}`}</TerminalOutput>,
        );
      }, 100);
    });
    networkListener.attachListener(EventType.CHAT, (event: PeerEvent<ChatPayload>) => {
      const { nickname, data } = event;
      pushLine(
        <TerminalOutput>
          <Box width={"800px"} justifyContent={"space-between"} display={"flex"}>
            <span>
              {nickname || "<anonymous>"}: {data.data}
            </span>
            <span>{data.timestamp.toISOString()}</span>
          </Box>
        </TerminalOutput>,
      );
    });
    networkListener.attachListener(EventType.CREATING_BLOCK, () => {
      pushLine(<TerminalOutput>block creation started</TerminalOutput>);
      setIsCreating(true);
    });

    attachWasmErrorListener((err: any) => {
      setIsCreating(false);
      console.error(err);
      pushLine(
        <TerminalOutput>
          <Text color={"tomato"}>{`${err}`}</Text>
        </TerminalOutput>,
      );
    });
  }, []);

  return (
    <Box width={"1100px"} borderRadius={"15px"} overflow={"hidden"} height={"100%"}>
      <Terminal
        name="miner terminal"
        height="900px"
        onInput={(input) => {
          if (props.canProceed) {
            networkManager.broadcastChat(input);
          } else {
            pushLine(<TerminalOutput>enter after the node is initialized</TerminalOutput>);
          }
        }}
        prompt=">"
      >
        <Box
          id="terminal-items"
          width={"100%"}
          height={"87.5%"}
          mb={4}
          overflowX={"hidden"}
          overflowY={"scroll"}
        >
          {lineData}
        </Box>
      </Terminal>
    </Box>
  );
}
