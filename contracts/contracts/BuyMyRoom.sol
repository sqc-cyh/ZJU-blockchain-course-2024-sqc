// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./MyERC20.sol";
contract BuyMyRoom is ERC721 {
    // 事件：当房屋被列出时触发
    event HouseListed(uint256 tokenId, uint256 price, address owner);
    // 事件：当房屋成功出售时触发
    event HouseSold(uint256 tokenId, uint256 price, address newOwner);
    // 事件：当房屋分配给用户时触发
    event HouseAssigned(uint256 tokenId, address newOwner);
    
    // 房屋信息结构
    struct House {
        uint256 tokenId;         // 房屋ID
        address owner;           // 房屋拥有者地址
        uint256 listedTimestamp; // 列出时间戳
        bool isForSale;         // 是否在出售
        uint256 price;          // 出售价格
    }

    // 存储房屋信息的映射，房屋ID到房屋信息的映射
    mapping(uint256 => House) public houses;
    mapping(address => bool) claimedAirdropPlayerList;
    address public contractOwner; // 合约的拥有者
    uint public currentTokenId = 0;    // 当前房屋NFT的ID计数器
    uint public feePercentage = 2;  // 平台手续费百分比（2%）
    uint public totalFeesCollected = 0;

    // 构造函数：初始化合约并设置名称和符号
    constructor() ERC721("BuyMyRoom", "BMR") {
        contractOwner = msg.sender; // 设置合约部署者为初始拥有者
        rewardtoken = new MyERC20("ZJUToken", "ZJUTokenSymbol");
    }

    // 修饰符：仅允许合约拥有者调用的函数
    modifier onlyOwner() {
        require(msg.sender == contractOwner, "Not the contract owner");
        _;
    }
    MyERC20 public rewardtoken;
    // // 列出房屋以供出售
    function listHouse(uint256 tokenId, uint256 price) external {
        // require(ownerOf(tokenId) == msg.sender, "You are not the owner"); // 确保调用者是房屋拥有者
        require(price > 0, "Price must be greater than zero"); // 确保价格大于零

        houses[tokenId].isForSale = true; // 设置房屋为出售状态
        houses[tokenId].price = price; // 设置出售价格
        houses[tokenId].listedTimestamp = block.timestamp; // 更新列出时间戳
        emit HouseListed(tokenId, price, msg.sender); // 触发事件
    }

    // 购买房屋
    // function buyHouse(uint256 tokenId) external payable {
    //     House memory house = houses[tokenId]; // 获取房屋信息
    //     require(house.isForSale, "House is not for sale"); // 确保房屋在出售
    //     require(msg.value >= house.price, "Insufficient funds"); // 确保支付足够的ETH

    //     uint256 fee = (msg.value * feePercentage) / 100; // 计算手续费
    //     payable(contractOwner).transfer(fee); // 将手续费转给合约拥有者
    //     payable(house.owner).transfer(msg.value - fee); // 将剩余款项转给房屋原所有者

    //     // 更新房屋信息
    //     _transfer(house.owner, msg.sender, tokenId); // 转移房屋所有权
    //     houses[tokenId].owner = msg.sender; // 更新房屋新拥有者
    //     houses[tokenId].isForSale = false; // 将房屋状态更新为不在出售

    //     emit HouseSold(tokenId, house.price, msg.sender); // 触发事件
    // }
    function buyHouse(uint256 tokenId) external {
        House memory house = houses[tokenId]; // 获取房屋信息
        require(house.isForSale, "House is not for sale"); // 确保房屋在出售

        // 计算手续费
        uint256 fee = ((block.timestamp-house.listedTimestamp)/5000 + house.price * feePercentage) / 100;
        uint256 netPrice = house.price - fee;

        // 转账 ERC20 代币
        rewardtoken.transferFrom(msg.sender, contractOwner, fee); // 支付手续费
        rewardtoken.transferFrom(msg.sender, house.owner, netPrice); // 支付房屋价格

        // 更新房屋信息
        _transfer(house.owner, msg.sender, tokenId); // 转移房屋所有权
        houses[tokenId].owner = msg.sender; // 更新房屋新拥有者
        houses[tokenId].isForSale = false; // 将房屋状态更新为不在出售

        emit HouseSold(tokenId, house.price, msg.sender); // 触发事件
    }

    // 获取房屋信息
    function getHouseInfo(uint256 tokenId) external view returns (House memory) {
        return houses[tokenId]; // 返回指定房屋的信息
    }

    // 获取当前房屋NFT的数量
    function totalSupply() external view returns (uint) {
        return currentTokenId; // 返回铸造的房屋NFT总数
    }

    // 获取所有正在出售的房屋的详细信息
    function getAllForSaleHouses() external view returns (House[] memory) {
        uint256 count = 0;
        // 先计算出售中的房产数量
        for (uint256 i = 0; i < currentTokenId; i++) {
            if (houses[i].isForSale) {
                count++;
            }
        }

        House[] memory forSaleHouses = new House[](count);
        uint256 index = 0;
        // 再次遍历，填充出售中的房产信息
        for (uint256 i = 0; i < currentTokenId; i++) {
            if (houses[i].isForSale) {
                forSaleHouses[index] = houses[i];
                index++;
            }
        }
        return forSaleHouses; // 返回所有正在出售的房屋的详细信息
    }

    // 管理员分配未被拥有的房屋给用户
    function assignThreeUnownedHousesToUser() external {
        require(!claimedAirdropPlayerList[msg.sender], "This user has claimed airdrop already");

        for (uint256 i = 0; i < 3; i++) {
            _mint(msg.sender, currentTokenId);
            houses[currentTokenId] = House(currentTokenId, msg.sender, block.timestamp, false, 0);
            currentTokenId++;
            emit HouseAssigned(currentTokenId, msg.sender);
        }

        claimedAirdropPlayerList[msg.sender] = true; // 更新状态
    }

    // 获取总手续费
    function getTotalFeesCollected() external view returns (uint) {
        return totalFeesCollected; // 返回总手续费
    }

    function helloworld() pure external returns(string memory) {
        return "hello world"; // 返回测试信息
    }

    // 转让合约所有权
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        contractOwner = newOwner; // 更新合约拥有者
    }
    // 兑换以太币为 ERC20 积分
    function buyTokens() external payable {
        require(msg.value > 0, "Must send ETH to buy tokens");
        uint256 tokensToMint = msg.value; // 计算应铸造的代币数量
        rewardtoken.mint(msg.sender, tokensToMint); // 铸造代币给用户
    }
    // 获取当前用户的ERC20积分余额
    function getUserTokenBalance() external view returns (uint256) {
        return rewardtoken.balanceOf(msg.sender); // 返回调用者的ERC20积分余额
    }
}