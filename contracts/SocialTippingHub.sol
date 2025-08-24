// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SocialTippingHub
 * @dev Main contract for the Sei Social Tipping Agent
 * Handles tips, creator profiles, and treasury management
 */
contract SocialTippingHub is Ownable, ReentrancyGuard {
    
    struct Creator {
        address wallet;
        string platform;
        string username;
        uint256 totalTipsReceived;
        uint256 qualityScore;
        uint256 stakingPool;
        bool hasToken;
        address tokenAddress;
    }
    
    struct Tip {
        address from;
        address to;
        uint256 amount;
        string contentId;
        string platform;
        uint256 qualityScore;
        uint256 timestamp;
    }
    
    struct TreasuryAllocation {
        uint256 tipping;
        uint256 lending;
        uint256 staking;
        uint256 trading;
        uint256 liquidity;
    }
    
    // State variables
    mapping(string => Creator) public creators; // platformId => Creator
    mapping(address => uint256) public creatorBalances;
    Tip[] public tips;
    
    uint256 public totalTipped;
    uint256 public treasuryBalance;
    TreasuryAllocation public allocation;
    
    // Events
    event TipSent(
        address indexed from,
        address indexed to,
        uint256 amount,
        string contentId,
        uint256 qualityScore
    );
    
    event CreatorRegistered(
        string platformId,
        address wallet,
        string platform,
        string username
    );
    
    event TreasuryRebalanced(
        uint256 tipping,
        uint256 lending,
        uint256 staking,
        uint256 trading,
        uint256 liquidity
    );
    
    event CreatorTokenDeployed(
        string platformId,
        address tokenAddress
    );
    
    constructor() {
        // Initialize default allocation (percentages)
        allocation = TreasuryAllocation({
            tipping: 40,
            lending: 20,
            staking: 20,
            trading: 10,
            liquidity: 10
        });
    }
    
    /**
     * @dev Register a new creator
     */
    function registerCreator(
        string memory platformId,
        address wallet,
        string memory platform,
        string memory username
    ) external onlyOwner {
        require(creators[platformId].wallet == address(0), "Creator already registered");
        
        creators[platformId] = Creator({
            wallet: wallet,
            platform: platform,
            username: username,
            totalTipsReceived: 0,
            qualityScore: 50,
            stakingPool: 0,
            hasToken: false,
            tokenAddress: address(0)
        });
        
        emit CreatorRegistered(platformId, wallet, platform, username);
    }
    
    /**
     * @dev Send a tip to a creator
     */
    function sendTip(
        string memory platformId,
        string memory contentId,
        uint256 qualityScore
    ) external payable nonReentrant {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(creators[platformId].wallet != address(0), "Creator not registered");
        require(qualityScore <= 100, "Invalid quality score");
        
        Creator storage creator = creators[platformId];
        
        // Update creator metrics
        creator.totalTipsReceived += msg.value;
        creator.qualityScore = (creator.qualityScore * 80 + qualityScore * 20) / 100;
        
        // Transfer tip to creator
        creatorBalances[creator.wallet] += msg.value;
        
        // Record tip
        tips.push(Tip({
            from: msg.sender,
            to: creator.wallet,
            amount: msg.value,
            contentId: contentId,
            platform: creator.platform,
            qualityScore: qualityScore,
            timestamp: block.timestamp
        }));
        
        totalTipped += msg.value;
        
        emit TipSent(msg.sender, creator.wallet, msg.value, contentId, qualityScore);
    }
    
    /**
     * @dev Withdraw accumulated tips
     */
    function withdrawTips() external nonReentrant {
        uint256 balance = creatorBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        creatorBalances[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Stake in creator pool
     */
    function stakeInCreator(string memory platformId) external payable {
        require(msg.value > 0, "Stake amount must be greater than 0");
        require(creators[platformId].wallet != address(0), "Creator not registered");
        
        creators[platformId].stakingPool += msg.value;
        treasuryBalance += msg.value;
    }
    
    /**
     * @dev Deploy creator token
     */
    function deployCreatorToken(
        string memory platformId,
        address tokenAddress
    ) external onlyOwner {
        require(creators[platformId].wallet != address(0), "Creator not registered");
        require(!creators[platformId].hasToken, "Token already deployed");
        
        creators[platformId].hasToken = true;
        creators[platformId].tokenAddress = tokenAddress;
        
        emit CreatorTokenDeployed(platformId, tokenAddress);
    }
    
    /**
     * @dev Update treasury allocation
     */
    function updateAllocation(
        uint256 _tipping,
        uint256 _lending,
        uint256 _staking,
        uint256 _trading,
        uint256 _liquidity
    ) external onlyOwner {
        require(
            _tipping + _lending + _staking + _trading + _liquidity == 100,
            "Allocation must sum to 100"
        );
        
        allocation = TreasuryAllocation({
            tipping: _tipping,
            lending: _lending,
            staking: _staking,
            trading: _trading,
            liquidity: _liquidity
        });
        
        emit TreasuryRebalanced(_tipping, _lending, _staking, _trading, _liquidity);
    }
    
    /**
     * @dev Get creator info
     */
    function getCreator(string memory platformId) external view returns (Creator memory) {
        return creators[platformId];
    }
    
    /**
     * @dev Get total tips count
     */
    function getTipsCount() external view returns (uint256) {
        return tips.length;
    }
    
    /**
     * @dev Get tip by index
     */
    function getTip(uint256 index) external view returns (Tip memory) {
        require(index < tips.length, "Invalid index");
        return tips[index];
    }
    
    /**
     * @dev Get treasury stats
     */
    function getTreasuryStats() external view returns (
        uint256 _treasuryBalance,
        uint256 _totalTipped,
        TreasuryAllocation memory _allocation
    ) {
        return (treasuryBalance, totalTipped, allocation);
    }
    
    /**
     * @dev Deposit to treasury
     */
    function depositToTreasury() external payable onlyOwner {
        treasuryBalance += msg.value;
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    receive() external payable {
        treasuryBalance += msg.value;
    }
}