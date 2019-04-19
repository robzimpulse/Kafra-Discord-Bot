const { Client, RichEmbed } = require('discord.js');
const Numeral = require('numeral');
const Moment = require('moment');

const BASE_ITEM_URL = 'https://poporing.life/?search=:';
const BASE_ITEM_IMAGE_URL = 'https://static.poporing.life/items/';

const currency = (number) => Numeral(number).format('0,0');
const qty = (number) => Numeral(number).format('0,0');

module.exports = {

    monsterDetailToMessageBuilder: (monster) => {
        let embed = new RichEmbed()
            .setAuthor(`[Unknown] ${monster.name}`, undefined, monster.link)
            .setThumbnail(monster.image)
            .setDescription(monster.description)
            .setColor('AQUA');

        let formatList = (object) => Object.keys(object)
            .map((key) => `${key.toUpperCase()} : **${object[key]}**`)
            .filter(line => line.length > 0)
            .join('\n');

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

    itemDetailToMessageBuilder: (item) => {
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
    }

};