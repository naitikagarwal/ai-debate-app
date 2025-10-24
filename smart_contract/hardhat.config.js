require("@nomiclabs/hardhat-waffle");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    sepolia: {
      url: 'https://eth-sepolia.g.alchemy.com/v2/Mg8ktVj3FuvidC1UMKbjW',
      accounts:['60cd1a550e424a4fadc90bd4cec1bbe8283602a76b97bc3e4788145d0038237d'],
    },
  }
};