#!/usr/bin/env node
var async = require("async");
var _ = require("underscore");
var nc = require('ncurses');
//-----------------------------------------------------------------------------
var settings = require('./settings.json');
var marketsModule = require('./markets.js');
var walletModule = require('./wallet.js');
var markets = new marketsModule.Markets();
var wallet = new walletModule.Wallet();

var marketsUpdateRequest = true;
var marketUpdateRequest = false;
var walletUpdateRequested = true;

var main = function (callback) {
    // Get markets
    if (marketsUpdateRequest && !markets.updating) {
        markets.updateMarkets();
        marketsUpdateRequest = false;
    }

    // Update wallet
    if (walletUpdateRequested && !wallet.updating) {
        wallet.update();
        walletUpdateRequested = false;
    }

    // Update all market tradeMarkets
    if (marketUpdateRequest && !markets.updating && markets.tradeMarkets.length > 0) {
        markets.updateMarketData();
        marketUpdateRequest = false;
    }

    // Process market tradeMarkets
    if (markets.tradeMarkets.length > 0 && !markets.dataProcessing && markets.tradeQueue.length == 0)
    {
        markets.buildTradeList();
    }

    while (markets.tradeTestQueue.length > 0) {
        markets.testTrade(markets.tradeTestQueue.shift());
    }

    //temp reset
//    if (!marketUpdateRequest && !markets.updating)
//        marketUpdateRequest = true;

    setTimeout(callback, 100);
}

var end = function () {
    console.log("Program ended.");
}

//start this shit! ------------------------------------------------------------
async.forever(main, end);