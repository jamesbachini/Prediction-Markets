# Prediction Market Smart Contract

This project implements a decentralized prediction market on the Ethereum blockchain. Users can create markets, place bets on event outcomes, and withdraw winnings based on the results. The market outcome is decided by an oracle (the market creator), and the contract ensures fair settlement and transparent transactions.

Full tutorial at https://jamesbachini.com/prediction-markets-solidity/

## Features

- **Create Prediction Markets**: Users can create a new prediction market with a description and act as the oracle.
- **Place Bets**: Participants can place bets on `True` or `False` outcomes using ETH.
- **Settle Markets**: The oracle can settle the market once the event's outcome is known, setting the result to `True`, `False`, or `Invalid`.
- **Withdraw Winnings**: After settlement, participants can withdraw their winnings based on the outcome.

## Contracts

### PredictionMarket.sol
This contract handles the functionality of an individual prediction market. It allows users to bet on an outcome, settle the market, and withdraw winnings after settlement.

### PredictionMarketFactory.sol
This contract allows the creation of new `PredictionMarket` instances. It stores a list of all created markets and provides an easy way to manage multiple markets.

## Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/jamesbachini/Prediction-Markets.git
    cd prediction-market
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Compile contracts**:
    ```bash
    npx hardhat compile
    ```

4. **Run tests**:
    ```bash
    npx hardhat test
    ```

## License

This project is licensed under the MIT License.


## Links

- [Website](https://jamesbachini.com)
- [YouTube](https://www.youtube.com/c/JamesBachini?sub_confirmation=1)
- [Substack](https://bachini.substack.com)
- [Podcast](https://podcasters.spotify.com/pod/show/jamesbachini)
- [Spotify](https://open.spotify.com/show/2N0D9nvdxoe9rY3jxE4nOZ)
- [Twitter](https://twitter.com/james_bachini)
- [LinkedIn](https://www.linkedin.com/in/james-bachini/)
- [GitHub](https://github.com/jamesbachini)
