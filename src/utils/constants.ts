// e.g., in src/utils/constants.ts
export const contractAddress = "0x7Db2899CE923ea21FF9dD5e134641F52f5A61387";
export const contractABI =  [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_viewFee",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_aiFeePercentage",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "scores",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "winnerPayout",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "aiFee",
          "type": "uint256"
        }
      ],
      "name": "DebateConcluded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "participantA",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "participantB",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stake",
          "type": "uint256"
        }
      ],
      "name": "DebateCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "totalStake",
          "type": "uint256"
        }
      ],
      "name": "DebateStaked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "viewer",
          "type": "address"
        }
      ],
      "name": "ResultViewed",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "aiFeePercentage",
      "outputs": [
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
      "inputs": [],
      "name": "aiJudgeAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_participantB",
          "type": "address"
        }
      ],
      "name": "createDebate",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "debates",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "participantA",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "participantB",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "stakeA",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "stakeB",
          "type": "uint256"
        },
        {
          "internalType": "enum DebatePlatform.DebateState",
          "name": "state",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "scores",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "reasoning",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_debateId",
          "type": "uint256"
        }
      ],
      "name": "getDebateDetails",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "participantA",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "participantB",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "totalStake",
          "type": "uint256"
        },
        {
          "internalType": "enum DebatePlatform.DebateState",
          "name": "state",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "winner",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "hasPaidToView",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_debateId",
          "type": "uint256"
        }
      ],
      "name": "joinDebate",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextDebateId",
      "outputs": [
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
          "name": "_debateId",
          "type": "uint256"
        }
      ],
      "name": "payToView",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_debateId",
          "type": "uint256"
        }
      ],
      "name": "readDebateRecord",
      "outputs": [
        {
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "scores",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "reasoning",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "viewFee",
      "outputs": [
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
          "name": "_debateId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_winner",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "_scores",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_reasoning",
          "type": "string"
        }
      ],
      "name": "writeDebateRecord",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];