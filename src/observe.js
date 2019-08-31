const muteProperties = ["on", "when"];

/**
 * Function used to observe an object for property or event changes
 * @param target {Object}
 * @returns {Proxy}
 */
function observe(target) {
    if (target || !target) {
        const proxy = new Proxy(target, {
            get: getProperty,
            set: setProperty
        });

        proxy.on = on.bind(proxy);
        proxy.when = when.bind(proxy);

        return proxy;
    }

    return target;
}

/**
 * Used to clean up a proxy created with observe
 * @param target {Object}
 */
function cleanObserved(target) {
    if (target.isProxy != true) return;
    Reflect.set(target, "__mute", true);

    clearArrayValues(target, "__props");
    clearArrayValues(target, "__events");

    target.on = null;
    target.when = null;
}

/**
 * Get trap for proxy
 * @param obj {Object} target proxy object
 * @param prop {string} property name
 * @returns {*}
 */
function getProperty(obj, prop) {
    if (prop == "isProxy") return true;
    return Reflect.get(obj, prop);
}

/**
 * Set trap for proxy
 * @param obj {Objject} target proxy object
 * @param prop {String} property name
 * @param value {Object} property value
 * @returns {boolean}
 */
function setProperty(obj, prop, value) {
    if (Reflect.get(obj, "__mute") == true) return true;

    if (prop.indexOf("__") != -1 || muteProperties.indexOf(prop) != -1) {
        return Reflect.set(obj, prop, value);
    }

    ensureProperty(obj, "__oldValues", () => Object.create({}));

    const currentValue = Reflect.get(obj, prop);
    Reflect.set(obj.__oldValues, prop, currentValue);
    Reflect.set(obj, prop, value);

    notifyPropertyChanged(obj, prop);

    return true;
}

/**
 * This function is used to listen to a property change, registering the required callback
 * @param property {string} name of property that changed
 * @param callback {Function} callback
 */
function on(property, callback) {
    // todo enable property path
    registerTrigger(this,"__props", property, callback);
}

/**
 * This function is used to register events and callbacks where the events is a javascript expression
 * @param event {string} javascript event string in context of the bound proxy
 * @param callback {Function} callback
 */
function when(event, callback) {
    //registerTrigger(this,"__events", event, callback);

    //1. Get the properties from the expression.
    //2. For each of these properties register a callback
}

/**
 * This function adds property or event's callback to the appropriate collection
 * @param target {Proxy} the target object
 * @param collectionName {string} __prop or __events
 * @param key {string} the key used to identify a callback on the collection, be it a property name or event string
 * @param callback {Function}
 */
function registerTrigger(target, collectionName, key, callback) {
    ensureProperty(target, collectionName, () => new Map());
    const events = target[collectionName].get(key) || [];
    events.push(callback);
    target[collectionName].set(key, events);
}

/**
 * In places where you need to have a object in place for the code to work but you only want to create it at the last min, use this function
 * @param target {Proxy} target object
 * @param prop {string} property name
 * @param createCallback
 */
function ensureProperty(target, prop, createCallback) {
    if (Reflect.get(target, prop) == null) {
        Reflect.set(target, prop, createCallback());
    }
}

/**
 * When a property changes, this functions makes sure that all the relevant callbacks are made.
 * You can also call this directly if you want to update something
 * @param target {Proxy} target proxy
 * @param property {string} property name that changed
 */
function notifyPropertyChanged(target, property) {
    const value = Reflect.get(target, property);
    const oldValue = Reflect.get(target.__oldValues, property);

    target.__props && performCallbacks(target.__props.get(property) || [], value, oldValue);
    target.__events && performCallbacks(target.__events.get(property) || [], value, oldValue);
}

/**
 * This function performs the actual callbacks
 * @param functions {Array<function>} collection of functions to call
 * @param value {Object} the new value
 * @param oldValue {Object} the old value
 */
function performCallbacks(functions, value, oldValue) {
    for (let fn of functions) {
        const handler = setTimeout(() => {
            fn(value, oldValue);
            clearTimeout(handler);
        }, 0);
    }
}

/**
 * This is a helper function for cleaning up arrays when disposing of a proxy
 * @param target {Proxy} object being disposed
 * @param property {string} __props or __events
 */
function clearArrayValues(target, property) {
    if (target[property]) {
        for (let value of target[property].values()) {
            value.length = 0;
        }
    }
}

export {
    observe, cleanObserved
}