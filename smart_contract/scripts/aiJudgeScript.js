import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

// --- STEP 1: LOAD YOUR SECRET CONFIG ---
// (No changes here)
const AI_JUDGE_PRIVATE_KEY = '60cd1a550e424a4fadc90bd4cec1bbe8283602a76b97bc3e4788145d0038237d';
const ALCHEMY_OR_INFURA_URL = 'https://eth-sepolia.g.alchemy.com/v2/Mg8ktVj3FuvidC1UMKbjW';
if (!AI_JUDGE_PRIVATE_KEY || !ALCHEMY_OR_INFURA_URL) {
  throw new Error("Missing AI_JUDGE_PRIVATE_KEY or ALCHEMY_URL in .env file");
}

const contractAddress = "0xa03466e782171026D95c62b1BE602ac51D195B0b";
const contractABI =  [
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
          "name": "resultData",
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
          "name": "resultData",
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
          "name": "resultData",
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
          "name": "_resultData",
          "type": "string"
        }
      ],
      "name": "writeDebateRecord",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

// --- STEP 3: CONNECT TO BLOCKCHAIN & WALLET ---
// (Moved from main function so it's only done once)
const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_OR_INFURA_URL);
const aiJudgeWallet = new ethers.Wallet(AI_JUDGE_PRIVATE_KEY, provider);
const debateContract = new ethers.Contract(contractAddress, contractABI, aiJudgeWallet);

console.log(`AI Judge script loaded. Using wallet: ${aiJudgeWallet.address}`);

/**
 * --- STEP 4: DEFINE THE DYNAMIC MAIN FUNCTION ---
 * This function fetches live AI results and writes them to the blockchain.
 */
async function judgeAndWriteToBlockchain(debateId) {
  console.log(`\nStarting dynamic judgment for debate: ${debateId}`);

  try {
    // --- A: Fetch data from your *existing* Next.js API routes ---
    // This assumes your Next.js app is running on http://localhost:3000
    
    // 1. Call your '/check' route to get participant info
    console.log(`Fetching: http://localhost:3000/api/debates/${debateId}/check`);
    const checkResponse = await fetch(`http://localhost:3000/api/debates/${debateId}/check`);
    if (!checkResponse.ok) {
      throw new Error(`Failed to fetch /check data: ${checkResponse.statusText}`);
    }
    const checkData = await checkResponse.json();
    console.log("...Received check data");

    // 2. Call your '/test' AI route with the check data
    console.log("Fetching: http://localhost:3000/api/test");
    const aiResponse = await fetch(`http://localhost:3000/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkData)
    });
    if (!aiResponse.ok) {
        throw new Error(`Failed to fetch /test AI result: ${aiResponse.statusText}`);
    }
    const aiResult = await aiResponse.json();
    
    // This is the dynamic result from your AI endpoint
    const resultData = aiResult.answer; 
    console.log("...Received AI result");

    // --- B: Parse the dynamic AI result to find the winner ---
    let winnerName = null;
    const winnerLine = resultData.split('\n').find(l => l.startsWith("winner :"));
    if (winnerLine) {
        winnerName = winnerLine.split(':')[1].trim(); // e.g., "Team 2"
    }
    if (!winnerName) {
        throw new Error("Could not parse 'winner :' from AI result text.");
    }
    console.log(`...AI declared winner: ${winnerName}`);

    let winnerAddress;

    if (checkData.user1_name && winnerName === checkData.user1_name) {
        winnerAddress = checkData.user1_address;
    } else if (checkData.user2_name && winnerName === checkData.user2_name) {
        winnerAddress = checkData.user2_address;
    } else {
        console.log("CheckData for mapping:", checkData);
        throw new Error(`Could not map winner name '${winnerName}' to an address.`);
    }
    console.log(`...Mapped winner address: ${winnerAddress}`);

    // --- D: Call the writeDebateRecord function ---
    console.log("Sending transaction to writeDebateRecord...");
    const tx = await debateContract.writeDebateRecord(
      debateId,
      winnerAddress,
      resultData
    );

    console.log(`Transaction sent! Hash: ${tx.hash}`);
    console.log("Waiting for transaction to be mined...");
    
    const receipt = await tx.wait();

    console.log("-----------------------------------------");
    console.log(`SUCCESS! Result for ${debateId} written to the blockchain.`);
    console.log(`Block Number: ${receipt.blockNumber}`);
    console.log("-----------------------------------------");

    // TODO: Update your Firestore doc (status: "concluded", onChain: true)

  } catch (error) {
    console.error("\n--- FAILED TO WRITE TO BLOCKCHAIN ---");
    if (error.reason) {
      console.error(`Revert Reason: ${error.reason}`);
    } else {
      console.error(error.message);
    }
    console.error("---------------------------------------\n");
  }
}

const debateIdFromCli = process.argv[2];

if (!debateIdFromCli) {
  console.error("ERROR: Please provide a debateId to judge.");
  console.log("Usage: npx ts-node scripts/aiJudgeScript.ts <debateId>");
  process.exit(1);
}

// Run the main function
judgeAndWriteToBlockchain(debateIdFromCli);

