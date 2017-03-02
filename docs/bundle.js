(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var EventEmitter = require('events');

var NETWORK_DEFAULT_SIZE = 256;
var SYNAPSE_AVG_PER_NEURON = 2;
var SIGNAL_MAX_FIRE_DELAY = 300;
var SIGNAL_RECOVERY_DELAY = 1200;
var SIGNAL_FIRE_STRENGTH = 0.2;

class NeuralNetwork extends EventEmitter {

    constructor(size) {
        super();
        this.nodes = [];
        if (typeof size === 'number') {
            // Initialize with size
            // ie new NeuralNetwork(300)
            this.nodes = new Array(size)
                .fill()
                .map((n, i) => Neuron.random(size, i));
        }
        else if (size && size.nodes && size.nodes instanceof Array) {
            // Initialize with exported network
            // ie new NeuralNetwork({ nodes: [
            //   {id: 1, s: [{t: 1, w: 0.41}] }, 
            //   {id: 2, s: [{t: 2, w: 0.020}, {t: 3, w: 0.135}] },
            //   {id: 3, s: [{t: 5, w: 0.241}] }, 
            //   {id: 4, s: [{t: 1, w: 0.02}] }, 
            //   {id: 5, s: [{t: 6, w: 0.92}, {t: 2, w: 0.41}] },
            //   {id: 6, s: [{t: 2, w: 0.41}] }
            // ]})
            //
            this.nodes = size.nodes.map((n, i) => {
                var neuron = new Neuron(n.s, n.id);
                neuron.synapses.forEach(s => s.i = s.t);
                return neuron;
            });
        } 
        // Extra initialization per neuron
        this.nodes.forEach(neuron => {
            // Log fire event
            neuron.on('fire', id => console.log('Firing ' + id));
            // Add synapse ref pointers to corresponding target neurons
            neuron.synapses.forEach(synapse => {
                synapse.t = this.nodes[synapse.i];
            })
        });
    }

    clone() {
        return new NeuralNetwork(this.export());
    }

    export() {
        return { 
            nodes: this.nodes.map(node => Object({ 
                id: node.id, 
                s: node.synapses
                    .slice()
                    // Remove circular ref pointers
                    .map(s => Object({t: s.i, w: s.w})) 
            }))
        }
    }

    stop() {
        this.nodes.forEach(n => n.synapses.forEach(s => clearTimeout(s.c)));
    }

    get size() {
        return this.nodes.length;
    }

}

// Defines an array of connections to other neurons
class Neuron extends EventEmitter {

    constructor(synapses, index) {
        super();
        this.synapses = synapses || [];
        this.id = index > -1 ? index : Random.alpha(6);
    }

    // Generates a random neuron
    static random(networkSize, position) {
        // Number of synapses are random based on average
        var synapses = new Array(Random.integer(1, SYNAPSE_AVG_PER_NEURON * 2 - 1))
            .fill()
            .map(() => {
                var i, w = Math.random();
                
                // Use a tube-shaped network
                // (neurons linked to neurons with similar id)
                var range = Math.ceil(networkSize / 10);
                var offset = position + Math.floor(range / 2);
                for (var tries = 0; tries < 3; tries++) {
                    var from = -1 * range + offset;
                    var to = range + offset;
                    i = Random.integer(from, to);
                    if (i > 0 && i < networkSize && i !== position) {
                        return { i, w }; // index, weight
                    }
                }
                
                // Random network
                // (neurons linked at random)
                i = Random.integer(0, networkSize);
                if (i !== position) {
                    return { i, w };
                }

                // Cannot find suitable target
                return null;
            })
            .filter(s => !!s);
        return new Neuron(synapses, position);
    }

    fire() {
        this.emit('fire', this.id);
        this.synapses.forEach(synapse => {
            if (synapse.t && synapse.w > SIGNAL_FIRE_STRENGTH && !(synapse.l > new Date().getTime() - SIGNAL_RECOVERY_DELAY)) {
                // Stronger connections will fire quicker
                // @see Conduction Velocity: https://faculty.washington.edu/chudler/cv.html
                synapse.c = setTimeout(() => synapse.t.fire(), Math.round(SIGNAL_MAX_FIRE_DELAY * (1 - synapse.w)));
                // Avoid epileptic spasm by tracking when last fired
                synapse.l = new Date().getTime(); 
            }
        });
        setTimeout(() => this.emit('ready', this.id), SIGNAL_RECOVERY_DELAY);
    }

}

class Random {

    // Inclusive random integers
    static integer(from, to) { 
        if (!from && !to) return 0;
        if (!to) { to = from; from = 0; }
        var diff = to + 1 - from;
        return Math.floor(Math.random() * diff) + from; 
    }

    static alpha(length) {
        var output = '';
        do {
            output += Math.random().toString('16').substr(2);
            if (output.length > length) {
                output = output.substr(0,length);
            }
        } while (length > 0 && output.length < length)
        return output;
    }
}

module.exports = NeuralNetwork;
},{"events":3}],2:[function(require,module,exports){
(function() {

const NeuralNetwork = require('../NeuralNetwork');
window.NeuralNetwork = NeuralNetwork;
window.network = new NeuralNetwork(100);
display(network);

})();

},{"../NeuralNetwork":1}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[2]);
