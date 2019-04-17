const rp = require('request-promise');
const CacheService = require('./cache');

const cache = new CacheService(60 * 30);
const headers = {
    'Origin': 'https://poporing.life',
    'User-Agent': 'PoporingBot-01282019'
};

module.exports = {

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