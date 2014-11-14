var Cryptsy = require('cryptsy-api');
var settings = require('./settings.json');

exports.Wallet = function() {
    var wallet = function() {};
    wallet.cryptsy = new Cryptsy(settings.keys.public, settings.keys.private);

    wallet.tradeMarkets = null;

    wallet.updating = false;
    wallet.updating = false;

    wallet.update = function () {
        console.log("Updating wallet...");
        wallet.updating = true;

        //async to cryptsy
        wallet.cryptsy.getinfo(function (result) {
            wallet.tradeMarkets = result;
            wallet.updating = false;
            console.log("Wallet updated.");
        });
    }

    return wallet;
}
