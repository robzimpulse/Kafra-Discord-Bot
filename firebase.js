const firebase = require('firebase-admin');
const Moment = require('moment');
const certificate = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

firebase.initializeApp({
    credential: firebase.credential.cert(certificate),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

const isExpired = (timestamp, ttl) => {
    let diff_second = Moment().diff(timestamp,'second');
    return diff_second > ttl
};

class Cache {

    constructor(ttlSeconds) {
        this.ttl = ttlSeconds;
        this.root = firebase.database().ref('cache');
    }

    get(key, storeFunction) {
        return this.root.child(key).once('value').then(snapshot => {
            const value = snapshot.val();

            if (value && !isExpired(value.last_update, this.ttl)) {
                const last_update = Moment(value.last_update);
                console.log(`Cache: fetch data with key ${key} last update: ${last_update.fromNow()}`);
                return Promise.resolve(value);
            }

            return storeFunction().then(result => {
                console.log(`Cache: storing data with key ${key}`);
                result.last_update = firebase.database.ServerValue.TIMESTAMP;
                this.root.child(key).set(result);
                return result
            });
        });
    }

}

module.exports = Cache;