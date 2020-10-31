// Author: Alex Zdanowicz and Shengbo Jia

// This code was inspired from:
// https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/
const errorCodes = {
    BAD:           0,
    BADDER:        1,
    BADDEST:       2,
    MISSING_PARAM: 3,
    DEVS_SUCK:     4
}
//#region imports
var Discord = require('discord.io')
var logger = require('winston')
var auth = require('./auth.json')
// var accounts = require('./accounts.json')
var package = require('./package.json')
//#endregion imports

// For @ people in the chat
function mentionUser(userID) {
    return '<@' + userID + '>'
}

/**
* Draws from a preset list of error messages depending on the ErrorCode
*/
function errorMessage(userID, channelID, errorCode) {
    let message = (function(code) {
        switch (code) {
            case errorCodes.BADDEST:
                return 'Uh oh, you did a fucky wucky'
            case errorCodes.BADDER:
                return 'Big oof'
            case errorCodes.BAD:
                return 'oof'
            case errorCodes.MISSING_PARAM:
                return 'You\'re missing a param, chief'
            case errorCodes.DEVS_SUCK:
                return 'The devs suck major BBC'
            default:
                return 'Idk what went wrong G'
        }
    })(errorCode)

    bot.sendMessage({
        to: channelID,
        message: mentionUser(userID) + ' ' + message
    })
}


// Configure logger settings
logger.remove(logger.transports.Console)
logger.add(new logger.transports.Console, {
    colorize: true
})
logger.level = 'debug'

// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
})


bot.on('ready', function (evt) {
    console.log('\n')
    logger.info(' ############################## ')
    logger.info(' # /poll v ' + package.version + ' # ')
    logger.info(' ############################## ')
    console.log('\n')
    logger.info('Connected. Logged in as: ' + bot.username + ' - (' + bot.id + ')')
})


bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    if (message.substring(0,1) == '!') {
        var args = message.substring(1).split(' ')
        handleInput(userID, channelID, args)
    }
})


// Take care of the input
function handleInput(userID, channelID, args) {

    let cmd = args[0]

    cmd = cmd.toLowerCase()
    args = args.splice(1)

    if (cmd != 'poll') {
        errorMessage(userID, channelID, errorCodes.BAD)
        return
    }

    if (args.length < 1) {
        errorMessage(userID, channelID, errorCodes.MISSING_PARAM)
        return
    }

    cmd = args[0]
    cmd = cmd.toLowerCase()
    args = args.splice(1)

    switch (cmd) {
        case 'new':
            handleNewPoll(userID, channelID, args)
            break
        case 'end':
            handleEndPoll(userID, channelID, args)
            break
        default:
            break
    }
}

// Handle creating a new poll
function handleNewPoll(userID, channelID, args) {
    switch (args.length) {
        case 0:
            errorMessage(userID, channelID, errorCodes.MISSING_PARAM)
            return
        case 1:
            // TODO: actually make a poll
            bot.sendMessage({
                to: channelID,
                message: mentionUser(userID) + ' ' + 'fam you can\'t make pills yet'
            })
            return
        default:
            // TODO: starter options for new poll
            bot.sendMessage({
                to: channelID,
                message: mentionUser(userID) + ' ' + 'fam you can\'t customize pills yet'
            })
            return
    }
}

// Handle ending a poll
function handleEndPoll(userID, channelID, args) {
    errorMessage(userID, channelID, errorCodes.DEVS_SUCK)
}























// /poll new varargs categories
// --> @kylebgu3 started a new poll: NAME
// -->
// /poll end NAME
