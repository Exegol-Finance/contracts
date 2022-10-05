// Upgrades contract in Arbitrum MAINNET

import { ethers, upgrades } from "hardhat";

async function main() {
  const EUSD = await ethers.getContractFactory("eUSD");
  const eUSD = await upgrades.upgradeProxy(
    "0xc4cB75b6251dd852D7c1Ff750A1a0fchangethis", // proxy address
    EUSD
  );
  await eUSD.deployed();

  console.log("eUSD upgraded to:", eUSD.address);
}

main().catch((error) => {
  console.error(error);
});
