// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Gen3 is ERC20, ERC20Burnable, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    IERC20 public USDC;

    address public feeRecipient;
    uint256 private liquidity;
    uint256 public maxFee;

    uint256 public exchangeRate; // GEN3 per USDC
    mapping(address => uint256) public lastWithdraw; // address to block number
    uint256 public blockTimeout;

    constructor() ERC20("Gen3", "GEN3") {
        USDC = IERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // USDC mainnet address
        feeRecipient = msg.sender;
        liquidity = 0;
        exchangeRate = 10**6;
        maxFee = 0.1 * (10**6);
        blockTimeout = 134400; //blocks (around 21 days for mainnet)
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function availableLiquidity() public view returns (uint256) {
        return liquidity;
    }

    function withdrawLiquidity(uint256 value) public onlyOwner {
        require(value <= liquidity, "Not enough liquidity to withdraw");
        USDC.safeTransfer(this.owner(), value);
        liquidity -= value;
    }

    function addLiquidity(uint256 value) public onlyOwner {
        USDC.safeTransferFrom(this.owner(), address(this), value);
        liquidity += value;
    }

    function updateFeeRecipient(address to) public onlyOwner {
        feeRecipient = to;
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        _transferOwnership(newOwner);
        feeRecipient = newOwner;
    }

    function updateExchangeRate(uint256 newExchangeRate) public onlyOwner {
        exchangeRate = newExchangeRate;
    }

    // value = number of USDC to mint with
    function mint(uint256 value) public {
        USDC.safeTransferFrom(msg.sender, address(this), value);
        liquidity += value;

        // first time depositing
        if (lastWithdraw[msg.sender] == 0) {
            lastWithdraw[msg.sender] = block.number; // begin initial lock
        }

        _mint(msg.sender, value.mul(10**this.decimals()).div(exchangeRate));
    }

    // value = number of GEN3 to burn
    function withdraw(uint256 value) public {
        require(
            liquidity >= value.mul(exchangeRate).div(10**this.decimals()),
            "Not enough liquidity"
        );

        _burn(msg.sender, value);
        uint256 USDAmount = value.mul(exchangeRate).div(10**this.decimals());
        liquidity -= USDAmount;

        // subtract linear fee
        uint256 percentFee = maxFee.mul(getWithdrawFee()).div(
            10**this.decimals()
        );
        lastWithdraw[msg.sender] = block.number;

        uint256 fee = USDAmount.mul(percentFee).div(10**this.decimals());
        USDAmount -= fee;

        USDC.safeTransfer(owner(), fee);
        USDC.safeTransfer(msg.sender, USDAmount);
    }

    function getWithdrawFee() public view returns (uint256) {
        if (block.number >= lastWithdraw[msg.sender] + blockTimeout) {
            return 0;
        }

        uint256 fee = 1**this.decimals();
        uint256 penaltyCompletion = block.number - lastWithdraw[msg.sender];
        penaltyCompletion = penaltyCompletion.mul(10**this.decimals()).div(
            blockTimeout
        );

        fee = fee.mul((10**this.decimals()).sub(penaltyCompletion));

        return fee;
    }
}
