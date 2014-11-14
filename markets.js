/**
 * Created by james on 3/3/14.
 */
var Cryptsy = require('cryptsy-api');
var settings = require('./settings.json');
var async = require("async");
var _ = require("underscore");
var marketModule = require("./market.js");
var tradeModule = require("./trade.js");
var transactionModule = require("./transaction.js");

exports.Markets = function() {
    var markets = function() {};
    markets.cryptsy = new Cryptsy(settings.keys.public, settings.keys.private);
    markets.markets = [];
    markets.wallet = null;

    markets.updating = false;
    markets.updating = false;
    markets.dataProcessing = false;
    markets.walletUpdating = false;
    markets.walletProcessed = false;

    markets.tradeMarkets = [];
    markets.btcLtcCoins = [];
    markets.tradeQueue = [];
    markets.tradeTestQueue = [];
    markets.tradeExecuteQueue = [];
    markets.activeTradeCoins = [];

    //Updates list of markets available on cryptsy
    //calls markets.findTradeMarkets();
    markets.updateMarkets = function () {
        console.log("Updating markets...");
        markets.updating = true;

        //async to cryptsy
        markets.cryptsy.getmarkets(function (result) {
            markets.markets = result;
            markets.updating = false;
            console.log("Markets updated.");
            markets.findTradeMarkets();
        });
    }

    //Parses markets.markets and sets up base market records in
    // markets.tradeMarkets[]
    markets.findTradeMarkets = function() {
        // --------------------------------------------------------------------
        // -- find all ltc/btc tradable altcoins
        var tmpMarkets = [];

        //build array of ltc markets
        _.each(markets.markets, function(m) {
            if (m.secondary_currency_code == "LTC") {
                tmpMarkets.push(m);
            }
        });

        //loop over ltc markets and look for like btc markets
        _.each(tmpMarkets, function(m){
            _.each(markets.markets, function(sm){
                if (m.primary_currency_code == sm.primary_currency_code && sm.secondary_currency_code == "BTC") {

                    var ltcmarket = new marketModule.Market();
                    var btcmarket = new marketModule.Market();
                    ltcmarket.coin = m.primary_currency_code;
                    ltcmarket.tradecoin = m.secondary_currency_code;
                    ltcmarket.market = m;

                    btcmarket.coin = sm.primary_currency_code;
                    btcmarket.tradecoin = sm.secondary_currency_code;
                    btcmarket.market = sm;

                    markets.tradeMarkets.push(ltcmarket);
                    markets.tradeMarkets.push(btcmarket);
                    markets.btcLtcCoins.push(m.primary_currency_code);
                }
            });
        });

        //Add in BTC/LTC market
        _.each(markets.markets, function(m) {
            if (m.primary_currency_code == "LTC" && m.secondary_currency_code == "BTC") {
                var nm = new marketModule.Market();
                nm.coin = "LTC";
                nm.tradecoin = "BTC";
                nm.market = m;
                markets.tradeMarkets.push(nm);
            }
        });
        console.log(markets.tradeMarkets.length + " markets found.");
    }

    markets.updateMarketData = function () {
        var tasks = [];
        var fn = null;
        console.log("++++ Updating market tradeMarkets... ++++");
        markets.updating = true;

        //needs to async through list of markets and call update
        // on each one
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        async.forEachLimit(markets.tradeMarkets, 25, function(mkt, callback) {
            mkt.update(callback);
        }, function(err) {
            markets.updating = false;
            console.log("++++ All Market tradeMarkets updated. ++++");
        });
    }

    markets.buildTradeList = function() {
        console.log("##################### Building trade list...");
        markets.dataProcessing = true;
        //---------------------------------------------------------------------
        //loop over btcLtc markets and set up orders
        async.forEachLimit(markets.btcLtcCoins, 10, function(coin, callback) {
            console.log("====Building trade: " + coin);
            var btcMarket = _.findWhere(markets.tradeMarkets, { coin: coin, tradecoin: "BTC"});
            var ltcMarket = _.findWhere(markets.tradeMarkets, { coin: coin, tradecoin: "LTC"});
            var btcLtcMarket = _.findWhere(markets.tradeMarkets, { coin: "LTC", tradecoin: "BTC"});
            async.parallel([btcMarket.update, ltcMarket.update, btcLtcMarket.update], function() {

                //build btc alt ltc btc trade ---------------------------------
                {
                    var t = new tradeModule.Trade();
                    var t0 = new transactionModule.Transaction(); //buy altcoin for btc
                    var t1 = new transactionModule.Transaction(); //sell altcoin for ltc
                    var t2 = new transactionModule.Transaction(); //sell ltc for btc

                    t0.type = "buy";
                    t0.coin = coin;
                    t0.tradecoin = "BTC";
                    t0.amount = markets.getMinimumTradeVolume(t0.coin);
                    t0.price = btcMarket.getPriceEachToBuy(t0.amount);
                    t.transactions.push(t0);

                    t1.type = "sell";
                    t1.coin = t0.coin;
                    t1.tradecoin = "LTC";
                    t1.amount = t0.amount;
                    t1.price = ltcMarket.getPriceEachToSell(t1.amount);
                    t.transactions.push(t1);

                    t2.type = "sell";
                    t2.coin = "LTC";
                    t2.tradecoin = "BTC";
                    t2.amount = t1.getTotalTradeCoinWithFees();
                    t2.price = btcLtcMarket.getPriceEachToSell(t2.amount);
                    t.transactions.push(t2);

                    markets.tradeTestQueue.push(t);
                }

                {
                    var t = new tradeModule.Trade();
                    var t0 = new transactionModule.Transaction(); //buy altcoin for btc
                    var t1 = new transactionModule.Transaction(); //sell altcoin for ltc
                    var t2 = new transactionModule.Transaction(); //sell ltc for btc

                    //calculate amount of coin to buy in ltc
                    var minTrade = markets.getMinimumTradeVolume(coin);
                    var t1t = new transactionModule.Transaction();
                    var ltcNeeded = 0;

                    t1t.type = "buy";
                    t1t.coin = coin;
                    t1t.tradecoin = "LTC"
                    t1t.amount = minTrade;
                    t1t.price = ltcMarket.getPriceEachToBuy(t1t.amount);
                    ltcNeeded = t1t.getTotalTradeCoinWithFees();

                    // Build trade to test
                    t0.type = "buy";
                    t0.coin = "LTC";
                    t0.tradecoin = "BTC";
                    t0.amount = ltcNeeded;
                    t0.price = btcLtcMarket.getPriceEachToBuy(ltcNeeded);
                    t.transactions.push(t0);

                    t1.type = "buy";
                    t1.coin = coin;
                    t1.tradecoin = "LTC";
                    t1.amount = minTrade;
                    t1.price = ltcMarket.getPriceEachToBuy(t1.amount);
                    t.transactions.push(t1);

                    t2.type = "sell";
                    t2.coin = t1.coin;
                    t2.tradecoin = "BTC";
                    t2.amount = minTrade;
                    t2.price = btcMarket.getPriceEachToSell(t2.amount);
                    t.transactions.push(t2);

                    markets.tradeTestQueue.push(t);
                }

                console.log("====Done Building trade: " + coin);
                callback();
            });
        }, function(err) {
            markets.dataProcessing = false;
        });
    }

    markets.testTrade = function(trade) {
        var profit = trade.getProfit();
        if (profit > 0) {
            console.log("   +++ Profitable trade! +++ Profit: " + profit.toFixed(8));
            _.each(trade.transactions, function(t){
                console.log("Type: " + t.type + " " + t.coin + "/" + t.tradecoin + " Amount: " + t.amount.toFixed(8) + " Price: " + t.price + " TradeCoin + Fees:" + t.getTotalTradeCoinWithFees().toFixed(8));
            });
            if (!markets.activeTradeCoins[trade.coin]) {
                console.log("Queueing profitable transaction.");
                markets.activeTradeCoins[trade.coin] = true;
            } else {
                console.log("Active trade in coin " + trade.coin + " unable to queue trade.");
            }
        } else {
            //console.log("   --- Loosing trade! --- Loss: " + profit.toFixed(8));
            //_.each(trade.transactions, function(t){
            //    console.log("Type: " + t.type + " " + t.coin + "/" + t.tradecoin + " Amount: " + t.amount.toFixed(8) + " Price: " + t.price + " TradeCoin + Fees:" + t.getTotalTradeCoinWithFees().toFixed(8));
            //});
        }
    }

    // Returns the minimum trade volume for trading the specified coin.
    // Looks at the coins buy and sell, and it's conversion to and from
    // LTC and will return the lowest amount of coin than can be currently traded.

    //Returns the minimum trade amount of coin to be able to liquidate LTC
    // therefore the minimum trade volume
    markets.getMinimumTradeVolume = function (coin) {
        var coinmin = settings.coins[coin].min;
        var ltcMin = settings.coins["LTC"].min;
        var result = 0;
        var coinLtcMarketLabel = coin + "/LTC";

        if (coinLtcMarketLabel in markets.markets) {
            result = coinmin;
        }
        else
        {
            var sellPrice = 0;
            var totalSellPrice = 0;
            result = coinmin;

            //start with the minimum size for each coin
            sellPrice = _.findWhere(markets.tradeMarkets, { coin: coin, tradecoin: "LTC"}).getPriceEachToSell(result);
            totalSellPrice = result * sellPrice;

            //If that's not enough to sell LTC, then multiply it to be enough
            if (totalSellPrice < ltcMin) {
                var multiplier = ltcMin / totalSellPrice;
                result = result * multiplier;
            }
        }

        result = result + (result * 0.01);
        return result;
    }

    return markets;
}