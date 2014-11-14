var settings = require('./settings.json');
var Cryptsy = require('cryptsy-api');

exports.Market = function() {
    var market = function() {};
    market.cryptsy = new Cryptsy(settings.keys.public, settings.keys.private);
    market.updating = false;

    market.coin = "";
    market.tradecoin = "";
    market.market = null;

    market.sellOrders = [];
    market.buyOrders = [];

    market.getLabel = function() {
        return market.coin + "/" + market.tradecoin
    }

    market.update = function (callback) {
        //console.log("Updating market " + market.getLabel() + "...");
        market.updating = true;

        //async to cryptsy
        market.cryptsy.marketorders(market.market.marketid, function (result) {
            market.sellOrders = result.sellorders;
            market.buyOrders = result.buyorders;
            market.updating = false;
            //console.log("Market " + market.getLabel() + " updated.");
            //console.log("Sell: " + market.sellOrders[0].sellprice);
            //console.log("Buy: " + market.buyOrders[0].buyprice);
            callback();
        });
    }

    // get[x]BuyPrice - gets a current BTC buy price in BTC for 1 coin.
    // Returns the highest amount of BTC to buy 1 coin for the amount given.
    // So for example I want to buy 10000 DOGE coins, this gives me the worst per
    // coin price for buying DOGE if I bought 10000 of them.
    market.getPriceEachToBuy = function (amount) {
        var amountCounted = 0;
        var lastPrice = 0;

        var x = 0;
        while (amountCounted <= amount) {
            var order = market.sellOrders[x];
            amountCounted = Number(amountCounted) + Number(order.quantity);
            lastPrice = order.sellprice;
            x++;
        }

        return lastPrice;
    }

    // get[x]SellPrice gets sell price in BTC for 1 coin.
    // Returns the lowest amount of BTC to sell 1 coin for the amount given.
    // So if I'm going to sell 10000 DOGE coin, this is the amount I'll get for selling
    // the last one.
    market.getPriceEachToSell = function (amount) {
        var amountCounted = 0;
        var lastPrice = 0;

        var x = 0;
        while (amountCounted <= amount) {
            var order = market.buyOrders[x];
            amountCounted = Number(amountCounted) + Number(order.quantity);
            if (lastPrice == 0)
            {
                lastPrice = order.buyprice;
            }
            x++;
        }

        return lastPrice;
    }

    return market;
}