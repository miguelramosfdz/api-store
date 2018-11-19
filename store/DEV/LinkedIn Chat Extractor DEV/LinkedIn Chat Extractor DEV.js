// Phantombuster configuration {
"phantombuster command: nodejs"
"phantombuster package: 5"
"phantombuster dependencies: lib-StoreUtilities.js, lib-LinkedIn.js, lib-LinkedInScraper.js"

const Buster = require("phantombuster")
const buster = new Buster()

const Nick = require("nickjs")
const nick = new Nick({
	loadImages: true,
	userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:54.0) Gecko/20100101 Firefox/54.0",
	printPageErrors: false,
	printRessourceErrors: false,
	printNavigation: false,
	printAborts: false
})

const StoreUtilities = require("./lib-StoreUtilities")
const utils = new StoreUtilities(nick, buster)

const LinkedIn = require("./lib-LinkedIn")
const linkedin = new LinkedIn(nick, buster, utils)

const LinkedInScraper = require("./lib-LinkedInScraper")
const linkedInScraper = new LinkedInScraper(utils, null, nick)

const { URL } = require("url")

const SHORT_DB_NAME = "linkedin-chat-extractor"
const DB_NAME = SHORT_DB_NAME + ".csv"

const SELECTORS = {
	conversationTrigger: "section.pv-profile-section div.pv-top-card-v2-section__info div.pv-top-card-v2-section__actions button",
	chatWidget: "aside#msg-overlay div.msg-overlay-conversation-bubble--is-active.msg-overlay-conversation-bubble--petite",
	closeChatButton: "button[data-control-name=\"overlay.close_conversation_window\"]",
	messages: ["ul.msg-s-message-list", "ul.msg-s-message-list-content"],
	spinners: "li-icon > .artdeco-spinner",
	addRequestNote: "header.send-invite__header"
}
const ajaxBundle = { convId: -1, date: Date.now(), headers: null }
let interceptSuccess = false

/* global $ */

// }

/**
 * @param {String} url
 * @return {Boolean}
 */
const isLinkedInProfile = url => {
	try {
		return (new URL(url)).pathname.startsWith("/in/")
	} catch (err) {
		return false
	}
}

/**
 * @param {String} url
 * @return {Boolean}
 */
const isMessageThread = url => {
	try {
		return (new URL(url)).pathname.startsWith("/messaging/thread/")
	} catch (err) {
		return false
	}
}

/**
 * @param {String} url
 * @return {String|null}
 */
const extractThreadId = url => {
	try {
		let rep = new URL(url)
		return rep.pathname.split("/").find(el => !isNaN(parseInt(el, 10)))
	} catch (err) {
		return null
	}
}

/**
 * @async
 * @description Simple method used to check if the parameter URL is a real LinkedIn profile
 * In success the tab will be ready to scrape
 * @param {Any} tab - Nickjs Tab instance
 * @param {String} url - LinkedIn Profile URL
 * @return {Promise<Boolean|String>} true or false otherwise an string error
 */
const isRealProfile = async (tab, url, threadUrl = false) => {
	try {
		if (threadUrl) {
			await tab.open(url)
			await tab.waitUntilVisible("div.msg-thread", 15000)
			await tab.waitWhileVisible(".artdeco-spinner", 15000)
		} else {
			await linkedInScraper.visitProfile(tab, url, true)
		}
	} catch (err) {
		if (await tab.getUrl() === "https://www.linkedin.com/in/unavailable/") {
			return false
		} else {
			return err.message || err
		}
	}
	return true
}

/**
 * @description Nickjs listener used on thread message pages
 */
const getThreadHeaders = e => {
	if ((e.request.url.indexOf("/voyager/api/messaging/conversations") > -1) && !interceptSuccess) {
		ajaxBundle.headers = Object.assign({}, e.request.headers)
		ajaxBundle.headers["Accept"] = "application/json"
		interceptSuccess = true
	}
}

/**
 * @description Nickjs listener used on LinkedIn profiles
 */
const httpSendInterceptor = e => {
	if (e.request.url.match(/conversations\/\d+\/events/) && !interceptSuccess) {
		ajaxBundle.headers = Object.assign({}, e.request.headers)
		ajaxBundle.headers["Accept"] = "application/json"
		// Extract chat ID (can be used in the LinkedIn URL: https://www.linkedin.com/messaging/thread/conversationId)
		ajaxBundle.convId = (new URL(e.request.url).pathname).split("/").find(part => !isNaN(parseInt(part, 10)))
		interceptSuccess = true
	}
}

const getMessages = (arg, cb) => {
	$.ajax({
		type: "GET",
		url: `https://www.linkedin.com/voyager/api/messaging/conversations/${arg.bundle.convId}/events?conversationId=${arg.bundle.convId}&createdBefore=${arg.bundle.date}`,
		headers: arg.bundle.headers
	})
	.done(response => cb(null, response))
	.fail(err => cb(null, err.stack))
}

const formatAjaxResponse = msg => {
	const ret = {}
	if (msg.subtype === "INVITATION_ACCEPT") {
		if (msg.from && msg.from["com.linkedin.voyager.messaging.MessagingMember"]) {
			const user = msg.from["com.linkedin.voyager.messaging.MessagingMember"]
			ret.author = `${user.miniProfile.firstName} ${user.miniProfile.lastName}` || null
			ret.profileUrl = `https://www.linkedin.com/in/${user.miniProfile.publicIdentifier}` || null
		}
		ret.message = "no message (Generated by LinkedIn)"
		ret.event = `${ret.author} has accepted your invitation`
	}

	if (msg.subtype === "MEMBER_TO_MEMBER") {
		if (msg.from && msg.from["com.linkedin.voyager.messaging.MessagingMember"]) {
			const user = msg.from["com.linkedin.voyager.messaging.MessagingMember"]
			ret.author = `${user.miniProfile.firstName} ${user.miniProfile.lastName}` || null
			ret.profileUrl = `https://www.linkedin.com/in/${user.miniProfile.publicIdentifier}` || null
		}
		if (msg.eventContent && msg.eventContent["com.linkedin.voyager.messaging.event.MessageEvent"]) {
			const event = msg.eventContent["com.linkedin.voyager.messaging.event.MessageEvent"]
			ret.message = event.body || null
		}
	}
	ret.date = msg.createdAt ? (new Date(msg.createdAt).toLocaleString()) : null
	return ret
}

/**
 * @async
 * @description Function used to load and scrape messages from a conversation
 * @param {Object} tab - Nickjs Tab instance with a loaded profile
 * @param {Number} messagesPerExtract - Amount of messages to scrape for the current conversation
 * @param {Boolean} [chronOrder] - determines if messages should be returned from the oldest to the newest or not (default is false)
 * @throws on CSS selectors failure
 * @return {Promise<Array<Object>>} all messages
 */
const getMessagesByProfile = async (tab, messagesPerExtract, chronOrder = false, isThread = false) => {
	let messagesLoaded = 0
	let conversation = []
	let loadAgain = true
	if (!isThread) {
		try {
			await tab.click(SELECTORS.conversationTrigger)
			await tab.waitUntilVisible(SELECTORS.chatWidget, 15000)
			await tab.waitUntilVisible(SELECTORS.messages, "or" ,15000)
			await tab.waitWhileVisible(SELECTORS.spinners, 15000)
		} catch (err) {
			if (await tab.isVisible(SELECTORS.addRequestNote)) {
				throw "Request network is pending OR you're not connected with the user, can't scrape messages"
			}
			throw `Can't open conversation due to: ${err.message || err}`
		}
	}

	if (!interceptSuccess) {
		utils.log(`Can't find a way to load messages in the conversation (${await tab.getUrl()})`, "error")
		if (await tab.isVisible(SELECTORS.chatWidget)) {
			await tab.click(`${SELECTORS.chatWidget} ${SELECTORS.closeChatButton}`)
		}
		return { conversationUrl: null, messages: conversation }
	}

	if (isThread) {
		const threadId = extractThreadId(await tab.getUrl())
		ajaxBundle.convId = threadId
	}

	while (loadAgain) {
		let xhrReponse = null
		if (messagesPerExtract) {
			if (messagesLoaded >= messagesPerExtract) {
				loadAgain = false
			}
		}
		try {
			xhrReponse = await tab.evaluate(getMessages, { bundle: ajaxBundle })
		} catch (err) {
			break
		}

		if (!xhrReponse || xhrReponse.count < 1) {
			break
		}
		const elderTimestamp = Math.min.apply(null, xhrReponse.elements.map(el => el.createdAt))
		ajaxBundle.date = elderTimestamp
		conversation.push(...xhrReponse.elements.map(formatAjaxResponse).reverse())
		messagesLoaded = conversation.length
		utils.log(`${messagesLoaded} messages loaded in the conversation`, "info")
	}
	utils.log(`${messagesLoaded} messages scraped in the conversation`, "done")
	if (chronOrder) {
		conversation.reverse()
	}
	interceptSuccess = false
	ajaxBundle.date = Date.now()
	if (!isThread) {
		await tab.click(`${SELECTORS.chatWidget} ${SELECTORS.closeChatButton}`)
	}
	conversation = messagesPerExtract ? conversation.slice(0, messagesPerExtract) : conversation
	return { conversationUrl: `https://www.linkedin.com/messaging/thread/${ajaxBundle.convId}/`, messages: conversation, url: await tab.getUrl() }
}

/**
 * @description Common wrapper used to create the CSV output from the JSON output
 * @param {Array<Object>} json - JSON output
 * @return {Array<Object>} CSV output
 */
const jsonToCsvOutput = json => {
	const csv = []
	for (const conv of json) {
		let tmp = conv.messages.map(el => {
			el.conversationUrl = conv.conversationUrl
			el.url = conv.url
			return el
		})
		csv.push(...tmp)
	}
	return csv
}

;(async () => {
	const tab = await nick.newTab()
	let { sessionCookie, spreadsheetUrl, columnName, profilesPerLaunch, messagesPerExtract, queries, chronOrder, noDatabase } = utils.validateArguments()
	let db = noDatabase ? [] : await utils.getDb(DB_NAME)
	const currentScraping = []
	let step = 0

	if (spreadsheetUrl) {
		queries = isLinkedInProfile(spreadsheetUrl) || isMessageThread(spreadsheetUrl) ? [ spreadsheetUrl ] : await utils.getDataFromCsv(spreadsheetUrl.trim(), columnName)
	} else if (typeof queries === "string") {
		queries = [ queries ]
	}
	queries = queries.filter(el => db.findIndex(line => line.url === el) < 0)
	if (profilesPerLaunch) {
		queries = queries.slice(0, profilesPerLaunch)
	}
	if (queries.length < 1) {
		utils.log("Spreadsheet is empty or every conversations are scraped", "warning")
		nick.exit(0)
	}
	utils.log(`Urls to scrape ${JSON.stringify(queries, null, 2)}`, "info")
	await linkedin.login(tab, sessionCookie)
	for (const convUrl of queries) {
		const timeLeft = await utils.checkTimeLeft()
		if (!timeLeft.timeLeft) {
			utils.log(timeLeft.message, "warning")
			break
		}
		buster.progressHint((step++) + 1 / queries.length, `Conversation: ${convUrl}`)
		let convRes = { conversationUrl: convUrl, messages: [] }
		const isThreadURL = isMessageThread(convUrl)
		tab.driver.client.addListener("Network.requestWillBeSent", isThreadURL ? getThreadHeaders : httpSendInterceptor)
		let tmp = await isRealProfile(tab, convUrl, isThreadURL)
		if (typeof tmp === "string" || (typeof tmp === "boolean" && !tmp)) {
			convRes.error = typeof tmp === "string" ? tmp : "Unavailable profile"
			convRes.messages.push({ error: convRes.error })
			currentScraping.push(convRes)
			continue
		}
		utils.log(`Loading conversation in ${convUrl} ...`, "loading")
		let conversation
		try {
			conversation = await getMessagesByProfile(tab, messagesPerExtract, chronOrder, isThreadURL)
		} catch (err) {
			utils.log(`No messages in ${convUrl} (${err.message || err})`, "warning")
			currentScraping.push({ url: convUrl, error: `${err.message || err}`, messages: [ { error: `${err.message || err}` } ] })
			continue
		}
		tab.driver.client.removeListener("Network.requestWillBeSent", isThreadURL ? getThreadHeaders : httpSendInterceptor)
		currentScraping.push(conversation)
	}
	db.push(...jsonToCsvOutput(currentScraping))
	await utils.saveResults(noDatabase ? [] : currentScraping, noDatabase ? [] : db, SHORT_DB_NAME, null, false)
	nick.exit()
})().catch(err => {
	utils.log(`Error during the API execution: ${err.message || err}`, "error")
	nick.exit(1)
})
