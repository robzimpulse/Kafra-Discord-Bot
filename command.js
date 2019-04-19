const PoporingAPI = require('./poporing.life');
const RomwikiAPI = require('./romwiki.net');
const builder = require('./discord_message_builder');

module.exports = {

    listen: (message, bot) => {
        let command = message.content.substr(`<@${bot.user.id}>`.length).trim();
        module.exports.getTrendingList(command, message, bot);
        module.exports.getItemDetail(command, message, bot);
        module.exports.getMonsterDetail(command, message, bot);
    },

    getMonsterDetail: (command, message, bot) => {
        if(!command.toLowerCase().startsWith('monster')) { return }
        let monsterName = command.substr('monster'.length).trim();
        RomwikiAPI
            .searchMonsterDetail(monsterName)
            .then(results => results.map(result => builder.monsterDetailToMessageBuilder(result)))
            .then(results => results.forEach(result => message.channel.send(result)))
            .catch(error => message.reply(error.message));
    },

    getItemDetail: (command, message, bot) => {
        if(!command.toLowerCase().startsWith('item')) { return }
        let name = command.substr('item'.length).trim();
        PoporingAPI
            .searchItem(name)
            .then(item => PoporingAPI
                .getLatestPrice(item.name)
                .then(result => Object.assign({}, result.data, item))
                .then(result => builder.itemDetailToMessageBuilder(result))
                .then(result => message.channel.send(result))
            )
            .catch(error => message.reply(error.message));
    },

    getTrendingList: (command, message, bot) => {
        if(!command.toLowerCase().startsWith('trending')) { return }
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
            .then(result => message.channel.send(result))
            .catch(error => message.reply(error.message));
    }

};