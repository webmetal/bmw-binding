const muteProperties = ["on", "when"];

function observe(target) {
    if (target || !target) {
        const proxy = new Proxy(target, {
            get: (obj, prop) => {
                if (prop == "isProxy") return true;
                return Reflect.get(obj, prop);
            },
            set: (obj, prop, value) => {
                if (Reflect.get(obj, "__mute") == true) return true;

                if (prop.indexOf("__") != -1 || muteProperties.indexOf(prop) != -1) {
                    return Reflect.set(obj, prop, value);
                }

                ensureProperty(target, "__oldValues", () => Object.create({}));

                const currentValue = Reflect.get(obj, prop);
                Reflect.set(obj.__oldValues, prop, currentValue);
                Reflect.set(obj, prop, value);

                notifyPropertyChanged(obj, prop);

                return true;
            }
        });

        proxy.on = on.bind(proxy);
        proxy.when = when.bind(proxy);

        return proxy;
    }

    return target;
}

function cleanObserved(target) {
    if (target.isProxy != true) return;
    Reflect.set(target, "__mute", true);

    clearArrayValues(target, "__props");
    clearArrayValues(target, "__events");

    target.on = null;
    target.when = null;
}

function on(property, callback) {
    registerTrigger(this,"__props", property, callback);
}

function when(event, callback) {
    registerTrigger(this,"__events", event, callback);
}

function registerTrigger(target, collectionName, key, callback) {
    ensureProperty(target, collectionName, () => new Map());
    const events = target[collectionName].get(key) || [];
    events.push(callback);
    target[collectionName].set(key, events);
}

function ensureProperty(target, prop, createCallback) {
    if (Reflect.get(target, prop) == null) {
        Reflect.set(target, prop, createCallback());
    }
}

function notifyPropertyChanged(target, property) {
    const value = Reflect.get(target, property);
    const oldValue = Reflect.get(target.__oldValues, property);

    target.__props && performCallbacks(target.__props.get(property) || [], value, oldValue);
    target.__events && performCallbacks(target.__events.get(property) || [], value, oldValue);
}

function performCallbacks(functions, value, oldValue) {
    for (let fn of functions) {
        const handler = setTimeout(() => {
            fn(value, oldValue);
            clearTimeout(handler);
        }, 0);
    }
}

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