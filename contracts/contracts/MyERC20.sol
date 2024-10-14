// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyERC20 is ERC20 {
    // uint256 public exchangeRate; // 以太币到代币的兑换率
    address public owner; // 合约拥有者

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        owner = msg.sender; // 设置合约部署者为拥有者
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to the zero address");
        require(amount > 0, "Mint amount must be greater than zero");
        _mint(to, amount); // 铸造新代币
    }
}