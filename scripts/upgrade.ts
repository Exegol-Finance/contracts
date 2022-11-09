// Upgrades contract in Arbitrum MAINNET

import { ethers, upgrades } from "hardhat";

async function main() {
  const EUSD = await ethers.getContractFactory("eUSD");
  const eUSD = await upgrades.upgradeProxy(
    "0xcBc6653A3B6CBC5F49952fb2881Ac5264e497A2b", // proxy address
    EUSD
  );
  await eUSD.deployed();

  console.log("eUSD upgraded to:", eUSD.address);
}

main().catch((error) => {
  console.error(error);
});
