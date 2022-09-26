import { ethers } from "hardhat";

async function main() {
  const EUSD = await ethers.getContractFactory("eUSD");
  const eUSD = await EUSD.deploy();
  await eUSD.deployed();

  console.log("eUSD deployed to:", eUSD.address);
}

main().catch((error) => {
  console.error(error);
});
