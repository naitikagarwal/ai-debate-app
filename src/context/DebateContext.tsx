"use client"; // Important: This must be a Client Component

import React, {
  useEffect,
  useState,
  useContext,
  createContext,
  ReactNode,
} from "react";

import { ethers } from "ethers";

// You must create this file in your utils folder
import { contractABI, contractAddress } from "../utils/constants";

// --- TypeScript Interfaces ---

interface FormData {
  opponentAddress: string;
  stakeAmount: string;
}

// MODIFIED: This interface now matches the contract's readDebateRecord return
interface ViewedDebate {
  winner: string;
  resultData: string; // Changed from scores and reasoning
}

interface DebateContextType {
  connectWallet: () => Promise<void>;
  currentAccount: string;
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>, name: string) => void;
  createDebate: () => Promise<number | undefined>;
  joinDebate: (debateId: number, stakeAmount: string) => Promise<void>;
  payAndReadDebate: (debateId: number) => Promise<ViewedDebate | undefined>;
  allDebates: any[]; // You can create a specific 'Debate' type for this
  viewedDebate: ViewedDebate | null; // This type is now updated
  isLoading: boolean;
}

interface DebateProviderProps {
  children: ReactNode;
}

// 1. Create the Context
const DebateContext = createContext<DebateContextType | undefined>(undefined);

// 2. Custom Hook to use the Context (handles 'undefined' check)
export const useDebateContext = () => {
  const context = useContext(DebateContext);
  if (context === undefined) {
    throw new Error("useDebateContext must be used within a DebateProvider");
  }
  return context;
};

// Helper function to get the Ethereum provider and contract
const getEthereumContract = async (): Promise<ethers.Contract | null> => {
  if (typeof window !== "undefined" && window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();
    const debateContract = new ethers.Contract(
      contractAddress,
      contractABI, // Ensure this ABI is up-to-date
      signer
    );
    return debateContract;
  }
  return null;
};

// 3. Create the Provider Component
export const DebateProvider = ({ children }: DebateProviderProps) => {
  const [currentAccount, setCurrentAccount] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({
    opponentAddress: "",
    stakeAmount: "",
  });
  const [allDebates, setAllDebates] = useState<any[]>([]); // TODO: Fetch debates
  // This state now holds the updated ViewedDebate type
  const [viewedDebate, setViewedDebate] = useState<ViewedDebate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    name: string
  ) => {
    setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const checkIfWalletIsConnected = async () => {
    if (!window.ethereum) return alert("Please install MetaMask.");
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        // fetchAllDebates(); // You should load debates here
      } else {
        console.log("No accounts found");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask.");
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts.length > 0) {
        setCurrentAccount(accounts[0]);
        window.location.reload(); // Reload to re-initialize state with new user
      }
    } catch (error) {
      console.log(error);
      throw new Error("No ethereum object");
    }
  };

  const createDebate = async (): Promise<number | undefined> => {
    if (!window.ethereum) {
      alert("Please install MetaMask.");
      return;
    }
    try {
      const { opponentAddress, stakeAmount } = formData;
      if (!opponentAddress || !stakeAmount) return;

      const contract = await getEthereumContract();
      if (!contract) return;

      const parsedAmount = ethers.parseEther(stakeAmount);

      setIsLoading(true);
      const tx = await contract.createDebate(opponentAddress, {
        value: parsedAmount,
      });

      const receipt = await tx.wait();
      const event = receipt.events?.find(
        (e: any) => e.event === "DebateCreated"
      );

      setIsLoading(false);

      if (event && event.args) {
        const debateId = event.args[0];
        console.log(`Debate created on-chain with ID: ${debateId.toNumber()}`);
        return debateId.toNumber();
      } else {
        console.error("Could not find DebateCreated event in transaction");
        return undefined;
      }
    } catch (error) {
      console.log(error);
      setIsLoading(false);
      return undefined;
    }
  };

  const joinDebate = async (debateId: number, stakeAmount: string) => {
    if (!window.ethereum) return alert("Please install MetaMask.");
    try {
      const contract = await getEthereumContract();
      if (!contract) return;

      const parsedAmount = ethers.parseEther(stakeAmount);

      setIsLoading(true);
      const tx = await contract.joinDebate(debateId, {
        value: parsedAmount,
      });
      await tx.wait();
      setIsLoading(false);

      console.log(`Debate joined: ${tx.hash}`);
      // fetchAllDebates();
    } catch (error) {
      console.log(error);
      setIsLoading(false);
    }
  };

  // --- MODIFICATION HERE ---
  const payAndReadDebate = async (
    debateId: number
  ): Promise<ViewedDebate | undefined> => {
    if (!window.ethereum) {
      alert("Please install MetaMask.");
      return undefined;
    }

    try {
      const contract = await getEthereumContract();
      if (!contract) return undefined;

      setIsLoading(true);
      const viewFee = await contract.viewFee();
      const txPay = await contract.payToView(debateId, { value: viewFee });
      await txPay.wait();
      console.log(`Payment successful: ${txPay.hash}`);

      // readDebateRecord now returns [winner, resultData]
      const results = await contract.readDebateRecord(debateId);
      setIsLoading(false);

      // Structure the result according to the new ViewedDebate interface
      const structuredResult: ViewedDebate = {
        winner: results[0],
        resultData: results[1], // Changed from scores/reasoning
      };

      setViewedDebate(structuredResult);
      return structuredResult;
    } catch (error) {
      console.log(error);
      setIsLoading(false);
      return undefined;
    }
  };
  // --- END OF MODIFICATION ---

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  return (
    <DebateContext.Provider
      value={{
        connectWallet,
        currentAccount,
        formData,
        handleChange,
        createDebate,
        joinDebate,
        payAndReadDebate,
        allDebates,
        viewedDebate,
        isLoading,
      }}
    >
      {children}
    </DebateContext.Provider>
  );
};

