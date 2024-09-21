// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PredictionMarket {

    enum Outcome { Undecided, TrueOutcome, FalseOutcome, InvalidOutcome }

    string public description;
    address public oracle;
    Outcome public marketOutcome;
    bool public isSettled;
    mapping(address => uint256) public trueBets;
    mapping(address => uint256) public falseBets;
    uint256 public totalTrueBets;
    uint256 public totalFalseBets;

    event BetPlaced(address indexed bettor, uint256 amount, bool indexed betOnTrue);
    event MarketSettled(Outcome outcome);
    event WinningsWithdrawn(address indexed bettor, uint256 amount);

    constructor(string memory _description, address _oracle) {
        description = _description;
        oracle = _oracle;
        marketOutcome = Outcome.Undecided;
        isSettled = false;
    }

    function betTrue() external payable {
        require(!isSettled, "Market already settled");
        require(msg.value > 0, "Must send ETH to bet");

        trueBets[msg.sender] += msg.value;
        totalTrueBets += msg.value;

        emit BetPlaced(msg.sender, msg.value, true);
    }

    function betFalse() external payable {
        require(!isSettled, "Market already settled");
        require(msg.value > 0, "Must send ETH to bet");

        falseBets[msg.sender] += msg.value;
        totalFalseBets += msg.value;

        emit BetPlaced(msg.sender, msg.value, false);
    }

    function settleMarket(Outcome _outcome) external {
        require(msg.sender == oracle, "Only oracle can settle market");
        require(!isSettled, "Market already settled");
        require(
            _outcome == Outcome.TrueOutcome || 
            _outcome == Outcome.FalseOutcome || 
            _outcome == Outcome.InvalidOutcome, 
            "Invalid outcome"
        );

        marketOutcome = _outcome;
        isSettled = true;

        emit MarketSettled(_outcome);
    }

    function withdrawWinnings() external {
        require(isSettled, "Market not yet settled");
        uint256 payout = 0;

        if (marketOutcome == Outcome.TrueOutcome && trueBets[msg.sender] > 0) {
            payout = (address(this).balance * trueBets[msg.sender]) / totalTrueBets;
            trueBets[msg.sender] = 0;
        } else if (marketOutcome == Outcome.FalseOutcome && falseBets[msg.sender] > 0) {
            payout = (address(this).balance * falseBets[msg.sender]) / totalFalseBets;
            falseBets[msg.sender] = 0;
        } else if (marketOutcome == Outcome.InvalidOutcome) {
            uint256 totalBet = trueBets[msg.sender] + falseBets[msg.sender];
            payout = totalBet;
            trueBets[msg.sender] = 0;
            falseBets[msg.sender] = 0;
        } else {
            revert("No winnings to withdraw");
        }

        require(payout > 0, "No payout available");
        payable(msg.sender).transfer(payout);

        emit WinningsWithdrawn(msg.sender, payout);
    }
}