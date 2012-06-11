var model = require('./model');
//var collection = require('./collection');

// our awesome export products
exports = module.exports = {
    Model:             model.Model,
    ProxiedModel:      model.ProxiedModel,
    proxyModel:        model.proxyModel,
    //Collection:        collection.Collection,
    //ProxiedCollection: collection.ProxiedCollection,
    //proxyCollection:   collection.proxyCollection
};
