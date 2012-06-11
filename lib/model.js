var util         = require('util');
var _            = require('underscore');
var EventEmitter = require('events').EventEmitter;

// Find the Proxy Constructor to use
var ProxyCtor;
try {
    ProxyCtor = Proxy;
}
catch (error) {
    try {
        ProxyCtor = require('node-proxy');
    }
    catch(error) {
        console.error('You need to run node with --harmony_proxies enabled or have the node-proxy module installed');
        process.exit(1);
    }
}

// Quick reference to Object.prototype
var ObjProto = Object.prototype;

/**
 * Model implementation based on Backbone.js' Model implementation.
 *
 * The Model object uses an internal hash to store it's values and 
 * emits events on Model attribute changes.
 *
 * @param {Object} attributes   Initial attributes for the Model
 */
function Model(attributes) {
    // Set events hash now to prevent proxy trap
    this._events = {};

    // Call super constructor
    EventEmitter.call(this);
    attributes = attributes || {};

    // Separator for change events
    this._separator = ':';

    // Internal Object for storing attributes
    this.attributes = {};

    // Attributes that have changed since the last `change` was called.
    this._changed = {};
    // Hash of attributes that have changed silently since the last `change`
    // was called.
    this._silent  = {};
    // Hash of changed attributes that have changed since the last `change`
    // call began.
    this._pending = {};

    // Set initial attributes silently
    this.set(attributes, { silent: true });

    // Reset changes
    this._changes = {};
    this._silent  = {};
    this._pending = {};

    // Keep track of previous values (before the previous change call)
    this._previous = _.clone(this.attributes);

    // Call initialize logic
    this.initialize.apply(this, arguments);
}
util.inherits(Model, EventEmitter);

/**
 * Initialize logic for the Model. Override this method to implement your
 * own initialize logic.
 */
Model.prototype.initialize = function() {};

/**
 * Clone the Model. This will transfer all Model attributes to a new Model
 * instance.
 * @return Model
 */
Model.prototype.clone = function() {
    return new Model(this.attributes);
};

/**
 * Get the JSON representation of the Model
 * @return Object
 */
Model.prototype.toJSON = function() {
    return this.attributes;
};

/**
 * Check if the Model has an attribute specified by `name`.
 * @param {String} name
 * @return Boolean
 */
Model.prototype.has = function(name) {
    return ObjProto.hasOwnProperty.call(this.attributes, name);
};

/**
 * Get a value from the Model
 * @param {String} name
 * @return mixed            The value for the attribute or undefined
 */
Model.prototype.get = function(name) {
    if (this.has(name)) {
        return this.attributes[name];
    }
};

/**
 * Set a value on the Model
 * @param {Sting} name
 * @param Mixed value
 */
Model.prototype.set = function(name, value, options) {
    var attrs, attr, val;

    // Handle both `"key", value` and `{key: value}` -style arguments.
    if (_.isObject(name) || name == null) {
        attrs = name;
        options = value;
    } else {
        attrs = {};
        attrs[name] = value;
    }

    // Extract attributes and options.
    options || (options = {});
    if (!attrs) return this;
    if (options.unset) for (attr in attrs) attrs[attr] = void 0;

    var changes  = options.changes = {};
    var current  = this.attributes;
    var previous = this._previous || {};

    // For each `set` attribute...
    for (attr in attrs) {
        val = attrs[attr];

        // If the new and current value differ, record the change.
        if (!_.isEqual(current[attr], val) || (options.unset && _.has(now, attr))) {
            (options.silent ? this._silent : changes)[attr] = true;
        }

        // Update or delete the current value.
        options.unset ? delete current[attr] : current[attr] = val;

        // If the new and previous value differ, record the change. If not,
        // then remove changes for this attribute.
        if (!_.isEqual(previous[attr], val) || (_.has(current, attr) != _.has(previous, attr))) {
            this._changed[attr] = val;
            if (!options.silent) this._pending[attr] = true;
        } else {
            delete this._changed[attr];
            delete this._pending[attr];
        }
    }

    // Fire the `"change"` events.
    if (!options.silent) this.change(options);
    return this;
};

/**
 * Call this method to manually fire a `"change"` event for this model and
 * a `"change:attribute"` event for each changed attribute.
 * Calling this will cause all objects observing the model to update.
 * @param {Object} options
 */
Model.prototype.change = function(options) {
    options || (options = {});
    var changing = this._changing;
    this._changing = true;

    // Silent changes become pending changes.
    for (var attr in this._silent) this._pending[attr] = true;

    // Silent changes are triggered.
    var changes = _.extend({}, options.changes, this._silent);
    this._silent = {};
    for (var attr in changes) {
        this.emit('change' + this._separator + attr, this, this.get(attr), options);
    }
    if (changing) return this;

      // Continue firing `"change"` events while there are pending changes.
    while (!_.isEmpty(this._pending)) {
        this._pending = {};
        this.emit('change', this, options);
        // Pending and silent changes still remain.
        for (var attr in this.changed) {
            if (this._pending[attr] || this._silent[attr]) continue;
            delete this._changed[attr];
        }
        this._previousAttributes = _.clone(this.attributes);
    }

    this._changing = false;
    return this;
};

/**
 * Unset an attribute on the Model
 * @param {String} name
 * @param {Object} options
 * @return Boolean
 */
Model.prototype.unset = function(name, options) {
    options = _.extend({}, options, { unset: true });
    return this.set(name, null, options);
};

/**
 * Link attributes from a foreign object to the Model. Linked values set
 * on the Model will be transfered directly to the foreign Object.
 * @param {Object} linkMap
 * @param {Object} foreignObject
 * @param {Object} options
 */
Model.prototype.link = function(linkMap, foreignObject, options) {
    throw new Error('Not implemented');
};

/**
 * ProxiedModel constructor. This will return a ProxyHandle to act as a Proxy for
 * the created model.
 */
function ProxiedModel(attributes) {
    var model;
    if (attributes instanceof Model) {
        // Use existing model
        model = attributes;
    }
    else {
        // Create a new Model
        model = new Model(attributes);
    }

    // Return the Proxy handler
    return createModelProxy(model);
}

/**
 * Create a Proxy for a Model. This function will return a new Proxy handle for the given Model.
 * @param {Model} model
 * @return Object
 */
function createModelProxy(model) {

    // Create a Proxy handle
    var handle = {
        getOwnPropertyDescriptor: function(target, name) {
            return ObjProto.getOwnPropertyDescriptor.call(model.attributes, name);
        },
        getOwnPropertyNames: function(target) {
            return ObjProto.getOwnPropertyNames.call(model.attributes);
        },
        defineProperty: function(name, propertyDescriptor) {
            return Object.defineProperty(model.attributes, name, propertyDescriptor);
        },
        // Get an attribute from the Model. This will first check for Model properties before
        // checking the Model's internal attributes map.
        get: function(target, name, reciever) {
            // Check for direct properties to satisfy internal attribute and function calls
            if (model[name]) {
                return model[name];
            }

            // It's not a property, check for internal attribute value
            return model.get(name);
        },
        set: function(target, name, value, receiver) {
            return model.set(name, value);
        },
        delete: function(name) {
            model.unset(name);
        },
        has: function(target, name) {
            return model.has('name');
        },
        hasOwn: function(target, name) {
            return this.has(target, name);
        },
        enumerate: function(target) {
            return model.attributes;
        },
        keys: function(target) {
            return Object.keys(model.attributes);
        }
        //protect: function(operation, target) -> boolean
        //stopTrapping: function(target) -> boolean
        //iterate: not implemented yet
    };

    return ProxyCtor.create(handle, Model);
}

// our awesome export products
exports = module.exports = {
    Model:        Model,
    ProxiedModel: ProxiedModel,
    proxyModel:   createModelProxy
};
