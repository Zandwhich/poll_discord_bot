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

// The filename of the JSON that holds all of the active polls
const POLLS_ACTIVE_FILENAME = "./polls_active.json"

// The filename of the JSON that holds all of the finished polls
const POLLS_FINISHED_FILENAME = "./polls_finished.json"

// A list of bad poll names that screw with everything
const BAD_POLL_NAMES = ['']


/* ******** *
 * MESSAGES *
 * ******** */
//#region HELPERS

/**
 * Returns text that will mention a user
 * @param {string} userID The user which to mention
 */
function mentionUser(userID) {
    return '<@' + userID + '>'
}


/**
 * Sends the passed-in message to the passed-in channel
 * @param {string} channelID The ID of the channel
 * @param {string} message The message to send
 */
function sendMessage(channelID, message) {
    bot.sendMessage({
        to: channelID,
        message: message
    })
}


/**
 * Draws from a preset list of error messages depending on the ErrorCode
 * @param {string} userID The user which to mention
 * @param {string} channelID The channel to send the message in
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
            case ERROR_CODES.BAD_POLL_NAME:
                return 'Yo, \'' + args[0] + '\' is a bad poll name'
            default:
                return 'Idk what went wrong G'
        }
    })(errorCode, args)

    message = "> " + mentionUser(userID) + ' ' + message

    sendMessage(channelID, message)
}

//#endregion HELPERS


/* ********* *
 * GET POLLS *
 * ********* */
//#region GET_POLLS

/**
 * Returns all of the active polls as a JSON object.
 * If it doesn't exist, it creates a new one
 * @returns {JSON} The polls as a JSON object
 */
function getActivePolls() {
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
 * Gets all of the active polls for the given channel
 * @param {string} channelID The channel ID
 */
function getActiveChannelPolls(channelID) {
    let polls = getActivePolls()

    if (polls[channelID] == undefined) polls[channelID] = {}

    return polls[channelID]
}


/**
 * Returns the JSON the poll if it exists for this channel, false otherwise
 * @param {string} pollName The name of the poll
 * @param {string} channelID The ID of the channel
 * @returns {JSON, boolean} the JSON the poll if it exists for this channel, false otherwise
 */
function getActivePoll(pollName, channelID) {
    const polls = getActiveChannelPolls(channelID)
    return polls[pollName] == undefined ? false : polls[pollName]
}

//#endregion GET_POLLS


/* ********** *
 * SAVE POLLS *
 * *********** */
 //#region SAVE_POLLS

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
    let channelPolls = getActiveChannelPolls(channelID)
    channelPolls[pollName] = poll

    let polls = getActivePolls()
    polls[channelID] = channelPolls

    writeActivePolls(polls)
}

//#endregion SAVE_POLLS


/* ************ *
 * CREATE POLLS *
 * ************ */
//#region CREATE_POLLS

/**
 * Creates the poll if one with the same name doesn't already exist in this channel
 * TODO: Decide if we are going to be returning error values or not
 * @param {string} pollName The name of the poll
 * @param {string} userID The user that is creating the poll
 * @param {string} channelID The channel in which the poll is being created
 * @param {HTMLAllCollection} options The options for the poll
 */
function createNewPoll(pollName, userID, channelID, options = []) {

    // Check if this poll already exists; if it does, throw an error
    if (getActivePoll(pollName, channelID) != false) {
        errorMessage(userID, channelID, ERROR_CODES.POLL_EXISTS)
        return    
    }

    // Check if this is an acceptable poll name
    if (BAD_POLL_NAMES.includes(pollName)) {
        errorMessage(userID, channelID, ERROR_CODES.BAD_POLL_NAME, [pollName])
        return
    }

    // Create a new empty poll
    let poll           = {}         // Creating the empty poll objects
    poll['options']    = []         // The different voting options of the poll
    poll['time_start'] = Date.now() // The time at which the poll started
    poll['time_end']   = -1         // The time at which the poll ended
    poll['owner']      = userID     // The owner of the poll
    poll['settings']   = {}         // The settings of the poll
    // poll['votes']      = []      // TODO: Figure out why I put this here...

    // Set all of the options to the options passed in
    for (let i = 0; i < options.length; i++) {
        const option = options[i].toLowerCase()
        poll['options'].push({"name":option, "votes":[], "created":Date.now()})
    }

    // Set in the settings that users can vote multiple times
    poll['settings']['multiple_votes'] = true

    saveActivePoll(channelID, pollName, poll)

    // Send a message saying the poll has been created succesfully
}

/**
 * Handles creating a new poll
 * @param {string} userID The user who started the poll
 * @param {string} channelID The channel in which the poll is started
 * @param {string[]} args The arguments to go along with the poll
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

//#endregion CREATE_POLLS


/* ********** *
 * LIST POLLS *
 * ********** */
//#region LIST_POLLS

/**
 * Outputs a list of all of the active polls
 * @param {string} channelID The channel from which to grab the polls
 */
function handleListActivePolls(userID, channelID) {
    const polls = getActiveChannelPolls(channelID)

    var text = mentionUser(userID) + " all active polls for this channel:"

    console.log(JSON.stringify(polls))

    for (let poll in polls) {
        text += "\n* `" + poll + "`"
    }

    sendMessage(channelID, text)
}

//#endregion LIST_POLLS


/* ********** *
 * VIEW POLLS *
 * ********** */
//#region VIEW_POLLS

/**
 * Returns the information on how the voting for a given poll
 * @param {string} userID The user who made the request
 * @param {string} channelID The channel
 * @param {string[]} args The arguments for viewing this poll
 */
function handleViewPoll(userID, channelID, args) {
    console.log("handleViewPoll with args: " + JSON.stringify(args))

    // Check to see if arguments were passed in
    if (args.length < 1) {
        console.log("Here")
        errorMessage(userID, channelID, ERROR_CODES.MISSING_PARAM)
        return
    }

    const pollName = args[0]
    const poll = getActivePoll(pollName, channelID)

    // Check to see if the poll exists
    if (!poll) {
        errorMessage(userID, channelID, ERROR_CODES.POLL_NOT_EXISTS)
        return
    }

    // Start the text to be output
    var text = "View Poll " + mentionUser(userID) + ":\n" + pollName

    // List all of the options and how many votes each one has received
    const options = poll['options']
    options.forEach(option => {
        text += "\n  * `" + option['name'] + "`: " + option['votes'].length
    })

    sendMessage(channelID, text)
}

//#endregion VIEW_POLLS

/* ****** *
 * VOTING *
 * ****** */
//#region VOTING

/**
 * Returns true if a given option exists in a poll; false otherwise
 * @param {string} pollName The name of the poll
 * @param {string} option The option to check
 * @param {string} channelID The ID of the channel
 * @returns {boolean} true if the given option exists in a poll; false otherwise
 */
function doesOptionExistInPoll(pollName, option, channelID, userID) {
    // If the poll itself doesn't exist, then return false
    const poll = getActivePoll(pollName, channelID)
    if (poll == false) return false

    const options = poll['options']

    let doesExist = false
    options.forEach(element => {
        if (element['name'] == option) doesExist = true
    })
    return doesExist
}

/**
 * Votes in the poll with the given votes
 * @param {string} pollName The name of the poll in which to vote
 * @param {string[]} votes The options to vote for in the poll
 * @param {string} userID The id of the user
 * @param {string} channelID the id of the channel
 */
function voteInPoll(pollName, votes, userID, channelID) {
    // Get the poll
    if (!getActivePoll(pollName, channelID)) {
        errorMessage(userID, channelID, ERROR_CODES.POLL_NOT_EXISTS)
        return
    }
    let poll = getActivePoll(pollName, channelID)

    // Go through every vote
    votes.forEach(vote => {

        // See if an option for that vote exists
        poll['options'].forEach(option => {

            // If it exists, set the option to have another vote
            if (option['name'] == vote) {
                let vote = {}
                vote['user'] = userID
                vote['time'] = Date.now()

                option['votes'].push(vote)

                return
            }
        })
    })

    // Save the updated poll
    saveActivePoll(channelID, pollName, poll)
}

/**
 * Handles voting in a poll
 * @param {string} userID The user who is voting
 * @param {string} channelID The channel in which poll is
 * @param {string} args The arguments for voting
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

//#endregion VOTING


/* ********* *
 * END POLLS *
 * ********* */
//#region END_POLLS

/**
 * Handles ending a poll
 * @param {string} userID The user that ended the poll
 * @param {string} channelID The channel in which the poll is taking place
 * @param {string} args The arguments about the poll
 */
function handleEndPoll(userID, channelID, args) {
    errorMessage(userID, channelID, ERROR_CODES.DEVS_SUCK)
}

//#endregion END_POLLS

/**
 * Takes care of the input
 * @param {string} userID The user that sent the input
 * @param {string} channelID The channel in which the messgae was sent
 * @param {string[]} args The arguments passed in
 */
function handleInput(userID, channelID, args) {

    console.log("\n")
    console.log("handleInput with args: " + JSON.stringify(args))

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

    console.log("handleInput switch with args: " + JSON.stringify(args))

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
        case 'list':
            handleListActivePolls(userID, channelID)
            break
        case 'view':
            handleViewPoll(userID, channelID, args)
            break
        default:
            errorMessage(userID, channelID, ERROR_CODES.UNKNOWN_PARAM)
            break
    }
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
    logger.info(' # Poll         version ' + package.version + ' # ')
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
