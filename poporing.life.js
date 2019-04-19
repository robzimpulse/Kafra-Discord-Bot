const rp = require('request-promise');
const Fuse = require('fuse.js');
const CacheFirebase = require('./firebase');
const cache = new CacheFirebase(60 * 30);
const headers = {
    'Origin': 'https://poporing.life',
    'User-Agent': 'PoporingBot-01282019'
};

module.exports = {

    searchItem: (name) => {
        let options = {
            shouldSort: true, tokenize: true, matchAllTokens: true, threshold: 0.6,
            location: 0, distance: 100, maxPatternLength: 32, minMatchCharLength: 1,
            keys: [ "name", "display_name", "alt_display_name_list" ]
        };
        return module.exports.getItemList()
            .then(data => {
                let items = data.item_list.sort((a,b) => {
                    return a.display_name.length - b.display_name.length
                });
                let fuse = new Fuse(items, options);
                let item = fuse.search(name)[0];
                if (item === undefined) {
                    throw new Error(`Item with name: **${name}** not found.`);
                }
                return item;
            });
    },

    getLatestPrice: (name) => {
        const options = {
            uri: 'https://api.poporing.life/get_latest_price/' + name,
            json: true,
            headers: headers
        };
        return cache.get('price_'+name,() => {
            return rp(options).then(response => response.data)
        })
    },

    getTrendingList: () => {
        const options = {
            uri: 'https://api.poporing.life/get_trending_list',
            json: true,
            headers: headers
        };
        return cache.get('trending',() => {
            return rp(options).then(response => response.data)
        })
    },

    getItemList: () => {
        const options = {
            uri: 'https://api.poporing.life/get_item_list?includeRefine=1',
            json: true,
            headers: headers
        };
        return cache.get('item',() => {
            return rp(options).then(response => response.data)
        })
    }

};