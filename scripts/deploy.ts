// Deploys to Arbitrum MAINNET

import { ethers, upgrades } from "hardhat";

async function main() {
  const EUSD = await ethers.getContractFactory("eUSD");
  const eUSD = await upgrades.deployProxy(EUSD, [
    "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // USDC Address
    134400, // Withdrawal Block Timeout
  ]);
  await eUSD.deployed();

  console.log("eUSD deployed to:", eUSD.address);
}

main().catch((error) => {
  console.error(error);
});
