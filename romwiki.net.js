const rp = require('request-promise');
const cheerio = require('cheerio');
const CacheFirebase = require('./firebase');
const cache = new CacheFirebase(60 * 60 * 24);

const transform = (body) => { return cheerio.load(body); };
const url = 'https://www.romwiki.net';
const oddIndex = (e, i) => i % 2 > 0;
const parseIntIfPossible = (e) => Number.isNaN(parseInt(e)) ? e : parseInt(e);
const unique = (e) => e.filter((v,i) => e.indexOf(v) === i);

module.exports = {

    searchItemDetail: (name) => {
        return rp({ uri: url + '/search?keyword=' + name, transform: transform })
            .then($ => $('.item-list').find('a').toArray().map(e => {
                return url + $(e).attr('href')
            }))
            .then(result => unique(result))
            .then(result => result
                .map(link => module.exports.getItemDetail(link))
            )
            .then(result => Promise.all(result))
            .then(result => result
                .map(item => module.exports.getEquipmentDetail(item))
            )
            .then(result => Promise.all(result))
    },

    getItemDetail: (link) => {
        return rp({uri: link, transform: transform}).then($ => {
            let item_info = $('.item-details').find('.table').first()
                .find('td').toArray().map(e => $(e).text())
                .filter((e, i) => oddIndex(e, i))
                .map(e => parseIntIfPossible(e));
            return Object.assign({
                name: $('.item-name').text(),
                image: $('.item-image').find('img').attr('src'),
                link: link,
                description: $('.item-desc').text(),
                type: $('.item-info').find('p').text(),
                item_info: {
                    level: item_info[0],
                    max_stack: item_info[1],
                    sellable: item_info[2],
                    sell_price: item_info[3],
                    tradeable: item_info[4],
                    storageable: item_info[5]
                }
            })
        })
    },

    getEquipmentDetail: (item) => {
        if (item.type !== 'equipment') { return Promise.resolve(item) }
        return rp({uri: item.link, transform: transform}).then($ => {
            let equipment_info = $('.item-details').find('.table').last()
                .find('td').toArray().map(e => $(e).text())
                .filter((e, i) => oddIndex(e, i));

            let effects = $('.equip-effects').find('li').toArray()
                .map(e => $(e).text());

            return Object.assign(item, {
                equipment_info: {
                    type: equipment_info[0],
                    job: equipment_info[1],
                    effect: effects.join(', ')
                }
            })
        })
    },

    searchMonsterDetail: (name) => {
        return rp({ uri: url + '/search?keyword=' + name, transform: transform })
            .then($ => $('.monster-template').toArray().map(data => {
                return url + $(data).find('.m-name').attr('href')
            }))
            .then(result => result.map(link => module.exports.getMonsterDetail(link)))
            .then(result => Promise.all(result));
    },

    getMonsterDetail: (link) => {
        return cache.get(link.substr(url.length), () => {
            return rp({uri: link, transform: transform}).then($ => {
                let info = $('.m-common').find('.table').first()
                    .find('td').toArray().map(e => $(e).text())
                    .filter((e, i) => oddIndex(e, i))
                    .map(e => parseIntIfPossible(e));

                let stats = $('.m-common').find('.table').last()
                    .find('td').toArray().map(e => $(e).text())
                    .filter((e, i) => oddIndex(e, i))
                    .map(e => parseIntIfPossible(e));

                let attrs = $('.m-attributes').find('.table').first()
                    .find('td').toArray().map(e => $(e).text())
                    .filter((e, i) => oddIndex(e, i))
                    .map(e => parseIntIfPossible(e));

                let items = $('.m-items').find('.item-tpl').toArray()
                    .map(e => {
                        let chance = $(e).find('span').last().text().trim();
                        return Object.assign({
                            name: $(e).find('a').text(),
                            link: url + $(e).find('a').attr('href'),
                            image: $(e).find('img').attr('src'),
                            qty: $(e).find('span').first().text().trim(),
                            chance: chance.indexOf('%') > -1 ? chance : '?'
                        })
                    });

                return Object.assign({
                    name: $('.m-name').text(),
                    image: $('.m-image').find('.image').attr('src'),
                    link: link,
                    description: $('.m-desc').text(),
                    info: {
                        level: info[0],
                        race: info[1],
                        property: info[2],
                        size: info[3],
                        base_exp: info[4],
                        job_exp: info[5]
                    },
                    stats: {
                        agi: stats[0],
                        dex: stats[1],
                        int: stats[2],
                        luk: stats[3],
                        str: stats[4],
                        vit: stats[5]
                    },
                    attrs: {
                        hp: attrs[0],
                        atk: attrs[1],
                        def: attrs[2],
                        hit: attrs[3],
                        aspd: attrs[4],
                        flee: attrs[5],
                        matk: attrs[6],
                        mdef: attrs[7],
                        movespeed: attrs[8]
                    },
                    itemDrop: items
                })
            });
        })
    }

};