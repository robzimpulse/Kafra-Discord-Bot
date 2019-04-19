const PoporingAPI = require('./poporing.life');
const RomwikiAPI = require('./romwiki.net');
const { Client, RichEmbed } = require('discord.js');
const Fuse = require('fuse.js');
const Numeral = require('numeral');
const builder = require('./discord_message_builder');

const currency = (number) => Numeral(number).format('0,0');
const qty = (number) => Numeral(number).format('0,0');

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
            .then(data => {
                console.log(`Command: Finish Fetching Trending List!`);
                let items = data.item_list
                    .concat(data.item_list_full_1day)
                    .concat(data.item_list_full_3day)
                    .concat(data.item_list_full_7day)
                    .map(item => PoporingAPI.getLatestPrice(item.name));

                Promise.all(items).then(results => {
                    console.log(`Command: Finish Fetching Each Item Detail!`);
                    let prc = (item) => currency(results.find(result => result.item_name === item.name).data.price);
                    let vol = (item) => qty(results.find(result => result.item_name === item.name).data.volume);

                    let formatter = (array) => array
                        .map((item, index) => `${index + 1}. ${item.display_name} ( ${prc(item)} z | ${vol(item)} pcs)`)
                        .join('\n');

                    message.channel.send(
                        new RichEmbed()
                            .setTitle('Trending Info Today')
                            .setColor('AQUA')
                            .addField('Top Trending', formatter(data.item_list), true)
                            .addField('Highest difference during 24 hours', formatter(data.item_list_full_1day), true)
                            .addField('Highest 3 Days price difference', formatter(data.item_list_full_3day), true)
                            .addField('Highest Change for the last 7 days', formatter(data.item_list_full_7day), true)
                    );
                    console.log(`Command: Finish Sending Message Trending Items!`);
                })
            })
            .catch(error => {
                console.log(error);
                message.reply('Error! please contact @author for technical support');
            });
    }

};