// e.g., in src/utils/constants.ts
export const contractAddress = "0x6CF326D98F4f8bABDc721f84Dc1B6319D0E603eC";
export const contractABI =  [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "string",
          "name": "debateId",
          "type": "string"
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
          "internalType": "string",
          "name": "debateId",
          "type": "string"
        }
      ],
      "name": "getResult",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
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
          "internalType": "string",
          "name": "debateId",
          "type": "string"
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