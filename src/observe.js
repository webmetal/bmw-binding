const muteProperties = ["__events", "__mute"];

function observe(target) {
    if (target || !target) {
        const proxy = new Proxy(target, {
            get: (obj, prop) => {
                if (prop == "isProxy") return true;
                return Reflect.get(obj, prop);
            },
            set: (obj, prop, value) => {
                if (Reflect.get(obj, "__mute") == true) return true;

                if (muteProperties.indexOf(prop) != -1) {
                    return Reflect.set(obj, prop, value);
                }

                ensureOldValues(target);

                const currentValue = Reflect.get(obj, prop);
                Reflect.set(obj._oldValues, prop, currentValue);
                Reflect.set(obj, prop, value);

                return true;
            }
        });

        Reflect.set(proxy, "__props", new Map());
        Reflect.set(proxy,"__events", new Map());

        proxy.on = on.bind(proxy);
        proxy.when = when.bind(proxy);

        return proxy;
    }

    return target;
}

function cleanObserved(target) {
    if (target.isProxy != true) return;
    Reflect.set(target, "__mute", true);

    for (let value of target.__props.values()) {
        value.length = 0;
    }

    for (let value of target.__events.values()) {
        value.length = 0;
    }

    target.on = null;
    target.when = null;
}

function ensureOldValues(target) {
    if (target._oldValues == null)
    {
        target._oldValues = {};
    }
}

function on(property, callback) {
    const events = this.__props.get(property) || [];
    events.push(callback);
    this.__props.set(property, events);
}

function when(event, callback) {
    const events = this.__events.get(event) || [];
    events.push(callback);
    this.__events.set(event, events);
}

export {
    observe, cleanObserved
}