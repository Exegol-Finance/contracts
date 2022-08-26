import { ethers } from "hardhat";

async function main() {
  const Gen3 = await ethers.getContractFactory("Gen3");
  const gen3 = await Gen3.deploy();
  await gen3.deployed();

  console.log("Gen3 deployed to:", gen3.address);
}

main().catch((error) => {
  console.error(error);
});
