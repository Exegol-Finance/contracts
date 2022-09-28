import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { Contract } from "ethers";
import { ethers, upgrades } from "hardhat";

describe("eUSD", function () {
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const ERC20_ABI = require("./erc20.abi.json");

  async function deployTokenFixture() {
    const EUSD = await ethers.getContractFactory("eUSD");
    const [owner] = await ethers.getSigners();

    const USDCWhale = await ethers.getImpersonatedSigner(
      "0x55FE002aefF02F77364de339a1292923A15844B8"
    );

    const USDC = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, ethers.provider);

    const eUSD = await upgrades.deployProxy(EUSD, [
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      134400,
    ]);
    await eUSD.deployed();

    return { EUSD, eUSD, owner, USDCWhale, USDC };
  }

  async function mint(
    eUSD: any,
    owner: SignerWithAddress,
    USDC: Contract,
    USDCWhale: SignerWithAddress
  ) {
    const AMOUNT_TO_MINT = 100 * Math.pow(10, await USDC.decimals()); // 100 USDC
    const AMOUNT_TO_RECIEVE = 100 * Math.pow(10, await eUSD.decimals()); // 100 eUSD

    await USDC.connect(USDCWhale).approve(eUSD.address, AMOUNT_TO_MINT);
    await eUSD.connect(USDCWhale).mint(AMOUNT_TO_MINT); // mint using 100 USDC

    assert.equal(AMOUNT_TO_MINT, (await eUSD.availableLiquidity()).toNumber());
    assert.equal(
      AMOUNT_TO_RECIEVE,
      (await eUSD.balanceOf(USDCWhale.address)).toNumber()
    );
  }

  // sanity test
  describe("Deployment", function () {
    it("should have correct owner", async function () {
      const { owner, eUSD } = await loadFixture(deployTokenFixture);

      assert.equal(owner.address, await eUSD.owner());
    });
  });

  describe("Minting", function () {
    it("should be able to mint", async function () {
      const { owner, eUSD, USDC, USDCWhale } = await loadFixture(
        deployTokenFixture
      );

      const AMOUNT_TO_MINT = 100 * Math.pow(10, await USDC.decimals()); // 100 USDC
      const AMOUNT_TO_RECIEVE = 100 * Math.pow(10, await eUSD.decimals()); // 100 eUSD

      await USDC.connect(USDCWhale).transfer(owner.address, AMOUNT_TO_MINT);
      await USDC.connect(owner).approve(eUSD.address, AMOUNT_TO_MINT);
      await eUSD.mint(AMOUNT_TO_MINT); // mint using 100 USDC

      assert.equal(
        AMOUNT_TO_RECIEVE,
        (await eUSD.availableLiquidity()).toNumber()
      );
      assert.equal(
        AMOUNT_TO_RECIEVE,
        (await eUSD.balanceOf(owner.address)).toNumber()
      );
    });

    it("should mint lower amount when exchange rate is high", async function () {
      const { owner, eUSD, USDC, USDCWhale } = await loadFixture(
        deployTokenFixture
      );

      const AMOUNT_TO_MINT = 100 * Math.pow(10, await USDC.decimals());
      const NEW_EXCHANGE_RATE = 1.1 * Math.pow(10, await eUSD.decimals());

      await USDC.connect(USDCWhale).transfer(owner.address, AMOUNT_TO_MINT);
      await USDC.connect(owner).approve(eUSD.address, AMOUNT_TO_MINT);

      await eUSD.updateExchangeRate(NEW_EXCHANGE_RATE.toString());
      await eUSD.mint(AMOUNT_TO_MINT); // mint using 100 USDC

      assert.equal(
        AMOUNT_TO_MINT,
        (await eUSD.availableLiquidity()).toNumber()
      );
      assert.equal(
        Math.trunc(
          (AMOUNT_TO_MINT * Math.pow(10, await eUSD.decimals())) /
            NEW_EXCHANGE_RATE
        ),
        (await eUSD.balanceOf(owner.address)).toNumber()
      );
    });

    it("should mint higher amount when exchange rate is low", async function () {
      const { owner, eUSD, USDC, USDCWhale } = await loadFixture(
        deployTokenFixture
      );

      const AMOUNT_TO_MINT = 100 * Math.pow(10, await USDC.decimals());
      const NEW_EXCHANGE_RATE = 0.9 * Math.pow(10, await eUSD.decimals());

      await USDC.connect(USDCWhale).transfer(owner.address, AMOUNT_TO_MINT);
      await USDC.connect(owner).approve(eUSD.address, AMOUNT_TO_MINT);

      await eUSD.updateExchangeRate(NEW_EXCHANGE_RATE.toString());
      await eUSD.mint(AMOUNT_TO_MINT); // mint using 100 USDC

      assert.equal(
        AMOUNT_TO_MINT,
        (await eUSD.availableLiquidity()).toNumber()
      );
      assert.equal(
        Math.trunc(
          (AMOUNT_TO_MINT * Math.pow(10, await eUSD.decimals())) /
            NEW_EXCHANGE_RATE
        ),
        (await eUSD.balanceOf(owner.address)).toNumber()
      );
    });
  });

  describe("Burning", function () {
    // WARNING: flaky test
    it("should return USDC", async function () {
      const { owner, eUSD, USDC, USDCWhale } = await loadFixture(
        deployTokenFixture
      );
      const initBalance = await USDC.balanceOf(USDCWhale.address);
      await mint(eUSD, owner, USDC, USDCWhale);

      // await eUSD.updateExchangeRate(0.9 * Math.pow(10, 6));

      await eUSD
        .connect(USDCWhale)
        .withdraw((await eUSD.balanceOf(USDCWhale.address)).toNumber());

      // user get some extra USDC due to a precision issue
      assert.isBelow(
        (await USDC.balanceOf(USDCWhale.address)) - initBalance,
        -9.999 * Math.pow(10, 6)
      );

      // fee recipient recieves a little less USDC
      assert.equal(
        await USDC.balanceOf(owner.address),
        9.9999 * Math.pow(10, 6)
      );

      // precision issue does not affect liquidity, overflow or underflow
      assert.equal((await eUSD.availableLiquidity()).toNumber(), 0);
    });
  });

  describe("Liquidity and Permissions", function () {
    it("should allow owner to withdraw and add liquidity", async function () {
      const { owner, eUSD, USDC, USDCWhale } = await loadFixture(
        deployTokenFixture
      );
      await mint(eUSD, owner, USDC, USDCWhale);

      const initialLiquidity = await eUSD.availableLiquidity();
      const toRemove = 50 * (await USDC.decimals());

      await eUSD.withdrawLiquidity(toRemove);
      assert.isTrue(
        (await eUSD.availableLiquidity()).eq(initialLiquidity.sub(toRemove))
      );

      await USDC.connect(owner).approve(eUSD.address, toRemove);

      await eUSD.addLiquidity(toRemove);
      assert.isTrue((await eUSD.availableLiquidity()).eq(initialLiquidity));
    });

    it("should not allow anyone else to withdraw liquidity", async function () {
      const { owner, eUSD, USDC, USDCWhale } = await loadFixture(
        deployTokenFixture
      );
      await mint(eUSD, owner, USDC, USDCWhale);

      await expect(
        eUSD.connect(USDCWhale).withdrawLiquidity(50 * (await USDC.decimals()))
      ).to.be.rejectedWith(Error);
    });

    it("should only allow owner to update fee recipient", async function () {
      const { owner, eUSD, USDCWhale } = await loadFixture(deployTokenFixture);

      await expect(
        eUSD.connect(USDCWhale).updateFeeRecipient(USDCWhale.address)
      ).to.be.rejectedWith(Error);

      await expect(
        eUSD.connect(owner).updateFeeRecipient(USDCWhale.address)
      ).to.not.be.rejectedWith(Error);
    });

    it("should only allow owner to transfer ownership", async function () {
      const { owner, eUSD, USDCWhale } = await loadFixture(deployTokenFixture);

      await expect(
        eUSD.connect(USDCWhale).transferOwnership(USDCWhale.address)
      ).to.be.rejectedWith(Error);

      await expect(
        eUSD.connect(owner).transferOwnership(USDCWhale.address)
      ).to.not.be.rejectedWith(Error);

      await expect(eUSD.owner()).to.eventually.equal(USDCWhale.address);
      await expect(eUSD.feeRecipient()).to.eventually.equal(USDCWhale.address);
    });

    it("should only allow owner to update exchange rate", async function () {
      const { owner, eUSD, USDCWhale } = await loadFixture(deployTokenFixture);

      await expect(
        eUSD.connect(USDCWhale).updateExchangeRate(10 * Math.pow(10, 6))
      ).to.be.rejectedWith(Error);

      await expect(
        eUSD.connect(owner).updateExchangeRate(10 * Math.pow(10, 6))
      ).to.not.be.rejectedWith(Error);

      await expect(eUSD.exchangeRate()).to.eventually.equal(
        10 * Math.pow(10, 6)
      );
    });
  });
});
