import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades";

require("dotenv").config();

const {
  KOVAN_URL,
  PRIVATE_KEY,
  MAINNET_URL,
  GOERLI_URL,
  ARB_TEST_URL,
  ARBITRUM,
  ETHERSCAN,
} = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  paths: {
    sources: "./src",
  },
  networks: {
    hardhat: {
      forking: {
        url: `${MAINNET_URL}`,
      },
    },
    kovan: {
      url: KOVAN_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    goerli: {
      url: GOERLI_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    arb_test: {
      url: ARB_TEST_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    arbi: {
      url: ARBITRUM,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN,
  },
};

export default config;
