const rp = require('request-promise');
const cheerio = require('cheerio');
const CacheFirebase = require('./firebase');
const cache = new CacheFirebase(60 * 60 * 24);
const PoporingAPI = require('./poporing.life');

const transform = (body) => { return cheerio.load(body); };
const url = 'https://www.romwiki.net';
const oddIndex = (e, i) => i % 2 > 0;
const evenIndex = (e, i) => i % 2 === 0;
const parseIntIfPossible = (e) => Number.isNaN(parseInt(e)) ? e : parseInt(e);
const unique = (e) => e.filter((v,i) => e.indexOf(v) === i);
const debug_promise = (e) => { console.log(e); return e };
const chunks = (array, size) => {
    return Array(Math.ceil(array.length / size))
        .fill().map((_, index) => index * size)
        .map(begin => {
            return array.slice(begin, begin + size)
        })
};


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
    },

    getItemDetail: (link) => {
        return cache.get(link.substr(url.length),() => {
            return rp({uri: link, transform: transform}).then($ => {
                let item_info = $("h3:contains('Item Info')")
                    .siblings('table').first()
                    .find('td').toArray().map(e => $(e).text())
                    .filter((e, i) => oddIndex(e, i))
                    .map(e => parseIntIfPossible(e));

                let equipment_info = $("h3:contains('Equipment Info')")
                    .siblings('table').first()
                    .find('td').toArray()
                    .filter((e, i) => oddIndex(e, i));

                let jobs = $(equipment_info[1]).find('li').toArray()
                    .map(e => $(e).text());

                let effects = $(equipment_info[2]).find('li').toArray()
                    .map(e => $(e).text());

                let item = {
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
                };

                if (item.type.toLowerCase() === 'equipment') {
                    item.equipment_info = {
                        type: $(equipment_info[0]).text(),
                        job: jobs.join(', '),
                        effect: effects.join(', ')
                    }
                }

                item.craft_materials = $("h3:contains('Craft Info')")
                    .siblings('table').first().find('.mat-info').toArray()
                    .map(e => Object.assign({}, {
                        name: $(e).find('a').text(),
                        quantity: parseIntIfPossible($(e).find('.mat-qty').text().trim().substr(1))
                    }));

                let data = $("h3:contains('Tier Process')")
                    .siblings('table').last().find('tr').toArray();

                let temp = chunks(data, 2);

                temp.pop();

                item.craft_tiers = temp.map(array => {
                    let materials = $(array[1]).find('.mat-info').toArray()
                        .map(e => Object.assign({}, {
                            name: $(e).find('a').text(),
                            quantity: parseIntIfPossible($(e).find('.mat-qty').text().trim().substr(1))
                        }));
                    return {
                        name: $(array[0]).find('td').first().text().trim(),
                        effect: $(array[0]).find('td').last().text().trim(),
                        materials: materials
                    };
                });

                return item;

                // let promises = materials
                //     .map(material => PoporingAPI.searchItem(material.name)
                //         .then(item => PoporingAPI.getLatestPrice(item.name).then(result => {
                //             if (material.name === item.display_name) {
                //                 return Promise.resolve(Object.assign(material, {
                //                     price: result.data.price,
                //                     total_price: result.data.price * material.quantity
                //                 }))
                //             } else if (material.name.toLowerCase() === 'zeny') {
                //                 return Promise.resolve(Object.assign(material, {
                //                     price: 1,
                //                     total_price: material.quantity
                //                 }))
                //             } else {
                //                 return module.exports.searchItemDetail(material.name)
                //                     .then(e => e[0])
                //                     .then(item => Object.assign(material, {
                //                         price: item.item_info.sell_price,
                //                         total_price: item.item_info.sell_price * material.quantity
                //                     }))
                //             }
                //         }))
                //     );
                //
                // return Promise.all(promises)
                //     .then(materials => Object.assign(item, {
                //         craft_materials: materials
                //     }));
            })
        });
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