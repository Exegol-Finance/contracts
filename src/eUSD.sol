// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract eUSD is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    IERC20Upgradeable public USDC;

    address public feeRecipient;
    uint256 private liquidity;
    uint256 public maxFee;

    uint256 public exchangeRate; // eUSD per USDC
    mapping(address => uint256) public lastWithdraw; // address to block number
    uint256 public blockTimeout;

    function initialize(address _USDCAddress, uint256 _blockTimeout)
        public
        initializer
    {
        __ERC20_init("eUSD", "eUSD");
        __Ownable_init();
        USDC = IERC20Upgradeable(_USDCAddress); // USDC mainnet address
        feeRecipient = msg.sender;
        liquidity = 0;
        exchangeRate = 10**6;
        maxFee = 0.1 * (10**6);
        blockTimeout = _blockTimeout; //blocks (around 21 days for mainnet)
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function availableLiquidity() public view returns (uint256) {
        return liquidity;
    }

    function withdrawLiquidity(uint256 value) public onlyOwner {
        require(value <= liquidity, "Not enough liquidity to withdraw");
        liquidity -= value;
        USDC.safeTransfer(this.owner(), value);
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
        if (lastWithdraw[msg.sender] <= 0) {
            lastWithdraw[msg.sender] = block.number; // begin initial lock
        }

        _mint(msg.sender, value.mul(10**this.decimals()).div(exchangeRate));
    }

    // value = number of eUSD to burn
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
