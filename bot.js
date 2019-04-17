const Discord = require('discord.js');
const auth = require('./auth.json');
const logger = require('winston');
const command = require('./command');
const bot = new Discord.Client();

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, { colorize: true });

bot.on('ready', () => {
    // logger.info('Connected!');
    // logger.info(`Logged in as ${bot.user.tag}!`);
    console.log(`Logged in as ${bot.user.tag}!`)
});

bot.on('disconnect', (message, code) => {
    console.log(`Disconnected ${message}, ${code}`);
    // logger.info('Disconnected', message, code);
});

bot.on('message', message => {
    if (message.author.id === bot.user.id) { return }
    if (!message.content.startsWith(bot.user)) { return }
    command.listen(message, bot);
});

bot.login(auth.token);