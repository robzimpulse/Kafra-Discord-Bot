const PoporingAPI = require('./poporing.life');
const RomwikiAPI = require('./romwiki.net');
const builder = require('./discord_message_builder');

let capitalized = (string) => string.charAt(0).toUpperCase() + string.slice(1);

const handleEmptyData = (keyword, name, data) => {
    if (data.length > 0) { return data }
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
            .catch(error => message.reply(error.message));
    },

    getItemDetail: (keyword, command, message, bot) => {
        if(!command.toLowerCase().startsWith(keyword)) { return }
        let name = command.substr(keyword.length).trim();
        RomwikiAPI
            .searchItemDetail(name)
            .then(items => items.map(item => builder.itemDetailToMessageBuilder(item)))
            .then(results => handleEmptyData(keyword, name, results))
            .then(results => results.forEach(result => message.channel.send(result)))
            .catch(error => message.reply(error.message));
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
            .catch(error => message.reply(error.message));
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
            .catch(error => message.reply(error.message));
    }

};