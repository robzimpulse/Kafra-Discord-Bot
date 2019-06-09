const rp = require('request-promise');
const CacheFirebase = require('./firebase');
const cache = new CacheFirebase(60 * 60 * 24);
const cheerio = require('cheerio');
const url = 'https://search.roexplorer.com/explore/item/_msearch?';
const item_url = 'https://roexplorer.com/item/';

const transform = (body) => { return cheerio.load(body); };
const oddIndex = (e, i) => i % 2 > 0;
const multi_match_best_field = (name) => Object.assign({
    multi_match: {
        query: name,
        fields: ['NameZh_ragmobile'],
        type: 'best_fields',
        operator: 'or',
        fuzziness: 1
    }
});

const multi_match_phrase_prefix = (name) => Object.assign({
    multi_match: {
        query: name,
        fields: ['NameZh_ragmobile'],
        type: 'phrase_prefix',
        operator: 'or'
    }
});

const match_category = (name) => Object.assign({
    match: { category_ragmobile: name }
});

const match_super_category = (name) => Object.assign({
    match: { super_cat: name }
});

const bool_should_minimum_match = (minimum, shoulds) => Object.assign({
    bool: { should: shoulds,  minimum_should_match: minimum }
});

const bool_must_mustnot = (must, must_not) => Object.assign({
    bool: { must: must, must_not: must_not }
});

const bool = (object) => Object.assign({ bool: object });

const must = (object) => Object.assign({ must: object });

const query = (size, object) => Object.assign({ query: object, size: size });

module.exports = {

    searchItem: (name) => {

        let preference = { preference: 'searchbox' };
        let payload = query( 1,
            bool(
                must([
                    bool(
                        must(
                            bool(
                                must([
                                    bool_should_minimum_match(1, [
                                        multi_match_best_field(name),
                                        multi_match_phrase_prefix(name)
                                    ]),
                                    bool_must_mustnot(match_super_category('item'), [
                                        match_category('Quest'),
                                        match_category('Function'),
                                        match_category('Frame')
                                    ])
                                ])
                            )
                        )
                    )
                ])
            )
        );

        let options = {
            method: 'POST',
            url: url,
            body: JSON.stringify(preference) +'\n'+ JSON.stringify(payload) + '\n',
            json: false,
            headers: {
                'accept': 'application/json',
                'content-type': 'application/x-ndjson'
            }

        };

        return rp(options)
            .then(result => {
                let responses = JSON.parse(result).responses;
                let item_id = responses[0].hits.hits[0]._source.id;
                if (item_id === undefined) {
                    throw new Error(`Item with name: **${name}** not found.`);
                }
                return item_url + item_id;
            })
    },

    getItemDetails: (link) => {
        return cache.get('items/' + link.substr(item_url.length),() => {
            return rp({uri: link, transform: transform}).then($ => {
                return rp({uri: $('a').attr('href'), transform: transform})
            }).then($ => {

                let sections = $('.detail .floor-plans.mb-50');
                let bottom_sections = $('.floor-plans.mb-50 h3');

                let item_info = sections
                    .find('table').last().find('td').toArray()
                    .filter((e, i) => oddIndex(e, i));

                let equipment_info = sections
                    .find('table').first().find('td').toArray()
                    .filter((e, i) => oddIndex(e, i));

                let effect = $(equipment_info[0]).text() + ', ' + $(equipment_info[1])
                    .html($(equipment_info[1]).html().replace(/<br>/g, ', '))
                    .text().trim().replace(/,\s*$/, "");

                let section_craft_materials = bottom_sections.toArray()
                    .filter(e => $(e).text().trim() === 'Obtain by Crafting')[0];

                let section_tier_materials = bottom_sections.toArray()
                    .filter(e => $(e).text().trim() === 'Upgrades')[0];

                let craft_materials = $(section_craft_materials).parent()
                    .find('table td').last().find('p').toArray()
                    .map(e => Object.assign({
                        name: $(e).find('a').text().trim(),
                        quantity: parseInt($(e).text().trim())
                    }));

                let upgrade_materials = $(section_tier_materials).parent()
                    .find('table tr').toArray();

                upgrade_materials.shift();
                upgrade_materials.pop();

                let craft_tiers = upgrade_materials.map(e => {
                    let column = $(e).find('td').toArray();
                    let materials = $(column[2]).html($(column[2]).html().replace(/<br>/g, ', '))
                        .text().trim().replace(/,\s*$/, "").split(', ');
                    return Object.assign({
                        tier: $(column[0]).text(),
                        effect: $(column[1]).text(),
                        materials: materials.map(e => Object.assign({
                            name: e.split('X')[1].trim(),
                            quantity: parseInt(e)
                        }))
                    })
                });
                return Object.assign({
                    name: $('.detail h4').text().trim(),
                    image: $('.photo img').attr('src'),
                    link: link,
                    description: $('.agent-biography p.desc.en').text(),
                    type: $('.detail h5').text(),
                    effect: effect,
                    item_info: {
                        level: 0,
                        max_stack: parseInt($(item_info [0]).text()),
                        sellable: $(item_info [1]).text(),
                        sell_price: parseInt($(item_info [2]).text()),
                        tradeable: $(item_info [4]).text(),
                        storageable: $(item_info [3]).text()
                    },
                    craft_materials: craft_materials,
                    craft_tiers: craft_tiers
                });
            })
        });
    }

};