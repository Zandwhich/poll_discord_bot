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

/* ********* *
 * CONSTANTS *
 * ********* */
//#region CONSTANTS

/**
 * The filename of the JSON that holds all of the active polls
 */
const POLLS_ACTIVE_FILENAME = "./polls_active.json"

/**
 * The filename of the JSON that holds all of the finished polls
 */
const POLLS_FINISHED_FILENAME = "./polls_finished.json"

/**
 * A list of bad poll names that screw with everything
 */
const BAD_POLL_NAMES = ['']

/* POLL JSON VALUES */
//#region POLL_JSON

/**
 * The name of the poll
 */
const POLL_JSON_NAME = 'name'

/**
 * The start time of the poll
 */
const POLL_JSON_START_TIME = 'time_start'

/**
 * The end time of the poll
 */
const POLL_JSON_END_TIME = 'time_end'

/**
 * The owner of the poll
 */
const POLL_JSON_OWNER = 'owner'

/**
 * For the list containing all of the users who have voted
 */
const POLL_JSON_HAS_VOTED = 'has_voted'

/**
 * The settings of the poll
 */
const POLL_JSON_SETTINGS = 'settings'

/**
 * The name of the setting to allow users to vote for multiple options
 */
const POLL_JSON_SETTINGS_MULTIPLE_VOTES = 'multiple_votes'

/**
 * The name of the list that contains all of the possible options for which to vote
 */
const POLL_JSON_OPTIONS = 'options'

/**
 * The name of an option for the poll
 */
const POLL_JSON_OPTION_NAME = 'name'

/**
 * When the option
 */
const POLL_JSON_OPTION_CREATED = 'time_created'

/**
 * The votes that are cast for an option
 */
const POLL_JSON_OPTION_VOTES = 'votes'

/**
 * The user that voted for this
 */
const POLL_JSON_OPTION_VOTES_USER = 'user'

/**
 * The time when the user voted
 */
const POLL_JSON_OPTION_VOTES_TIME = 'time'

//#endregion POLL_JSON

//#endregion CONSTANTS


/* **** *
 * HELP *
 * **** */
//#region HELP

/**
 * Handles what happens when the help action is called
 * @param {string} userID The ID of the user
 * @param {string} channelID The ID of the channel
 */
function handleHelp(userID, channelID) {
    var message = "> " + mentionUser(userID) + ", here are some commands you can run:\n"
    message += "> * `!poll help`: Displays this message\n"
    message += "> * `!poll new/create poll_name opt1 opt2...`: Creates a new poll for this channel with the name '`poll_name`' and options '`opt1`' and '`opt2`' (can create from 0 to as many options as you want)\n"
    message += "> * `!poll vote poll_name opt1 opt2`: Votes for options '`opt1`' and '`opt2`' in the poll '`poll_name`'. You can have from 1 to as many options as you like, given the poll allows for multiple votes\n"
    message += "> * `!poll list`: List all of the active polls for this channel\n"
    message += "> * `!poll view poll_name`: Views the settings, the options, and the number of votes per option for an active poll in this channel with the name '`poll_name`'\n"

    sendMessage(channelID, message)
}

//#endregion HELP

/* ******** *
 * MESSAGES *
 * ******** */
//#region MESSAGES

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
                return 'Dude, `' + args[0] + '` is already an option'
            case ERROR_CODES.OPTION_NOT_EXISTS:
                return 'Dude, `' + args[0] + '` is not a valid option'
            case ERROR_CODES.BAD_POLL_NAME:
                return 'Yo, \'' + args[0] + '\' is a bad poll name'
            default:
                return 'Idk what went wrong G'
        }
    })(errorCode, args)

    message = "> " + mentionUser(userID) + ' ' + message

    sendMessage(channelID, message)
}

/**
 * Outputs a message upon succesfully voting for something
 * @param {string} channelID The channel
 * @param {string} userID The channel
 * @param {string} pollName The name of the poll
 * @param {string[]} votes The succesful votes
 */
function messageSuccesfulVotes(channelID, userID, pollName, votes) {
    var text = '> ' + mentionUser(userID) + ', you successfully voted in `' + pollName + '` for the following options:'

    votes.forEach(vote => {
        text += '\n>  * `' + vote + '`'
    });

    sendMessage(channelID, text)
}

/**
 * Outputs a message when a user tries to vote for an option they already voted for
 * @param {string} channelID The ID of the channel
 * @param {string} userID The ID of the user
 * @param {string} pollName The name of the poll
 * @param {string[]} votes The votes that were already voted for
 */
function messageAlreadyVoted(channelID, userID, pollName, votes) {
    var text = '> ' + mentionUser(userID) + ', you already voted in `' + pollName + '` for the following options:'

    votes.forEach(vote => {
        text += '\n>  * `' + vote + '`'
    });

    sendMessage(channelID, text)
}

/**
 * Outputs a message when a user tries to vote for an option that doesn't exist
 * @param {string} channelID The ID of the channel
 * @param {string} userID The ID of the user
 * @param {string} pollName The name of the poll
 * @param {string[]} votes The options that don't exist
 */
function messageVotesDontExist(channelID, userID, pollName, votes) {
    var text = '> ' + mentionUser(userID) + ', the following options don\'t exist in `' + pollName + '`:'

    votes.forEach(vote => {
        text += '\n>  * `' + vote + '`'
    });

    sendMessage(channelID, text)
}

//#endregion MESSAGES


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
    let poll                   = {}         // Creating the empty poll objects
    poll[POLL_JSON_NAME]       = pollName   // The name of the poll
    poll[POLL_JSON_OPTIONS]    = []         // The different voting options of the poll
    poll[POLL_JSON_START_TIME] = Date.now() // The time at which the poll started
    poll[POLL_JSON_END_TIME]   = -1         // The time at which the poll ended
    poll[POLL_JSON_OWNER]      = userID     // The owner of the poll
    poll[POLL_JSON_SETTINGS]   = {}         // The settings of the poll
    poll[POLL_JSON_HAS_VOTED]  = []         // The users that have voted for this poll
    // poll['votes']      = []      // TODO: Figure out why I put this here...

    // Set all of the options to the options passed in
    for (let i = 0; i < options.length; i++) {
        const option = options[i]
        let option_json = {}

        option_json[POLL_JSON_OPTION_NAME]    = option
        option_json[POLL_JSON_OPTION_VOTES]   = []
        option_json[POLL_JSON_OPTION_CREATED] = Date.now()

        poll[POLL_JSON_OPTIONS].push(option_json)
    }

    // Set in the settings that users can vote multiple times
    poll[POLL_JSON_SETTINGS][POLL_JSON_SETTINGS_MULTIPLE_VOTES] = true

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
    var text = "> View Poll " + mentionUser(userID) + ":\n> " + pollName

    // List all of the options and how many votes each one has received
    const options = poll[POLL_JSON_OPTIONS]
    options.forEach(option => {
        text += "\n>  * `" + option[POLL_JSON_OPTION_NAME] + "`: " + option[POLL_JSON_OPTION_VOTES].length
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
 * @param {JSON} poll The name of the poll
 * @param {string} option The option to check
 * @returns {boolean} true if the given option exists in a poll; false otherwise
 */
function doesOptionExistInPoll(poll, option) {
    // Get the options of the poll
    const options = poll[POLL_JSON_OPTIONS]

    let doesExist = false
    options.forEach(element => {
        if (element[POLL_JSON_OPTION_NAME] == option) doesExist = true
    })
    return doesExist
}

/**
 * Checks to see if the user has voted (for any option) in the poll
 * @param {JSON} poll The poll in which to check 
 * @param {string} userID The user to check if has voted 
 */
function hasVotedInPoll(poll, userID) {
    const voters = poll[POLL_JSON_HAS_VOTED]

    var has_voted = false
    voters.forEach(voter => {
        if (voter == userID) {
            has_voted = true
            return
        }
    });

    return has_voted
}

/**
 * Checks to see if the user has voted for a given option in a given poll
 * @param {JSON} poll The poll in which to check
 * @param {string} userID The user to see if has voted
 * @param {string} option The option
 */
function hasVotedForOption(poll, userID, option) {
        // First check if the option exists in the poll
    if (!doesOptionExistInPoll(poll, option)) return false

    const poll_options = poll[POLL_JSON_OPTIONS]

    var has_voted = false

    poll_options.forEach(poll_option => {
        if (poll_option[POLL_JSON_OPTION_NAME] == option) {
            const votes = poll_option[POLL_JSON_OPTION_VOTES]

            votes.forEach(vote => {
                if (vote[POLL_JSON_OPTION_VOTES_USER] == userID) {
                    has_voted = true
                    return
                }
            });

            return
        }
    });

    return has_voted
}

/**
 * Votes in the poll with the given votes
 * @param {JSON} poll The poll in which to vote
 * @param {string[]} votes The options to vote for in the poll
 * @param {string} userID The id of the user
 * @param {string} channelID the id of the channel
 */
function voteInPoll(poll, votes, userID, channelID) {
    // Keep track of the succesful votes to output at the end
    let succesful_votes = []

    // Keep track of the options this user already voted for
    let already_voted = []

    // Keep track of the options this user tried to vote for but don't exist
    let not_exists = []

    // Go through every vote
    votes.forEach(voteName => {

        var exists = false
        // See if an option for that vote exists
        poll[POLL_JSON_OPTIONS].forEach(option => {

            // If it exists, set the option to have another vote
            if (option[POLL_JSON_OPTION_NAME] == voteName && !hasVotedForOption(poll, userID, voteName)) {
                let vote = {}
                vote[POLL_JSON_OPTION_VOTES_USER] = userID
                vote[POLL_JSON_OPTION_VOTES_TIME] = Date.now()

                option[POLL_JSON_OPTION_VOTES].push(vote)

                succesful_votes.push(option[POLL_JSON_OPTION_NAME])

                exists = true
                return
            } else if (option[POLL_JSON_OPTION_NAME] == voteName && hasVotedForOption(poll, userID, voteName)) {
                already_voted.push(voteName)

                exists = true
                return 
            }
        })
        if (!exists) not_exists.push(voteName)
    })

    if (!hasVotedInPoll(poll, userID)) poll[POLL_JSON_HAS_VOTED].push(userID)

    // Save the updated poll
    saveActivePoll(channelID, poll[POLL_JSON_NAME], poll)

    if (succesful_votes.length > 0) messageSuccesfulVotes(channelID, userID, poll[POLL_JSON_NAME], succesful_votes)
    if (already_voted.length > 0)   messageAlreadyVoted(channelID, userID, poll[POLL_JSON_NAME], already_voted)
    if (not_exists.length > 0)      messageVotesDontExist(channelID, userID, poll[POLL_JSON_NAME], not_exists)
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

    let poll = getActivePoll(pollName, channelID);
    if (!poll) {
        errorMessage(userID, channelID, ERROR_CODES.POLL_NOT_EXISTS)
        return
    }

    voteInPoll(poll, args, userID, channelID)
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

    let cmd = args[0]

    cmd = cmd.toLowerCase()
    args = args.splice(1)

    // Check to see if the command is correct
    if (cmd != 'poll') {
        errorMessage(userID, channelID, ERROR_CODES.BAD)
        return
    }

    // Check to see if the appropriate number of arguments were passed in
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
        case 'list':
            handleListActivePolls(userID, channelID)
            break
        case 'view':
            handleViewPoll(userID, channelID, args)
            break
        case 'help':
            handleHelp(userID, channelID)
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
