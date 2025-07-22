// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CreatorToken
 * @dev ERC20 token for content creators
 */
contract CreatorToken is ERC20, Ownable {
    
    address public creator;
    address public tippingHub;
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18; // 1M tokens
    
    mapping(address => uint256) public stakingBalance;
    mapping(address => uint256) public stakingTimestamp;
    
    uint256 public totalStaked;
    uint256 public rewardRate = 100; // 100 basis points = 1% per day
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    
    constructor(
        string memory name,
        string memory symbol,
        address _creator,
        address _tippingHub
    ) ERC20(name, symbol) {
        creator = _creator;
        tippingHub = _tippingHub;
        
        // Mint initial supply
        // 40% to creator, 30% to tipping hub, 30% for liquidity
        _mint(_creator, INITIAL_SUPPLY * 40 / 100);
        _mint(_tippingHub, INITIAL_SUPPLY * 30 / 100);
        _mint(msg.sender, INITIAL_SUPPLY * 30 / 100); // For liquidity
    }
    
    /**
     * @dev Stake tokens to earn rewards
     */
    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Calculate pending rewards if already staking
        if (stakingBalance[msg.sender] > 0) {
            uint256 reward = calculateReward(msg.sender);
            if (reward > 0) {
                _mint(msg.sender, reward);
            }
        }
        
        _transfer(msg.sender, address(this), amount);
        stakingBalance[msg.sender] += amount;
        stakingTimestamp[msg.sender] = block.timestamp;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @dev Unstake tokens and claim rewards
     */
    function unstake() external {
        uint256 balance = stakingBalance[msg.sender];
        require(balance > 0, "No staked balance");
        
        uint256 reward = calculateReward(msg.sender);
        
        stakingBalance[msg.sender] = 0;
        stakingTimestamp[msg.sender] = 0;
        totalStaked -= balance;
        
        _transfer(address(this), msg.sender, balance);
        if (reward > 0) {
            _mint(msg.sender, reward);
        }
        
        emit Unstaked(msg.sender, balance, reward);
    }
    
    /**
     * @dev Calculate pending rewards
     */
    function calculateReward(address user) public view returns (uint256) {
        if (stakingBalance[user] == 0) {
            return 0;
        }
        
        uint256 stakingDuration = block.timestamp - stakingTimestamp[user];
        uint256 dailyReward = stakingBalance[user] * rewardRate / 10000;
        uint256 reward = dailyReward * stakingDuration / 86400; // Convert to daily rate
        
        return reward;
    }
    
    /**
     * @dev Get staking info
     */
    function getStakingInfo(address user) external view returns (
        uint256 stakedBalance,
        uint256 pendingReward,
        uint256 stakingTime
    ) {
        return (
            stakingBalance[user],
            calculateReward(user),
            stakingTimestamp[user]
        );
    }
    
    /**
     * @dev Update reward rate (owner only)
     */
    function updateRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 1000, "Rate too high"); // Max 10% daily
        rewardRate = newRate;
    }
}