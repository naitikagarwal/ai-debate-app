const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const ResultStorage = await hre.ethers.getContractFactory("ResultStorage");

  console.log("📦 Deploying ResultStorage contract...");
  const resultStorage = await ResultStorage.deploy(); 

  await resultStorage.deployed();

  // console.log("✅ Contract deployed to:", await resultStorage.getAddress());
    console.log(`DebatePlatform deployed to: ${resultStorage.address}`);
}

// Run the deployment
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


//0x7Db2899CE923ea21FF9dD5e134641F52f5A61387 - delpoyed contract address (debateplatform)
//0x3082D54C9acA5D50B99F31A649CCec2e1C706F2f - 2nd time deployment
//0xC9739e935ee972e9d318B72e8344c36C3F4734D4 - 3rd deploy
//0xa03466e782171026D95c62b1BE602ac51D195B0b
//0x6CF326D98F4f8bABDc721f84Dc1B6319D0E603eC - final tmkc