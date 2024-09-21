const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket", function () {
  let PredictionMarket;
  let market;
  let owner;
  let oracle;
  let bettor1;
  let bettor2;

  beforeEach(async function () {
    [owner, oracle, bettor1, bettor2] = await ethers.getSigners();
    PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    market = await PredictionMarket.deploy("Will it rain tomorrow?", oracle.address);
  });

  describe("Deployment", function () {
    it("Should set the correct description and oracle", async function () {
      expect(await market.description()).to.equal("Will it rain tomorrow?");
      expect(await market.oracle()).to.equal(oracle.address);
    });

    it("Should initialize with correct default values", async function () {
      expect(await market.marketOutcome()).to.equal(0); // Undecided
      expect(await market.isSettled()).to.be.false;
      expect(await market.totalTrueBets()).to.equal(0);
      expect(await market.totalFalseBets()).to.equal(0);
    });
  });

  describe("Betting", function () {
    it("Should allow betting on true outcome", async function () {
      await expect(market.connect(bettor1).betTrue({ value: ethers.utils.parseEther("1") }))
        .to.emit(market, "BetPlaced")
        .withArgs(bettor1.address, ethers.utils.parseEther("1"), true);

      expect(await market.trueBets(bettor1.address)).to.equal(ethers.utils.parseEther("1"));
      expect(await market.totalTrueBets()).to.equal(ethers.utils.parseEther("1"));
    });

    it("Should allow betting on false outcome", async function () {
      await expect(market.connect(bettor2).betFalse({ value: ethers.utils.parseEther("2") }))
        .to.emit(market, "BetPlaced")
        .withArgs(bettor2.address, ethers.utils.parseEther("2"), false);

      expect(await market.falseBets(bettor2.address)).to.equal(ethers.utils.parseEther("2"));
      expect(await market.totalFalseBets()).to.equal(ethers.utils.parseEther("2"));
    });

    it("Should not allow betting after market is settled", async function () {
      await market.connect(oracle).settleMarket(1); // TrueOutcome
      await expect(market.connect(bettor1).betTrue({ value: ethers.utils.parseEther("1") }))
        .to.be.revertedWith("Market already settled");
    });
  });

  describe("Settling the market", function () {
    it("Should only allow oracle to settle the market", async function () {
      await expect(market.connect(bettor1).settleMarket(1))
        .to.be.revertedWith("Only oracle can settle market");

      await expect(market.connect(oracle).settleMarket(1))
        .to.emit(market, "MarketSettled")
        .withArgs(1); // TrueOutcome

      expect(await market.isSettled()).to.be.true;
      expect(await market.marketOutcome()).to.equal(1);
    });

    it("Should not allow settling with invalid outcome", async function () {
      await expect(market.connect(oracle).settleMarket(0))
        .to.be.revertedWith("Invalid outcome");
    });

    it("Should not allow settling twice", async function () {
      await market.connect(oracle).settleMarket(1);
      await expect(market.connect(oracle).settleMarket(2))
        .to.be.revertedWith("Market already settled");
    });
  });

  describe("Withdrawing winnings", function () {
    beforeEach(async function () {
      await market.connect(bettor1).betTrue({ value: ethers.utils.parseEther("1") });
      await market.connect(bettor2).betFalse({ value: ethers.utils.parseEther("2") });
    });

    it("Should allow winners to withdraw when true outcome", async function () {
      await market.connect(oracle).settleMarket(1); // TrueOutcome

      await expect(market.connect(bettor1).withdrawWinnings())
        .to.emit(market, "WinningsWithdrawn")
        .withArgs(bettor1.address, ethers.utils.parseEther("3"));

      expect(await ethers.provider.getBalance(market.address)).to.equal(0);
    });

    it("Should allow winners to withdraw when false outcome", async function () {
      await market.connect(oracle).settleMarket(2); // FalseOutcome

      await expect(market.connect(bettor2).withdrawWinnings())
        .to.emit(market, "WinningsWithdrawn")
        .withArgs(bettor2.address, ethers.utils.parseEther("3"));

      expect(await ethers.provider.getBalance(market.address)).to.equal(0);
    });

    it("Should allow all bettors to withdraw when invalid outcome", async function () {
      await market.connect(oracle).settleMarket(3); // InvalidOutcome

      await expect(market.connect(bettor1).withdrawWinnings())
        .to.emit(market, "WinningsWithdrawn")
        .withArgs(bettor1.address, ethers.utils.parseEther("1"));

      await expect(market.connect(bettor2).withdrawWinnings())
        .to.emit(market, "WinningsWithdrawn")
        .withArgs(bettor2.address, ethers.utils.parseEther("2"));

      expect(await ethers.provider.getBalance(market.address)).to.equal(0);
    });

    it("Should not allow withdrawing if not a winner", async function () {
      await market.connect(oracle).settleMarket(1); // TrueOutcome

      await expect(market.connect(bettor2).withdrawWinnings())
        .to.be.revertedWith("No winnings to withdraw");
    });

    it("Should not allow withdrawing twice", async function () {
      await market.connect(oracle).settleMarket(1); // TrueOutcome

      await market.connect(bettor1).withdrawWinnings();

      await expect(market.connect(bettor1).withdrawWinnings())
        .to.be.revertedWith("No winnings to withdraw");
    });
  });
});

describe("PredictionMarketFactory", function () {
  let PredictionMarketFactory;
  let factory;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    PredictionMarketFactory = await ethers.getContractFactory("PredictionMarketFactory");
    factory = await PredictionMarketFactory.deploy();
  });

  describe("Market creation", function () {
    it("Should create a new market", async function () {
      await expect(factory.createMarket("Will ETH price reach $5000 this year?"))
        .to.emit(factory, "MarketCreated")
        .withArgs(owner.address, await factory.markets(0), "Will ETH price reach $5000 this year?");

      const markets = await factory.getMarkets();
      expect(markets.length).to.equal(1);
    });

    it("Should allow creating multiple markets", async function () {
      await factory.createMarket("Market 1");
      await factory.createMarket("Market 2");
      await factory.createMarket("Market 3");

      const markets = await factory.getMarkets();
      expect(markets.length).to.equal(3);
    });
  });

  describe("Market retrieval", function () {
    it("Should return all created markets", async function () {
      await factory.createMarket("Market 1");
      await factory.createMarket("Market 2");

      const markets = await factory.getMarkets();
      expect(markets.length).to.equal(2);

      const market1 = await ethers.getContractAt("PredictionMarket", markets[0]);
      const market2 = await ethers.getContractAt("PredictionMarket", markets[1]);

      expect(await market1.description()).to.equal("Market 1");
      expect(await market2.description()).to.equal("Market 2");
    });
  });
});