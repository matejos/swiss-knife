"use client";

import React, { useState, useEffect } from "react";
import {
  Heading,
  Table,
  Tbody,
  Tr,
  Td,
  Box,
  Button,
  Container,
  Center,
  useToast,
  Stack,
  Text,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { Interface, TransactionDescription, ParamType } from "ethers";
import axios from "axios";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import { renderParams } from "@/components/renderParams";
import { DarkButton } from "@/components/DarkButton";
import TabsSelector from "@/components/Tabs/TabsSelector";
import JsonTextArea from "@/components/JsonTextArea";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import networkInfo from "@/data/networkInfo";

const networkOptions: { label: string; value: number }[] = networkInfo.map(
  (n, i) => ({
    label: n.name,
    value: i, // index in the networkInfo array
  })
);

// TODO: get data from URL
const CalldataDecoder = () => {
  const toast = useToast();

  const [calldata, setCalldata] = useState<string>();
  const [fnDescription, setFnDescription] = useState<TransactionDescription>();
  const [isLoading, setIsLoading] = useState(false);
  const [pasted, setPasted] = useState(false);

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const [abi, setAbi] = useState<any>();

  const [contractAddress, setContractAddress] = useState<string>();
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(networkOptions[0]);

  useEffect(() => {
    if (pasted && selectedTabIndex === 0) {
      decodeWithSelector();
      setPasted(false);
    }
  }, [calldata]);

  const _getAllPossibleDecoded = (functionsArr: string[]) => {
    let decodedStatus = false;
    for (var i = 0; i < functionsArr.length; i++) {
      const fn = functionsArr[i];
      const _abi = [`function ${fn}`];

      try {
        decodedStatus = _decodeWithABI(_abi, calldata);
      } catch {
        continue;
      }
    }

    if (decodedStatus) {
      toast({
        title: "Successfully Decoded",
        status: "success",
        isClosable: true,
        duration: 1000,
      });
    } else {
      toast({
        title: "Can't Decode Calldata",
        status: "error",
        isClosable: true,
        duration: 4000,
      });
    }
  };

  const fetchFunctionInterface = async (selector: string): Promise<any[]> => {
    // from api.openchain.xyz
    const response = await axios.get(
      "https://api.openchain.xyz/signature-database/v1/lookup",
      {
        params: {
          function: selector,
        },
      }
    );
    const results = response.data.result.function[selector].map(
      (f: { name: string }) => f.name
    );

    if (results.length > 0) {
      return results;
    } else {
      // from 4byte.directory
      const response = await axios.get(
        "https://www.4byte.directory/api/v1/signatures/",
        {
          params: {
            hex_signature: selector,
          },
        }
      );
      const results = response.data.results.map(
        (f: { text_signature: string }) => f.text_signature
      );

      return results;
    }
  };

  const fetchContractABI = async (): Promise<any> => {
    if (!contractAddress) return {};

    try {
      const response = await axios.get(
        `https://anyabi.xyz/api/get-abi/${
          networkInfo[
            selectedNetworkOption?.value
              ? parseInt(selectedNetworkOption?.value.toString())
              : 0
          ].chainID
        }/${contractAddress}`
      );
      return JSON.stringify(response.data.abi);
    } catch {
      toast({
        title: "Can't fetch ABI from Address",
        status: "error",
        isClosable: true,
        duration: 1000,
      });
      return {};
    }
  };

  const decodeWithSelector = async () => {
    if (!calldata) return;
    setIsLoading(true);

    const selector = calldata.slice(0, 10);
    try {
      const results = await fetchFunctionInterface(selector);

      if (results.length > 0) {
        // can have multiple entries with the same selector
        _getAllPossibleDecoded(results);
      } else {
        toast({
          title: "Can't fetch function interface",
          status: "error",
          isClosable: true,
          duration: 1000,
        });
      }

      setIsLoading(false);
    } catch {
      toast({
        title: "Can't Decode Calldata",
        status: "error",
        isClosable: true,
        duration: 1000,
      });
      setIsLoading(false);
    }
  };

  const _decodeWithABI = (_abi: any, _calldata?: string) => {
    let decodedStatus = false;

    const iface = new Interface(_abi);
    if (!_calldata) return decodedStatus;

    let res = iface.parseTransaction({ data: _calldata });
    if (res === null) {
      return decodedStatus;
    }

    console.log(res);
    setFnDescription(res);

    decodedStatus = true;
    return decodedStatus;
  };

  const decodeWithABI = async () => {
    setIsLoading(true);
    _decodeWithABI(abi, calldata);
    setIsLoading(false);
  };

  const decodeWithAddress = async () => {
    if (!calldata) return;

    setIsLoading(true);

    const fetchedABI = await fetchContractABI();
    setAbi(JSON.stringify(JSON.parse(fetchedABI), undefined, 2));

    toast({
      title: "ABI Fetched from Address",
      status: "success",
      isClosable: true,
      duration: 1000,
    });
    setSelectedTabIndex(1);

    _decodeWithABI(fetchedABI, calldata);

    setIsLoading(false);
  };

  const FromABIBody = () => {
    return (
      <Tr>
        <Td colSpan={2}>
          <Center maxW={"50rem"}>
            <FormControl>
              <FormLabel>Input ABI</FormLabel>
              <JsonTextArea
                value={abi}
                setValue={setAbi}
                placeholder="JSON ABI"
                ariaLabel="json abi"
              />
            </FormControl>
          </Center>
        </Td>
      </Tr>
    );
  };

  const FromAddressBody = () => {
    return (
      <>
        <Tr>
          <Label>Contract Address</Label>
          <Td>
            <InputField
              placeholder="Address"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
            />
          </Td>
        </Tr>
        <Tr>
          <Label>Chain</Label>
          <Td>
            <DarkSelect
              boxProps={{
                w: "100%",
              }}
              selectedOption={selectedNetworkOption}
              setSelectedOption={setSelectedNetworkOption}
              options={networkOptions}
            />
          </Td>
        </Tr>
      </>
    );
  };

  const renderTabsBody = () => {
    switch (selectedTabIndex) {
      case 0:
        return null;
      case 1:
        return <FromABIBody />;
      case 2:
        return <FromAddressBody />;
      default:
        return null;
    }
  };

  return (
    <>
      <Heading color={"custom.pale"}>Calldata Decoder</Heading>
      <TabsSelector
        tabs={["No ABI", "from ABI", "from Address"]}
        selectedTabIndex={selectedTabIndex}
        setSelectedTabIndex={setSelectedTabIndex}
      />
      <Table mt={"1rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Calldata</Label>
            <Td>
              <InputField
                placeholder="calldata"
                value={calldata}
                onChange={(e) => setCalldata(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  setPasted(true);
                  setCalldata(e.clipboardData.getData("text"));
                }}
              />
            </Td>
          </Tr>
          {renderTabsBody()}
          <Tr>
            <Td colSpan={2}>
              <Container mt={0}>
                <Center>
                  <DarkButton
                    onClick={() => {
                      switch (selectedTabIndex) {
                        case 0:
                          return decodeWithSelector();
                        case 1:
                          return decodeWithABI();
                        case 2:
                          return decodeWithAddress();
                      }
                    }}
                    isLoading={isLoading}
                  >
                    Decode
                  </DarkButton>
                </Center>
              </Container>
            </Td>
          </Tr>
        </Tbody>
      </Table>
      {fnDescription && (
        <Box minW={"80%"}>
          <Box>
            <Box fontSize={"xs"} color={"whiteAlpha.600"}>
              function
            </Box>
            <Box>{fnDescription.name}</Box>
          </Box>
          <Stack
            mt={2}
            p={4}
            spacing={4}
            border="1px"
            borderStyle={"dashed"}
            borderColor={"whiteAlpha.500"}
            rounded={"lg"}
          >
            {fnDescription.fragment.inputs.map((input, i) => {
              const value = fnDescription.args[i];
              return renderParams(i, input, value);
            })}
          </Stack>
        </Box>
      )}
    </>
  );
};

export default CalldataDecoder;
