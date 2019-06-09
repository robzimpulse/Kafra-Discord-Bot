const express = require('express');
const Discord = require('discord.js');
const logger = require('winston');
const command = require('./command');
const bot = new Discord.Client();
const PORT = process.env.PORT || 5000;

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, { colorize: true });

bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`)
});

bot.on('disconnect', (message, code) => {
    console.log(`Disconnected ${message}, ${code}`);
});

bot.on('message', message => {
    if (message.author.id === bot.user.id) { return }
    if (!message.content.startsWith(bot.user)) { return }
    console.log(`Received Message: ${message.content} | ${message.author.username}`);
    command.listen(message, bot);
});

bot.login(process.env.DISCORD_TOKEN);

express().listen(PORT, () => console.log(`Listening on ${ PORT }`));