// Author: Alex Zdanowicz and Shengbo Jia

// This code was inspired from:
// https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/


// Imports
const Discord = require('discord.io')
const logger = require('winston')
const fs = require('fs')

// Node.JS imports
const package = require('./package.json')

// Project imports
const auth = require('./auth.json')

// Enums
const ERROR_CODES = require('./enums/ERROR_CODES.json')
const { Z_VERSION_ERROR } = require('zlib')

// The filename of the JSON that holds all of the active polls
const POLLS_ACTIVE_FILENAME = "./polls_active.json"

// The filename of the JSON that holds all of the finished polls
const POLLS_FINISHED_FILENAME = "./polls_finished.json"


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
 * @param {string[]} args Any additional argument(s) for the given error message
 */
function errorMessage(userID, channelID, errorCode, args = ['']) {
    let message = (function(code, args) {
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
            case ERROR_CODES.POLL_EXISTS:
                return 'Bruh, a poll with that name already exists'
            case ERROR_CODES.POLL_NOT_EXISTS:
                return 'Bruh, a poll with that name doesn\'t exist'
            case ERROR_CODES.OPTION_EXISTS:
                return 'Dude, ' + args[0] + ' is already an option'
            case ERROR_CODES.OPTION_NOT_EXISTS:
                return 'Dude, ' + args[0] + ' is not a valid option'
            default:
                return 'Idk what went wrong G'
        }
    })(errorCode, args)

    bot.sendMessage({
        to: channelID,
        message: mentionUser(userID) + ' ' + message
    })
}

/* ********* *
 * GET POLLS *
 * ********* */

/**
 * Returns all of the active polls as a JSON object.
 * If it doesn't exist, it creates a new one
 * @param {*} channelID The channel in which this poll is taking place
 * @returns {JSON} The polls as a JSON object
 */
function getActivePollsForChannel(channelID) {
    let polls 
    try {
        polls = JSON.parse(fs.readFileSync(POLLS_ACTIVE_FILENAME))
    } catch (error) {
        // TODO: Figure out what the hell to do when you can't read the file
    }

    if (polls == undefined) polls = {}
    if (polls[channelID] == undefined) polls[channelID] = {}
 
    return polls
}


/**
 * Returns all of the polls in the JSON (including all outside of the channel)
 * NOTE: To be used mostly with saving
 * @returns {JSON} All of the polls as a JSON object
 */
function getAllActivePolls() {
    let polls
    try {
        polls = JSON.parse(fs.readFileSync(POLLS_ACTIVE_FILENAME))
    } catch (error) {
        // TODO: Figure out what the hell to do when you can't read the file
    }

    if (polls == undefined) polls = {}

    return polls
}

/**
 * Returns the JSON the poll if it exists for this channel, false otherwise
 * @param {string} pollName The name of the poll
 * @param {string} channelID The ID of the channel
 * @returns {JSON, boolean} the JSON the poll if it exists for this channel, false otherwise
 */
function getPoll(pollName, channelID) {
    const polls = getActivePollsForChannel(channelID)
    return polls[channelID][pollName] == undefined ? false : polls[channelID][pollName]
}


/**
 * Saves the passed-in polls data in the polls file
 * @param {JSON} polls The polls data in the JSON format
 */
function writeActivePolls(polls)
{
    try {
        fs.writeFileSync(POLLS_ACTIVE_FILENAME, JSON.stringify(polls, null, '\t'))
    } catch(error) {
        // TODO: Figure out what the hell to do with the error
    }
}


/**
 * Writes the polls to the polls_active.json file
 * @param {string} channelID The string ID for the given channel
 * @param {string} pollName The name of the poll
 * @param {JSON} poll The poll as a JSON object
 */
function saveActivePoll(channelID, pollName, poll)
{
    let polls = getAllActivePolls()

    polls[channelID][pollName] = poll

    writeActivePolls(polls)
}


/**
 * Returns true if a given option exists in a poll; false otherwise
 * @param {string} pollName The name of the poll
 * @param {string} option The option to check
 * @param {string} channelID The ID of the channel
 * @returns {boolean} true if the given option exists in a poll; false otherwise
 */
function doesOptionExistInPoll(pollName, option, channelID, userID) {
    // If the poll itself doesn't exist, then return false
    const poll = getPoll(pollName, channelID);
    if (poll == false) return false

    const options = poll['options']

    let doesExist = false
    options.forEach(element => {
        if (element['name'] == option) doesExist = true
    });
    return doesExist
}


/**
 * Creates the poll if one with the same name doesn't already exist in this channel
 * TODO: Decide if we are going to be returning error values or not
 * @param {string} pollName The name of the poll
 * @param {*} userID The user that is creating the poll
 * @param {*} channelID The channel in which the poll is being created
 * @param {HTMLAllCollection} options The options for the poll
 */
function createNewPoll(pollName, userID, channelID, options = []) {

    // Check if this poll already exists; if it does, throw an error
    if (getPoll(pollName, channelID) != false) {
        errorMessage(userID, channelID, ERROR_CODES.POLL_EXISTS)
        return    
    }

    // Get the polls object with all of the polls
    let polls = getActivePollsForChannel(channelID)

    // Create a new empty poll
    polls[channelID][pollName]               = {}
    polls[channelID][pollName]['options']    = []
    polls[channelID][pollName]['time_start'] = Date.now()
    polls[channelID][pollName]['time_end']   = -1
    polls[channelID][pollName]['owner']      = userID
    polls[channelID][pollName]['settings']   = []
    polls[channelID][pollName]['votes']      = []

    // Set all of the options to the options passed in
    for (let i = 0; i < options.length; i++) {
        const option = options[i].toLowerCase()
        polls[channelID][pollName]['options'].push({"name":option, "votes":[]})
    }

    writeActivePolls(polls);
}


/**
 * Votes in the poll with the given options
 * @param {string} pollName The name of the poll in which to vote
 * @param {string[]} options The options to vote for in the poll
 * @param {string} userID The id of the user
 * @param {string} channelID the id of the channel
 */
function voteInPoll(pollName, options, userID, channelID) {
    if (!getPoll(pollName, channelID)) {
        errorMessage(userID, channelID, ERROR_CODES.POLL_NOT_EXISTS)
        return
    }

    let poll = getPoll(pollName, channelID)

    options.forEach(option => {
        if (!doesOptionExistInPoll(pollName, option, channelID, userID)) {
            errorMessage(userID, channelID, ERROR_CODES.OPTION_NOT_EXISTS, [option])
        } else {

            let vote = {}
            vote['user'] = userID
            vote['time'] = Date.now()

            console.log(JSON.stringify(vote))

            poll['options'].push(vote)
        }
    });

    saveActivePoll(channelID, pollName, poll)
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
        case 'create':
        case 'new':
            handleNewPoll(userID, channelID, args)
            break
        case 'finish':
        case 'end':
            handleEndPoll(userID, channelID, args)
            break
        case 'vote':
        case 'option':
            handleVoting(userID, channelID, args)
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
    // Check to see if correct arguments were passed in
    if (args.length == 0) {
        errorMessage(userID, channelID, ERROR_CODES.MISSING_PARAM)
        return
    }

    const name = args[0].toLowerCase()
    args = args.splice(1)

    createNewPoll(name, userID, channelID, args)
}


/**
 * Handles voting in a poll
 * @param {*} userID The user who is voting
 * @param {*} channelID The channel in which poll is
 * @param {*} args The arguments for voting
 */
function handleVoting(userID, channelID, args) {
    // Check to see if correct arguments were passed in
    if (args.length < 2) {
        errorMessage(userID, channelID, ERROR_CODES.MISSING_PARAM)
        return
    }

    const pollName = args[0].toLowerCase()
    args = args.splice(1)

    voteInPoll(pollName, args, userID, channelID)
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
const bot = new Discord.Client({
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
