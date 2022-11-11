// Deploys to Arbitrum MAINNET

import { ethers, upgrades } from "hardhat";

async function main() {
  const EUSD = await ethers.getContractFactory("eUSD");
  const eUSD = await upgrades.prepareUpgrade(
    "0xCFEfC0AF27b4D00950F1857e3477F4706F8C4ac0",
    EUSD,
    {
      kind: "transparent",
    }
  );

  console.log("eUSD deployed to:", eUSD);
}

main().catch((error) => {
  console.error(error);
});
