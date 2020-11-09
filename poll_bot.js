// Author: Alex Zdanowicz and Shengbo Jia

// This code was inspired from:
// https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/


// Imports
let Discord = require('discord.io')
let logger = require('winston')
let auth = require('./auth.json')
let package = require('./package.json')
let ERROR_CODES = require('./enums/ERROR_CODES.json')




/**
 * Returns text that will mention a user
 * @param {*} userID The user which to mention
 */
function mentionUser(userID) {
    return '<@' + userID + '>'
}


/**
 * Draws from a preset list of error messages depending on the ErrorCode
 * @param {*} userID The user which to mention
 * @param {*} channelID The channel to send the message in
 * @param {ERROR_CODES} errorCode The error code to send the appropriate message
 */
function errorMessage(userID, channelID, errorCode) {
    let message = (function(code) {
        switch (code) {
            case ERROR_CODES.BADDEST:
                return 'Uh oh, you did a fucky wucky'
            case ERROR_CODES.BADDER:
                return 'Big oof'
            case ERROR_CODES.BAD:
                return 'oof'
            case ERROR_CODES.MISSING_PARAM:
                return 'You\'re missing a param, chief'
            case ERROR_CODES.DEVS_SUCK:
                return 'The devs suck'
            case ERROR_CODES.UNKNOWN_PARAM:
                return 'Fam, you passed in a wack param'
            default:
                return 'Idk what went wrong G'
        }
    })(errorCode)

    bot.sendMessage({
        to: channelID,
        message: mentionUser(userID) + ' ' + message
    })
}


/**
 * Takes care of the input
 * @param {*} userID The user that sent the input
 * @param {*} channelID The channel in which the messgae was sent
 * @param {*} args The arguments passed in
 */
function handleInput(userID, channelID, args) {

    let cmd = args[0]

    cmd = cmd.toLowerCase()
    args = args.splice(1)

    if (cmd != 'poll') {
        errorMessage(userID, channelID, ERROR_CODES.BAD)
        return
    }

    if (args.length < 1) {
        errorMessage(userID, channelID, ERROR_CODES.MISSING_PARAM)
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
            errorMessage(userID, channelID, ERROR_CODES.UNKNOWN_PARAM)
            break
    }
}


/**
 * Handles creating a new poll
 * @param {*} userID The user who started the poll
 * @param {*} channelID The channel in which the poll is started
 * @param {*} args The arguments to go along with the poll
 */
function handleNewPoll(userID, channelID, args) {
    switch (args.length) {
        case 0:
            errorMessage(userID, channelID, ERROR_CODES.MISSING_PARAM)
            return
        case 1:
            // TODO: actually make a poll
            bot.sendMessage({
                to: channelID,
                message: mentionUser(userID) + ' ' + 'fam you can\'t make polls yet'
            })
            return
        default:
            // TODO: starter options for new poll
            bot.sendMessage({
                to: channelID,
                message: mentionUser(userID) + ' ' + 'fam you can\'t customize polls yet'
            })
            return
    }
}


/**
 * Handles ending a poll
 * @param {*} userID The user that ended the poll
 * @param {*} channelID The channel in which the poll is taking place
 * @param {*} args The arguments about the poll
 */
function handleEndPoll(userID, channelID, args) {
    errorMessage(userID, channelID, ERROR_CODES.DEVS_SUCK)
}


/* ********* *
 * MAIN CODE *
 * ********* */


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


// Sets up the bot to listen to every message sent
bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    if (message.substring(0,1) == '!') {
        var args = message.substring(1).split(' ')
        handleInput(userID, channelID, args)
    }
})























// /poll new varargs categories
// --> @kylebgu3 started a new poll: NAME
// -->
// /poll end NAME
