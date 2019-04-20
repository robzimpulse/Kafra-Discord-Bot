const PoporingAPI = require('./poporing.life');
const RomwikiAPI = require('./romwiki.net');
const builder = require('./discord_message_builder');

const capitalized = (string) => string.charAt(0).toUpperCase() + string.slice(1);
const debug_promise = (e) => { console.log(e); return e };
const handleEmptyData = (keyword, name, data) => {
    if (data || data.length > 0) { return data }
    throw new Error(`${capitalized(keyword)} data with keyword \`${name}\` not found`)
};

module.exports = {

    listen: (message, bot) => {
        let command = message.content.substr(`<@${bot.user.id}>`.length).trim();
        module.exports.getTrendingList('trending',command, message, bot);
        module.exports.getItemDetail('item',command, message, bot);
        module.exports.getMonsterDetail('monster',command, message, bot);
        module.exports.getExchangeDetail('exchange',command, message, bot);
    },

    getMonsterDetail: (keyword, command, message, bot) => {
        if(!command.toLowerCase().startsWith(keyword)) { return }
        let name = command.substr(keyword.length).trim();
        RomwikiAPI
            .searchMonsterDetail(name)
            .then(monsters => monsters.map(monster => builder.monsterDetailToMessageBuilder(monster)))
            .then(results => handleEmptyData(keyword, name, results))
            .then(results => results.forEach(result => message.channel.send(result)))
            .catch(error => { console.log(error); return message.reply(error.message) });
    },

    getItemDetail: (keyword, command, message, bot) => {
        if(!command.toLowerCase().startsWith(keyword)) { return }
        let name = command.substr(keyword.length).trim();
        RomwikiAPI
            .searchItemDetail(name)
            .then(items => {
                console.log(items);
                let item_promises = items.map(item => {
                    let craft_materials_promises = item.craft_materials
                        .map(material => module.exports.populateMaterialPrice(material));
                    return Promise.all(craft_materials_promises)
                        .then(materials => Object.assign(item, {
                            craft_materials: materials
                        }))
                });
                return Promise.all(item_promises)
            })
            .then(items => {
                let item_promises = items.map(item => {
                    let promises = item.craft_tiers.map(tier => {
                        let promises = tier.materials.map(material => {
                            return module.exports.populateMaterialPrice(material)
                        });
                        return Promise.all(promises).then(materials => {
                            return Object.assign(tier, { materials: materials })
                        });
                    });
                    return Promise.all(promises).then(tiers => {
                        return Object.assign(item, { craft_tiers: tiers })
                    })
                });
                return Promise.all(item_promises)
            })
            .then(items => items.map(item => builder.itemDetailToMessageBuilder(item)))
            // .then(results => handleEmptyData(keyword, name, results))
            .then(results => results.forEach(result => message.channel.send(result)))
            .catch(error => { console.log(error); return message.reply(error.message) });
    },

    getTrendingList: (keyword, command, message, bot) => {
        if(!command.toLowerCase().startsWith(keyword)) { return }
        PoporingAPI
            .getTrendingList()
            .then(data => Object.assign({}, {
                promises: data.item_list
                    .concat(data.item_list_full_1day)
                    .concat(data.item_list_full_3day)
                    .concat(data.item_list_full_7day)
                    .map(item => PoporingAPI.getLatestPrice(item.name)),
                data: data
            }))
            .then(data => Promise.all(data.promises).then(items => {
                return Object.assign(data, { items: items });
            }))
            .then(data => builder.itemTrendingToMessageBuilder(data))
            .then(results => handleEmptyData(keyword, name, results))
            .then(result => message.channel.send(result))
            .catch(error => { console.log(error); return message.reply(error.message) });
    },

    getExchangeDetail: (keyword, command, message, bot) => {
        if(!command.toLowerCase().startsWith(keyword)) { return }
        let name = command.substr(keyword.length).trim();
        PoporingAPI
            .searchItem(name)
            .then(item => PoporingAPI.getLatestPrice(item.name)
                .then(result => Object.assign(item, result.data))
            )
            .then(result => builder.exchangeDetailToMessageBuilder(result))
            .then(results => handleEmptyData(keyword, name, results))
            .then(result => message.channel.send(result))
            .catch(error => { console.log(error); return message.reply(error.message) });
    },

    populateMaterialPrice: (material) => {
        return PoporingAPI.searchItem(material.name)
            .then(item => PoporingAPI.getLatestPrice(item.name).then(result => {
                if (material.name === item.display_name) {
                    return Promise.resolve(Object.assign(material, {
                        price: result.data.price,
                        total_price: result.data.price * material.quantity
                    }))
                } else if (material.name.toLowerCase() === 'zeny') {
                    return Promise.resolve(Object.assign(material, {
                        price: 1,
                        total_price: material.quantity
                    }))
                } else {
                    return RomwikiAPI.searchItemDetail(material.name)
                        .then(e => e[0])
                        .then(item => Object.assign(material, {
                            price: item.item_info.sell_price,
                            total_price: item.item_info.sell_price * material.quantity
                        }))
                }
            }))
    }

};