const { Client, RichEmbed } = require('discord.js');
const Numeral = require('numeral');
const Moment = require('moment');

const BASE_ITEM_URL = 'https://poporing.life/?search=:';
const BASE_ITEM_IMAGE_URL = 'https://static.poporing.life/items/';

const currency = (number) => Numeral(number).format('0,0');
const qty = (number) => Numeral(number).format('0,0');

let formatList = (object) => Object.keys(object)
    .map((key) => `${key.toUpperCase()} : **${object[key]}**`)
    .filter(line => line.length > 0)
    .join('\n');

let capitalized = (string) => string.charAt(0).toUpperCase() + string.slice(1);

module.exports = {

    monsterDetailToMessageBuilder: (monster) => {
        let embed = new RichEmbed()
            .setAuthor(`${monster.name}`, undefined, monster.link)
            .setThumbnail(monster.image)
            .setDescription(monster.description)
            .setColor('GREEN');

        if (monster.info) {
            embed = embed.addField('Info', formatList(monster.info), true)
        }

        if (monster.stats) {
            embed = embed.addField('Status', formatList(monster.stats), true)
        }

        if (monster.attrs) {
            embed = embed.addField('Attributes', formatList(monster.attrs), true)
        }

        if (monster.itemDrop) {
            let drops = monster.itemDrop.map(item => `${item.name}: **${qty(item.qty)} (${item.chance})**`)
                .filter(line => line.length > 0)
                .join('\n');
            embed = embed.addField('Drop Items', drops, true)
        }
        return embed
    },

    exchangeDetailToMessageBuilder: (item) => {
        var last_price_known_timestamp = '';
        var last_price_known = 'Unknown';
        if (item.last_known_timestamp && item.last_known_timestamp > 0) {
            last_price_known_timestamp = `Last Price from: ${Moment.unix(item.last_known_timestamp).fromNow()}`;
            last_price_known = currency(item.last_known_price)
        }
        let price = `Price: **${item.price > 0 ? currency(item.price)+' z' : last_price_known}**`;
        let volume = `Volume: **${item.volume > 0 ? qty(item.volume)+' pcs' : 'Unknown'}**`;
        let last_update = `Last Update: **${Moment.unix(item.timestamp).fromNow()}**`;
        let rarity = `Exchange Status: ${item.snapping > 0 ? 'Snapping' : 'Normal'}`;

        let description = [price, volume, last_update, last_price_known_timestamp, rarity]
            .filter(line => line.length > 0)
            .join('\n');

        return new RichEmbed()
            .setAuthor(`[SEA] ${item.display_name}`, undefined, BASE_ITEM_URL + item.name)
            .setThumbnail(BASE_ITEM_IMAGE_URL + item.image_url)
            .setDescription(description)
            .setColor('AQUA')
    },

    itemTrendingToMessageBuilder: (data) => {
        let prc = (item) => currency(data.items.find(result => result.item_name === item.name).data.price);
        let vol = (item) => qty(data.items.find(result => result.item_name === item.name).data.volume);
        let formatter = (array) => array
            .map((item, index) => `${index + 1}. ${item.display_name} ( ${prc(item)} z | ${vol(item)} pcs)`)
            .join('\n');
        return new RichEmbed()
            .setTitle('Trending Info Today')
            .setColor('BLUE')
            .addField(
                'Top Trending',
                formatter(data.data.item_list),
                true
            )
            .addField(
                'Highest difference during 24 hours',
                formatter(data.data.item_list_full_1day),
                true
            )
            .addField(
                'Highest 3 Days price difference',
                formatter(data.data.item_list_full_3day),
                true
            )
            .addField(
                'Highest Change for the last 7 days',
                formatter(data.data.item_list_full_7day),
                true
            )
    },

    itemDetailToMessageBuilder: (item) => {
        let embed = new RichEmbed()
            .setAuthor(`[${capitalized(item.type)}] ${item.name}`, undefined, item.link)
            .setColor('RED')
            .setDescription(item.description)
            .setThumbnail(item.image)
            .addField('Item Info', formatList(item.item_info), true);

        if (item.equipment_info) {
            embed.addField('Equipment Info', formatList(item.equipment_info), true);
        }

        return embed
    }

};