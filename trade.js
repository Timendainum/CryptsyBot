var _ = require("underscore");

exports.Trade = function()
{
    var trade = function() {};
    trade.transactions = [];
    trade.processing = false;
    trade.processStep = 0;

    trade.getProfit = function() {
        if (trade.transactions[0].tradecoin == trade.transactions[trade.transactions.length - 1].tradecoin) {
            return trade.transactions[trade.transactions.length - 1].getTotalTradeCoinWithFees() - trade.transactions[0].getTotalTradeCoinWithFees();
        } else {
            throw new Error("Unable to calculate profit on unlike coins.");
        }
    }

    //return result
    return trade;
}
