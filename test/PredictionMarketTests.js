const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket", function () {
  // Fixture to deploy the contracts before each test
  async function deployPredictionMarketFixture() {
    const [owner, bettor1, bettor2, oracle, otherAccount] = await ethers.getSigners();

    const description = "Will the price of ETH be above $3000 on 31st Dec 2026?";
    const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarketFactory");
    const PredictionMarket = await PredictionMarketFactory.createMarket(description);

    return { predictionMarket, description, owner, bettor1, bettor2, oracle, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the correct description and oracle", async function () {
      const { predictionMarket, description, oracle } = await deployPredictionMarketFixture();

      expect(await predictionMarket.description()).to.equal(description);
      expect(await predictionMarket.oracle()).to.equal(oracle.address);
    });

    it("Should initialize market outcome as Undecided and isSettled as false", async function () {
      const { predictionMarket } = await deployPredictionMarketFixture();

      expect(await predictionMarket.marketOutcome()).to.equal(0); // Outcome.Undecided
      expect(await predictionMarket.isSettled()).to.equal(false);
    });
  });

  describe("Betting", function () {
    it("Should allow users to place bets on True", async function () {
      const { predictionMarket, bettor1 } = await deployPredictionMarketFixture();

      await predictionMarket.connect(bettor1).betTrue({ value: ethers.utils.parseEther("1") });

      expect(await predictionMarket.trueBets(bettor1.address)).to.equal(ethers.utils.parseEther("1"));
      expect(await predictionMarket.totalTrueBets()).to.equal(ethers.utils.parseEther("1"));
    });

    it("Should allow users to place bets on False", async function () {
      const { predictionMarket, bettor1 } = await deployPredictionMarketFixture();

      await predictionMarket.connect(bettor1).betFalse({ value: ethers.utils.parseEther("1") });

      expect(await predictionMarket.falseBets(bettor1.address)).to.equal(ethers.utils.parseEther("1"));
      expect(await predictionMarket.totalFalseBets()).to.equal(ethers.utils.parseEther("1"));
    });

    it("Should emit BetPlaced event when placing a bet", async function () {
      const { predictionMarket, bettor1 } = await deployPredictionMarketFixture();

      await expect(predictionMarket.connect(bettor1).betTrue({ value: ethers.utils.parseEther("1") }))
        .to.emit(predictionMarket, "BetPlaced")
        .withArgs(bettor1.address, ethers.utils.parseEther("1"), true);
    });

    it("Should not allow betting after market is settled", async function () {
      const { predictionMarket, bettor1, oracle } = await deployPredictionMarketFixture();

      // Oracle settles the market
      await predictionMarket.connect(oracle).settleMarket(1); // Outcome.TrueOutcome

      await expect(predictionMarket.connect(bettor1).betTrue({ value: ethers.utils.parseEther("1") }))
        .to.be.revertedWith("Market already settled");
    });

    it("Should not allow zero ETH bets", async function () {
      const { predictionMarket, bettor1 } = await deployPredictionMarketFixture();

      await expect(predictionMarket.connect(bettor1).betTrue({ value: 0 }))
        .to.be.revertedWith("Must send ETH to bet");
    });
  });

  describe("Settlement", function () {
    it("Should allow only the oracle to settle the market", async function () {
      const { predictionMarket, bettor1 } = await deployPredictionMarketFixture();

      await expect(predictionMarket.connect(bettor1).settleMarket(1))
        .to.be.revertedWith("Only oracle can settle market");
    });

    it("Should not allow settling the market twice", async function () {
      const { predictionMarket, oracle } = await deployPredictionMarketFixture();

      await predictionMarket.connect(oracle).settleMarket(1); // Outcome.TrueOutcome

      await expect(predictionMarket.connect(oracle).settleMarket(1))
        .to.be.revertedWith("Market already settled");
    });

    it("Should set the market outcome and isSettled flag correctly", async function () {
      const { predictionMarket, oracle } = await deployPredictionMarketFixture();

      await predictionMarket.connect(oracle).settleMarket(1); // Outcome.TrueOutcome

      expect(await predictionMarket.marketOutcome()).to.equal(1);
      expect(await predictionMarket.isSettled()).to.equal(true);
    });

    it("Should emit MarketSettled event upon settlement", async function () {
      const { predictionMarket, oracle } = await deployPredictionMarketFixture();

      await expect(predictionMarket.connect(oracle).settleMarket(1))
        .to.emit(predictionMarket, "MarketSettled")
        .withArgs(1); // Outcome.TrueOutcome
    });
  });

  describe("Withdrawals", function () {
    it("Should allow winners to withdraw winnings", async function () {
      const { predictionMarket, bettor1, bettor2, oracle } = await deployPredictionMarketFixture();

      // Bettor1 bets 1 ETH on True
      await predictionMarket.connect(bettor1).betTrue({ value: ethers.utils.parseEther("1") });

      // Bettor2 bets 1 ETH on False
      await predictionMarket.connect(bettor2).betFalse({ value: ethers.utils.parseEther("1") });

      // Oracle settles the market as TrueOutcome
      await predictionMarket.connect(oracle).settleMarket(1); // Outcome.TrueOutcome

      const initialBalance = await ethers.provider.getBalance(bettor1.address);

      // Bettor1 withdraws winnings
      const tx = await predictionMarket.connect(bettor1).withdrawWinnings();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const finalBalance = await ethers.provider.getBalance(bettor1.address);

      expect(finalBalance.sub(initialBalance).add(gasUsed)).to.equal(ethers.utils.parseEther("2"));
    });

    it("Should not allow withdrawals before market is settled", async function () {
      const { predictionMarket, bettor1 } = await deployPredictionMarketFixture();

      await predictionMarket.connect(bettor1).betTrue({ value: ethers.utils.parseEther("1") });

      await expect(predictionMarket.connect(bettor1).withdrawWinnings())
        .to.be.revertedWith("Market not yet settled");
    });

    it("Should revert if user has no winnings to withdraw", async function () {
      const { predictionMarket, bettor1, oracle } = await deployPredictionMarketFixture();

      await predictionMarket.connect(oracle).settleMarket(1); // Outcome.TrueOutcome

      await expect(predictionMarket.connect(bettor1).withdrawWinnings())
        .to.be.revertedWith("No winnings to withdraw");
    });

    it("Should allow bettors to withdraw their bets if market outcome is InvalidOutcome", async function () {
      const { predictionMarket, bettor1, oracle } = await deployPredictionMarketFixture();

      // Bettor1 bets 1 ETH on True
      await predictionMarket.connect(bettor1).betTrue({ value: ethers.utils.parseEther("1") });

      // Oracle settles the market as InvalidOutcome
      await predictionMarket.connect(oracle).settleMarket(3); // Outcome.InvalidOutcome

      const initialBalance = await ethers.provider.getBalance(bettor1.address);

      // Bettor1 withdraws their bet
      const tx = await predictionMarket.connect(bettor1).withdrawWinnings();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const finalBalance = await ethers.provider.getBalance(bettor1.address);

      expect(finalBalance.sub(initialBalance).add(gasUsed)).to.equal(ethers.utils.parseEther("1"));
    });

    it("Should not allow withdrawing winnings twice", async function () {
      const { predictionMarket, bettor1, oracle } = await deployPredictionMarketFixture();

      await predictionMarket.connect(bettor1).betTrue({ value: ethers.utils.parseEther("1") });

      await predictionMarket.connect(oracle).settleMarket(1); // Outcome.TrueOutcome

      await predictionMarket.connect(bettor1).withdrawWinnings();

      await expect(predictionMarket.connect(bettor1).withdrawWinnings())
        .to.be.revertedWith("No payout available");
    });
  });
});

describe("PredictionMarketFactory", function () {
  async function deployPredictionMarketFactoryFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarketFactory");
    const factory = await PredictionMarketFactory.deploy();

    return { factory, owner, otherAccount };
  }

  it("Should allow creating new markets", async function () {
    const { factory, owner } = await deployPredictionMarketFactoryFixture();

    await expect(factory.createMarket("Market 1"))
      .to.emit(factory, "MarketCreated")
      .withArgs(owner.address, anyValue, "Market 1"); // anyValue is used for market address

    const markets = await factory.getMarkets();
    expect(markets.length).to.equal(1);
  });

  it("Should store the created markets", async function () {
    const { factory } = await deployPredictionMarketFactoryFixture();

    await factory.createMarket("Market 1");
    await factory.createMarket("Market 2");

    const markets = await factory.getMarkets();
    expect(markets.length).to.equal(2);
  });
});
