// e.g., in src/utils/constants.ts
export const contractAddress = "0x5989D3E1c0324973850201169058C9c6E17B15D6";
export const contractABI =  [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "debateId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "hashValue",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "ResultStored",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "debateId",
          "type": "uint256"
        }
      ],
      "name": "getResult",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "debateId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "hashValue",
          "type": "string"
        }
      ],
      "name": "storeResult",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];