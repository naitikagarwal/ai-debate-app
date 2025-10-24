const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  // Set the constructor arguments
  const viewFee = ethers.utils.parseEther("0.001"); // 0.001 Sepolia ETH
  const aiFeePercentage = 5; // 5%

  const DebatePlatform = await hre.ethers.getContractFactory("DebatePlatform");
  const debatePlatform = await DebatePlatform.deploy(viewFee, aiFeePercentage);

  await debatePlatform.deployed();

  console.log(`DebatePlatform deployed to: ${debatePlatform.address}`);
  console.log(`Constructor Args:`);
  console.log(`  View Fee: ${ethers.utils.formatEther(viewFee)} ETH`);
  console.log(`  AI Fee: ${aiFeePercentage}%`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

//0x7Db2899CE923ea21FF9dD5e134641F52f5A61387 - delpoyed contract address (debateplatform)