var chatMessagesDiv = null; // document.getElementsByClassName("messages")[0]

const imagePlaceholderColor = "#0080ff";
const infoColor = "#FFFFFF";
const warnColor = "#FFC000";
const errorColor = "#ff0000";

function findInStruct(struct, nameToFind) {
	if (struct != null) for (let [name, url] of Object.entries(struct))
		if (nameToFind === name) return url;
	return null;
}

function createMessageChunkImage(src, cssClass, appendTo) {
	const chunk = document.createElement('img');
	chunk.src = src;
	chunk.className = cssClass ?? "message-chunk-image";
	chunk.loading = "lazy";
	chunk.decoding = "async";
	if (appendTo != null) appendTo.appendChild(chunk);
	return chunk;
}

function createMessageChunkText(text, cssClass, appendTo) {
	const chunk = document.createElement('p');
	chunk.className = cssClass ?? "message-chunk-text";
	chunk.innerText = text;
	if (appendTo != null) appendTo.appendChild(chunk);
	return chunk;
}

function replaceTagsInTranslation(arguments, ...tagReplacements) {
	arguments = JSON.parse(JSON.stringify(arguments));
	arguments.forEach(argument => {
		tagReplacements.forEach((tagReplacement, i) => {
			for (let [k, v] of Object.entries(argument))
				if (v === `$${i+1}`) argument[k] = tagReplacement;
		})
	});
	return arguments;
}

function makeMessageArgumentsInfo(...arguments) {
	arguments.forEach(argument => {
		if (argument != null) {
			for (let [k, v] of Object.entries(argument)) if (v != null && typeof v === "string" && v.startsWith('@'))
				argument[k] = eval(v.substring(1));
		}
	});
	return arguments;
}

function makeMessage(...chunks) {
	const div = document.createElement('div');
	div.className = "message";

	const consoleLogChunks = [];
	for (let chunk of chunks) {
		let chunkDiv;
		if (chunk.type === "image") {
			chunkDiv = createMessageChunkImage(chunk.url, chunk.cssClass, div);
			consoleLogChunks.push({text: `%c${chunk.text} `, css: `color:${chunk.color ?? imagePlaceholderColor}`});
		} else { // else if (chunk.type === "text")
			chunkDiv = createMessageChunkText(chunk.text, chunk.cssClass, div);
			if (chunk.color) chunkDiv.style.color = chunk.color;
			consoleLogChunks.push({text: `%c${chunk.text}`, css: `color:${chunk.color ?? infoColor}`});
		}

		if (chunkDiv && chunk.attributes) for (let [k, v] of Object.entries(chunk.attributes))
			chunkDiv.setAttribute(k, v);
	}

	// adding message to messages div
	chatMessagesDiv.appendChild(div);

	// removing out of bounds message
	while (chatMessagesDiv.getBoundingClientRect().height > window.innerHeight)
		chatMessagesDiv.removeChild(chatMessagesDiv.children[0]);

	// starting fadeout of message (if allowed)
	if (args.search.fadeout > 0)
		setTimeout(() => { div.className += " decaying" }, args.search.fadeout);

	if (consoleLogChunks.length > 0) {
		let message = "";
		const css = [];
		consoleLogChunks.forEach(v => {
			message += v.text;
			css.push(v.css);
		});
		console.log(message, ...css);
	}

	return div;
}

function removeMessageFromDiv(message) {
	if (args.search.remove_msg == 1)
		chatMessagesDiv.removeChild(message);
	else if (args.search.remove_msg == 2) {
		let separator;
		message.childNodes.forEach(chunk => {
			if (chunk.hasAttribute('isseparator')) separator = chunk;
			else if (separator) {
				message.removeChild(chunk);
			}
		});

		if (separator) {
			separator.innerHTML = `: ${translation.frame.general.message_deleted}`;
			separator.removeAttribute('isseparator');
		}
	}
}

function removeMessageByID(id) {
	chatMessagesDiv.childNodes.forEach(message => {
		if (message == null) return;

		if (message.getAttribute('message-id') === id)
			removeMessageFromDiv(message)
	});
}

function removeAllMessages() {
	chatMessagesDiv.childNodes.forEach(message => {
		if (message != null) removeMessageFromDiv(message)
	});
	makeMessage(...makeMessageArgumentsInfo(...translation.frame.general.chat_cleared));
}

function removeAllUserMessages(userID) {
	chatMessagesDiv.childNodes.forEach(message => {
		if (message == null) return;

		if (message.getAttribute('user-id') === userID)
			removeMessageFromDiv(message)
	});
}


	// TODO: test this and make it work
	// old code btw
	/*

	// adding avatar of channel as img element from where message was posted
	// (works only if twitch_client_id and twitch_token specified in url parameters)
	// source-room-id is null = shared chat is not enabled
	if (extra['source-room-id'] != null) {
		div.setAttribute('source-room-id', extra['source-room-id']);
		logMessage = `(${extra['source-room-id']}) ` + logMessage;
		var channelAvatar = await getChannelAvatar(extra['source-room-id']);
		if (channelAvatar != null)
			createMessageChunkImage(channelAvatar, null, div);
	}
	*/

const translation = {};
async function loadTranslation() {
	const request = await fetch(`../lang/${args.search.lang}.json`);
	const response = await request.json();
	for (let [k, v] of Object.entries(response)) translation[k] = v;
}

async function main() {
	chatMessagesDiv = document.getElementsByClassName("messages")[0];
	const style = chatMessagesDiv.style;
	style.setProperty('--info_color', infoColor);
	style.setProperty('--args_size', `${args.search.size}px`);
	style.setProperty('--args_decay', `${args.search.fadeout}ms`);
	style.setProperty('--args_decay_duration', `${args.search.fadeout_duration}ms`);
	style.setProperty('--args_margin_top', args.search.indent * 0.5);
	style.setProperty('--args_padding', args.search.indent * 0.5);

	makeMessage(...makeMessageArgumentsInfo({type: "image", url: icon, text: "lsc_icon", cssClass: "message-chunk-image badge"}, {text: `${appName} ${version}`, cssClass: "message-chunk-text bold", color: "#8000ff"}));
	await loadTranslation();

	if (args.search.twitch_login == null)
		return makeMessage(...makeMessageArgumentsInfo(...translation.frame.parameter.not_found.twitch_login));
	if (args.search.twitch_access_token == null) {
		twitch.isAnonymous = true;
		makeMessage(...makeMessageArgumentsInfo(...translation.frame.parameter.not_found.twitch_access_token));
	}

	args.search.twitch_login = args.search.twitch_login.toLowerCase();
	args.search.lang ??= 'en';
	args.search.remove_msg = parseInt(args.search.remove_msg ?? '1');
	args.search.size = parseFloat(args.search.size ?? '16');
	args.search.indent = parseFloat(args.search.indent ?? '4');
	args.search.fadeout = parseFloat(args.search.fadeout ?? '0') * 1000;
	args.search.fadeout_duration = parseFloat(args.search.fadeout_duration ?? '0.5') * 1000;
	args.search.twitch_emotes = args.search.twitch_emotes == 1 ? true : false;
	args.search.twitch_reward_redemptions = args.search.twitch_reward_redemptions == 1 ? true : false;
	args.search.twitch_badges = args.search.twitch_badges == 1 ? true : false;
	args.search['7tv_emotes'] = args.search['7tv_emotes'] == 1 ? true : false;

	if (!twitch.isAnonymous) {
		var r = await twitch.validateAccessToken(args.search.twitch_access_token);
		if(!requestIsOK(r.status)) {
			twitch.isAnonymous = true;
			delete args.search.twitch_access_token;
			makeMessage(...makeMessageArgumentsInfo(...translation.frame.parameter.error.twitch_access_token));
			console.log(r);
		}

		if (!twitch.isAnonymous) {
			r = await twitch.getUsersData(args.search.twitch_access_token, args.search.twitch_login.toLowerCase());
			if (!requestIsOK(r.status)) return console.log(r);
			else twitch.broadcasterData = r.response[0];

			if (args.search.twitch_badges) {
				let r = await twitch.loadBadges(args.search.twitch_access_token, twitch.broadcasterData.id);
				if (requestIsOK(r.status)) makeMessage(...makeMessageArgumentsInfo(...replaceTagsInTranslation(translation.frame.parameter.loaded.twitch_badges, r.response.count)));
				else makeMessage(...makeMessageArgumentsInfo(...replaceTagsInTranslation(translation.frame.parameter.error.twitch_badges, r.message)));
			}

			if (args.search['7tv_emotes']) {
				let r = await seventv.loadEmotes(twitch.broadcasterData.id);
				if (requestIsOK(r.status)) makeMessage(...makeMessageArgumentsInfo(...replaceTagsInTranslation(translation.frame.parameter.loaded['7tv_emotes'], r.response.count)));
				else makeMessage(...makeMessageArgumentsInfo(...replaceTagsInTranslation(translation.frame.parameter.error['7tv_emotes'], r.message)));
			}
		}
	}

	twitch.isSameChannel = args.search.twitch_login === twitch.accessTokenData.login;

	if (twitch.isAnonymous)
		twitch.irc.connectWebSocket();
	else
		twitch.eventsub.connectWebSocket();
}
document.addEventListener('DOMContentLoaded', (_, e) => main());