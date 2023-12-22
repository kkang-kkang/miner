import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import App from "../App/App";

export default function PreEnter() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [isAvailable, setIsAvailabe] = useState<boolean>(false);
  const [shouldProceed, setShouldProceed] = useState<boolean>(false);
  const [nickname, setNickname] = useState<string>("");
  const [publicKey, setPublicKey] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [isPublicKeyInvalid, setIsPublicKeyInvalid] = useState<boolean>(false);

  useEffect(() => {
    onOpen();
  }, []);

  return (
    <>
      {shouldProceed ? (
        <React.Fragment>
          <App nickname={nickname} addr={publicKey} token={token} />
        </React.Fragment>
      ) : (
        <></>
      )}
      <Modal size={"md"} isOpen={isOpen} onClose={() => {}}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Enter your information</ModalHeader>
          <Box p={3}>
            <FormControl>
              <FormLabel>nickname</FormLabel>
              <Input
                isRequired={true}
                placeholder="your nickname as a node"
                onChange={(e) => {
                  setNickname(e.target.value);
                }}
              ></Input>
            </FormControl>
            <FormControl isInvalid={isPublicKeyInvalid}>
              <FormLabel>public key</FormLabel>
              <Input
                isRequired={true}
                placeholder="your wallet's public key"
                onChange={(e) => {
                  const value = e.target.value;
                  setPublicKey(value);
                  const valid =
                    value !== "" && value.length % 2 === 0 && /^[0-9a-fA-F]+$/g.test(value);

                  setIsPublicKeyInvalid(!valid);
                  setIsAvailabe(valid);
                }}
              ></Input>
              {isPublicKeyInvalid ? (
                <FormErrorMessage>public key should be hex string!</FormErrorMessage>
              ) : (
                <></>
              )}
            </FormControl>
            <FormControl>
              <FormLabel>ipinfo token (optional)</FormLabel>
              <Input
                isRequired={false}
                placeholder="ipinfo token"
                onChange={(e) => {
                  setToken(e.target.value);
                }}
              ></Input>
            </FormControl>
          </Box>
          <ModalFooter>
            <Button
              colorScheme={"blue"}
              isDisabled={!isAvailable}
              onClick={() => {
                onClose();
                setShouldProceed(true);
              }}
            >
              submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
