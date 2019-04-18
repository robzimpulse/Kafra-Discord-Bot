const PoporingAPI = require('./poporing.life');
const RomwikiAPI = require('./romwiki.net');
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
        module.exports.getItemDetail(command, message, bot);
        module.exports.getMonsterDetail(command, message, bot);
    },

    getMonsterDetail: (command, message, bot) => {
        if(!command.toLowerCase().startsWith('monster')) { return }
        console.log(`Command: Executing Command ${message.content} from ${message.author.username}`);
        let monsterName = command.substr('monster'.length).trim();
        RomwikiAPI
            .searchMonsterDetail(monsterName)
            .then(results => {
                results.forEach(result => {

                    console.log(result);

                    let embbed = new RichEmbed().setAuthor(
                            `[Unknown] ${result.name}`,
                            undefined,
                            result.link
                        )
                        .setThumbnail(result.image)
                        .setDescription(result.description)
                        .setColor('AQUA');

                    let formatList = (object) => Object.keys(object)
                        .map((key) => `${key.toUpperCase()} : **${object[key]}**`)
                        .filter(line => line.length > 0)
                        .join('\n');

                    if (result.info) {
                        embbed = embbed.addField('Info', formatList(result.info), true)
                    }

                    if (result.stats) {
                        embbed = embbed.addField('Status', formatList(result.stats), true)
                    }

                    if (result.attrs) {
                        embbed = embbed.addField('Attributes', formatList(result.attrs), true)
                    }

                    if (result.itemDrop) {
                        let drops = result.itemDrop.map(item => `${item.name}: **${qty(item.qty)} (${item.chance})**`)
                            .filter(line => line.length > 0)
                            .join('\n');
                        embbed = embbed.addField('Drop Items', drops, true)
                    }

                    message.channel.send(embbed);
                });

            });
    },

    getItemDetail: (command, message, bot) => {
        if(!command.toLowerCase().startsWith('item')) { return }
        console.log(`Command: Executing Command ${message.content} from ${message.author.username}`);
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
                console.log(`Command: Finish Fetching Item List!`);
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
                        console.log(`Command: Finish Fetching Item Detail!`);
                        var last_price_known_timestamp = '';
                        var last_price_known = 'Unknown';
                        if (data.data.last_known_timestamp && data.data.last_known_timestamp > 0) {
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
                        console.log(`Command: Finish Sending Message Item Detail!`);
                    })
            })
            .catch(error => {
                console.log(error);
                message.reply('Error! please contact @author for technical support');
            });
    },

    getTrendingList: (command, message, bot) => {
        if(!command.toLowerCase().startsWith('trending')) { return }
        console.log(`Command: Executing Command ${message.content} from ${message.author.username}`);
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