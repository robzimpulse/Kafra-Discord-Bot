const NodeCache = require('node-cache');

class Cache {

    constructor(ttlSeconds) {
        this.cache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: ttlSeconds * 0.2, useClones: false });
    }

    get(key, storeFunction) {
        const value = this.cache.get(key);
        if (value) {
            console.log(`Cache: fetch data with key ${key}`);
            return Promise.resolve(value);
        }

        return storeFunction().then((result) => {
            console.log(`Cache: storing data with key ${key}`);
            this.cache.set(key, result);
            return result;
        });
    }

    del(keys) {
        this.cache.del(keys);
    }

    delStartWith(startStr = '') {
        if (!startStr) {
            return;
        }

        const keys = this.cache.keys();
        for (const key of keys) {
            if (key.indexOf(startStr) === 0) {
                this.del(key);
            }
        }
    }

    flush() {
        this.cache.flushAll();
    }
}


module.exports = Cache;