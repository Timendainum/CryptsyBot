var settings = require('./settings.json');

exports.Transaction = function()
{
    var transaction = function() {};
    transaction.type = ""; // buy or sell
    transaction.coin = "";
    transaction.tradecoin = "";
    transaction.amount = 0;
    transaction.price = 0;

    transaction.getTotalTradeCoin = function() {
        return transaction.amount * this.price;
    }

    transaction.getFees = function() {
        var total = transaction.getTotalTradeCoin();
        var fee = 0;
        if (transaction.type == "buy") {
            fee = total * settings.fees.buy;
        } else if (transaction.type == "sell") {
            fee = total * settings.fees.sell;
        } else {
            throw new Error("Invalid trade.type when calling transaction.getFees()");
        }

        return fee;
    }

    transaction.getTotalTradeCoinWithFees = function() {
        var result =  transaction.getTotalTradeCoin();
        var fee = transaction.getFees();

        if (transaction.type == "buy") {
            result = result + fee;
        } else if (transaction.type == "sell") {
            result = result - fee;
        } else {
            throw new Error("Invalid trade.type when calling transaction.getTotalTradeCoinWithFees()");
        }
        return result;
    }

    //return result
    return transaction;
}