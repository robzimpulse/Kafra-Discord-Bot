const PoporingAPI = require('./poporing.life');
const { Client, RichEmbed } = require('discord.js');
const Fuse = require('fuse.js');
const Moment = require('moment');
const Numeral = require('numeral');

const BASE_ITEM_URL = 'https://poporing.life/?search=:';
const BASE_ITEM_IMAGE_URL = 'https://static.poporing.life/items/';
const currency = (number) => Numeral(number).format('0,0');
const qty = (number) => Numeral(number).format('0,0');

module.exports = {

    listen: (message, bot) => {
        let command = message.content.substr(`<@${bot.user.id}>`.length).trim();
        module.exports.getTrendingList(command, message, bot);
        module.exports.getItemList(command, message, bot);

    },

    getItemList: (command, message, bot) => {
        if(!command.toLowerCase().startsWith('item')) { return }
        let itemName = command.substr('item'.length).trim();
        let options = {
            shouldSort: true,
            tokenize: true,
            matchAllTokens: true,
            threshold: 0.6,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            keys: [
                "name",
                "display_name",
                "alt_display_name_list"
            ]
        };

        PoporingAPI
            .getItemList()
            .then(data => {
                let items = data.item_list.sort((a,b) => {
                    return a.display_name.length - b.display_name.length
                });
                let fuse = new Fuse(items, options);
                let item = fuse.search(itemName)[0];
                if (item === undefined) {
                    return message.reply(`Item with name: **${itemName}** not found.`)
                }
                return PoporingAPI
                    .getLatestPrice(item.name)
                    .then(data => {
                        var last_price_known_timestamp = '';
                        var last_price_known = 'Unknown';
                        if (data.data.last_known_timestamp > 0) {
                            last_price_known_timestamp = `Last Price from: ${Moment.unix(data.data.last_known_timestamp).fromNow()}`;
                            last_price_known = currency(data.data.last_known_price)
                        }
                        let price = `Price: **${data.data.price > 0 ? currency(data.data.price)+' z' : last_price_known}**`;
                        let volume = `Volume: **${data.data.volume > 0 ? qty(data.data.volume)+' pcs' : 'Unknown'}**`;
                        let last_update = `Last Update: **${Moment.unix(data.data.timestamp).fromNow()}**`;
                        let rarity = `Exchange Status: ${data.data.snapping > 0 ? 'Snapping' : 'Normal'}`;

                        message.channel.send(
                            new RichEmbed()
                                .setAuthor(
                                    `[SEA] ${item.display_name}`,
                                    undefined,
                                    BASE_ITEM_URL + item.name
                                )
                                .setThumbnail(BASE_ITEM_IMAGE_URL + item.image_url)
                                .setDescription(
                                    [price, volume, last_update, last_price_known_timestamp, rarity]
                                        .filter(line => line.length > 0)
                                        .join('\n')
                                )
                                .setColor('AQUA')
                        );

                    })
            })
            .catch(error => {
                console.log(error);
                message.reply('Error! please contact @author for technical support');
            });
    },

    getTrendingList: (command, message, bot) => {
        if(!command.toLowerCase().startsWith('trending')) { return }
        PoporingAPI
            .getTrendingList()
            .then(data => {

                let items = data.item_list
                    .concat(data.item_list_full_1day)
                    .concat(data.item_list_full_3day)
                    .concat(data.item_list_full_7day)
                    .map(item => PoporingAPI.getLatestPrice(item.name));

                Promise.all(items).then(results => {

                    let prc = (item) => currency(results.find(result => result.item_name === item.name).data.price);
                    let vol = (item) => qty(results.find(result => result.item_name === item.name).data.volume);

                    let formatter = (array) => array
                        .map((item, index) => `${index + 1}. ${item.display_name} ( ${prc(item)} z | ${vol(item)} pcs )`)
                        .join('\n');

                    message.channel.send(
                        new RichEmbed()
                            .setTitle('Top Trending')
                            .setColor('GOLD')
                            .setDescription(formatter(data.item_list))
                    );

                    message.channel.send(
                        new RichEmbed()
                            .setTitle('Highest difference during 24 hours')
                            .setColor('AQUA')
                            .setDescription(formatter(data.item_list_full_1day))
                    );

                    message.channel.send(
                        new RichEmbed()
                            .setTitle('Highest 3 Days price difference')
                            .setColor('GREEN')
                            .setDescription(formatter(data.item_list_full_3day))
                    );

                    message.channel.send(
                        new RichEmbed()
                            .setTitle('Highest Change for the last 7 days')
                            .setColor('BLUE')
                            .setDescription(formatter(data.item_list_full_7day))
                    )

                })
            })
            .catch(error => {
                console.log(error);
                message.reply('Error! please contact @author for technical support');
            });
    }

};