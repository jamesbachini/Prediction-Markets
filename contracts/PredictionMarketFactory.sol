// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PredictionMarket.sol";

contract PredictionMarketFactory {

    event MarketCreated(address indexed creator, address marketAddress, string description);

    address[] public markets;

    function createMarket(string memory _description) external {
        PredictionMarket market = new PredictionMarket(_description, msg.sender);
        markets.push(address(market));
        emit MarketCreated(msg.sender, address(market), _description);
    }

    function getMarkets() external view returns (address[] memory) {
        return markets;
    }
}