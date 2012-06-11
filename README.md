# Proximo

Proximo is an experiment to implement Backbone.js' Model class but enhanced with
the Harmony Proxy proposal. This allows Model attributes to be accessed like a
native JavaScript Object but still enables change events to be fired.

```javascript
var m = new Model();
m.on('change:foo', function(model, value) {
    console.log('Foo changed to ' + value);
});

// Backbone accessor
m.set('foo', 'bar');
// prints "Foo changed to bar"

// Proximo accessor
m.foo = 'baz';
// prints "Foo changed to baz"
```

Proximo uses the Harmony Proxy proposal implemented in the v8 engine. This is available by
calling `node` with the `--harmony_proxies` flag. As an alternative the `node-proxy`
module can be installed.

Proximo is an experiment and is still being developed. Use at your own risk.

## Install

```
$ npm install proximo
```

The module is tested on node v0.6.19. Other tests will be added soon.

## Shortcomings

The Harmony API's are not completely settled yet so the implementation is not final. The new 
`Proxy.for` API is not yet implemented in v8 packaged with node v0.6.x. The `iterate` trap
is also unimplemented as it relies on the Harmony iterator proposal which is also not
available in node.

## License

This module is available under the MIT License. See LICENSE file for full details. 
Some parts of model.js are taken from [backbone.js](http://backbonejs.org) which 
is available under the MIT License.
