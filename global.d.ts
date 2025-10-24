// In global.d.ts (or types.d.ts)

import { ethers } from "ethers";

declare global {
  interface Window {
    // This will be 'any' if you don't have ethers installed
    // Or you can use a more specific type if you have one
    ethereum?: ethers.providers.ExternalProvider;
  }
}