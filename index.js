// @author theleername
// you can use things from this code everywhere, but make a credit pls :)

args = {};
channelID = null;

chatMessagesDiv = document.getElementsByClassName("messages")[0];

badges = {};
emotes_7tv = {};
emotes_twitch = {};

userColors = new Map();
channelAvatars = new Map();

remove_msg = true;
size = 16;
indent = 4;
decay = 0; // in ms
decay_duration = 500; // in ms
langFile = {};

messageColor = "#c4c4c4";
infoColor = "#9448ff";
errorColor = "#ff0000";

versionDisplay = "LeerStreamChat v1.5.5";

function langFile_RU() {
	return JSON.parse(`{
		"twitchLoginNotFound": "Параметр twitch_login не определён!",
		"deprecatedParameter": "устарел, используйте",
		"noEmotes": "Смайлики и значки не будут отображены, так как параметры twitch_client_id и twitch_token не были указаны",
		"getChannelIDFetchFailed": "Не могу получить ID канала",
		"getChannelIDNotExists": "Канал не существует",
		"twitchEmotesLoaded": "Twitch смайлики успешно загружены",
		"twitchBadgesLoaded": "Twitch значки успешно загружены",
		"7tvFetchFailed": "Не могу получить ответ от 7TV, попробуйте включить обход блокировки!",
		"7tvLoaded": "7TV смайлики успешно загружены",
		"connect": "Чат подключён к каналу",
		"reconnect": "Переподключение...",
		"messageDeleted": "<cообщение удалено>",
		"channelAvatarLoaded": "Аватар канала загружен"
	}`);
}

// https://stackoverflow.com/a/44134328
function hslToHex(h, s, l) {
	l /= 100;
	const a = s * Math.min(l, 1 - l) / 100;
	const f = n => {
		const k = (n + h / 30) % 12;
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
	};
	return `#${f(0)}${f(8)}${f(4)}`;
}

function findEmote(nameToFind) {
	for (let [name, urls] of Object.entries(emotes_twitch))
		if (nameToFind == name) return urls;
	for (let [name, urls] of Object.entries(emotes_7tv))
		if (nameToFind == name) return urls;
	return null;
}

async function getChannelAvatar(channelID) {
	if (channelID == null) return null;
	if (args.twitch_client_id != null && args.twitch_token != null) return null;

	var channelAvatar = channelAvatars.get(channelID);
	if (channelAvatar != null) return channelAvatar;

	const response = await fetchThing(`https://api.twitch.tv/helix/users?id=${channelID}`, {headers: {
		'Client-Id': args.twitch_client_id,
		'Authorization': 'Bearer ' + args.twitch_token
	}});
	if (response?.data == null) return null;

	console.log('%c' + (langFile['channelAvatarLoaded'] || `Channel avatar loaded`) + ` (${channelID})`, 'color:' + infoColor);
	channelAvatars.set(channelID, response.data[0].profile_image_url);a
	return response.data[0].profile_image_url;
}

function createMessageChunkImage(src, cssClass, appendTo) {
	const chunk = document.createElement('img');
	chunk.src = src;
	chunk.className = cssClass ?? "img-badge";
	chunk.loading = "lazy";
	chunk.decoding = "async";
	if (appendTo != null) appendTo.appendChild(chunk);
}

function createMessageChunkText(text, cssClass, appendTo) {
	const chunk = document.createElement('p');
	chunk.className = cssClass ?? "message-chunk-text";
	chunk.innerText = text;
	if (appendTo != null) appendTo.appendChild(chunk);
	return chunk;
}

function removeChatMessage(id) {
	for (let msg of chatMessagesDiv.children) if (msg != null && msg.getAttribute('message-id') == id) {
		// removing message before separator
		for (let i = msg.childNodes.length - 1; i >= 0; i--) {
			const node = msg.childNodes[i];
			if (node.getAttribute('isseparator') != null) break;
			msg.removeChild(node);
		}

		// replacing message with <message deleted>
		const hMessage = createMessageChunkText(langFile['messageDeleted'] || "<message deleted>", null, msg);

		const sourceRoomID = msg.getAttribute('source-room-id');
		console.log(`%c(${id})${sourceRoomID != null ? ` (${sourceRoomID})` : ''} ${msg.getAttribute('user')}: ${hMessage.innerText}`, 'color:' + messageColor);
		break;
	}
}

async function makeChatMessage(user, message, extra) {
	extra ??= {};

	if (!extra.isInfo) {
		extra.userColor ??= userColors.get(user);
		if (extra.userColor == null) {
			extra.userColor = hslToHex(Math.floor(Math.random() * 360), 75, 75);
			userColors.set(user, extra.userColor);
			console.log(`%cColor ${extra.userColor} assigned for user ${user}`, 'color:' + extra.userColor);
		}
	}

	var logMessage = user;
	if (extra.id != null) logMessage = `(${extra.id}) ` + logMessage;
	if (message != null) logMessage += ': ' + message;

	const div = document.createElement('div');
	if (extra.id != null) div.setAttribute('message-id', extra.id);
	if (message != null) div.setAttribute('user', user);

	div.className = "message";
	// starting decaying of message (if allowed)
	if (decay > 0)
		setTimeout(() => { div.className += " decaying" }, 1);

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

	// adding user badges as img elements
	// (works only if twitch_client_id and twitch_token specified in url parameters)
	if (extra.userBadges != null) for (let [k, v] of Object.entries(extra.userBadges)) {
		const badge = badges[k]?.[v];
		if (badge != null)
			createMessageChunkImage(badge.image_url_4x, null, div);
	}

	// adding colored nickname of chatter
	if (user != null) {
		const chunk = createMessageChunkText(user, "message-chunk-nickname", div);
		chunk.style.color = extra.userColor;
	}

	var prevEmote = false;
	if (message != null) {
		const pMessage = createMessageChunkText(": ", null, div);
		pMessage.setAttribute('isseparator', '');

		// splitting message by space to find any emoji word
		var loginLC = args.twitch_login.toLowerCase();
		for (let chunk of message.split(' ')) {
			if (chunk.length == 0) continue;

			// messages which from highlight message reward / pings channel is highlighted
			if (extra.userState?.['msg-id'] == 'highlighted-message' || chunk.toLowerCase() == '@' + loginLC) div.style.background = "rgba(255, 64, 0, 0.25)";

			const emoteURLs = findEmote(chunk);
			if (emoteURLs == null) {
				// chunk of message which pings someone or is link has another color
				let pMessageChunk = createMessageChunkText(`${chunk} `, null, div);
				if (chunk.startsWith("@") || chunk.startsWith('https://') || chunk.startsWith('http://')) pMessageChunk.style.color = "#ff00ff";
				prevEmote = false;
			} else {
				// if chunk of message contains word of emoji
				// we removing this chunk and adding img of emoji instead
				let pMessageChunk = createMessageChunkImage(emoteURLs["4x"], "img-emoji", div);
				if (prevEmote && emoteURLs.isZeroWidth) pMessageChunk.style.marginLeft = -size * 1.75 - size / 8;
				prevEmote = true;
			}
		}
	}

	// adding message to messages div
	chatMessagesDiv.appendChild(div);

	// removing out of bounds message
	if (chatMessagesDiv.getBoundingClientRect().height > window.innerHeight)
		chatMessagesDiv.removeChild(chatMessagesDiv.children[0]);

	if (logMessage != null)
		console.log('%c' + logMessage, 'color:' + (extra.isInfo ? extra.userColor : messageColor));
	return div;
}

async function makeInfoMessage(msg, color) {
	await makeChatMessage(msg, null, {userColor: color ?? infoColor, isInfo: true});
}

async function fetchThing(url, options) {
	try {
		return await (await fetch(url, options)).json();
	} catch(e) {
		return {error: e.message};
	}
}

function setupParameters() {
	for (arg of window.location.search.substring(1).split('&')) {
		if (!arg.includes('=')) continue;
		arg = arg.split('=');
		args[arg[0]] = arg[1];
	}
	if (args.size != null) size = parseFloat(args.size);
	if (args.decay != null) decay = parseFloat(args.decay) * 1000;
	if (args.decay_duration != null) decay_duration = parseFloat(args.decay_duration) * 1000;
	if (args.indent != null) indent = parseFloat(args.indent);
	if (args.remove_msg != null) remove_msg = args.remove_msg == '1' || args.remove_msg == 'true';
	switch((args.lang || "en").toLowerCase()) {
		case 'ru':
			langFile = langFile_RU();
	}

	const style = chatMessagesDiv.style;
	style.setProperty('--message_color', messageColor);
	style.setProperty('--info_color', infoColor);
	style.setProperty('--error_color', errorColor);
	style.setProperty('--args_size', `${size}px`);
	style.setProperty('--args_decay', `${decay}ms`);
	style.setProperty('--args_decay_duration', `${decay_duration}ms`);
	style.setProperty('--args_margin_top', indent * 0.5);
	style.setProperty('--args_padding', indent * 0.5);
}

function requiredParameters() {
	if (args.twitch_login == null)
		return makeInfoMessage(langFile['twitchLoginNotFound'] || 'twitch_login is not specified!', errorColor);
}

async function getTwitchChannelID() {
	channelID = null;
	const response = (await fetchThing(`https://api.twitch.tv/helix/users?login=${args.twitch_login}`, {headers: {
		'Client-Id': args.twitch_client_id,
		'Authorization': 'Bearer ' + args.twitch_token
	}})).data;
	if (response == null)
		return makeInfoMessage(langFile['getChannelIDFetchFailed'] || "Can't get channelID!", errorColor);
	if (response.length == 0)
		return makeInfoMessage(langFile['getChannelIDNotExists'] || "Channel is not exists!", errorColor);
	channelID = response[0].id;
	return true;
}

// getting twitch global and channel emotes
async function getTwitchEmotes() {
	if (channelID == null) return;

	var loaded_twitchEmotes = false;
	for (let link of ['https://api.twitch.tv/helix/chat/emotes/global', 'https://api.twitch.tv/helix/chat/emotes?broadcaster_id=' + channelID]) {
		const response = await fetchThing(link, {headers: {
			'Client-Id': args.twitch_client_id,
			'Authorization': 'Bearer ' + args.twitch_token
		}});
		if (response.data != null) for (let entry of response.data) {
			emotes_twitch[entry.name] = {
				"1x": entry.images.url_1x,
				"2x": entry.images.url_2x,
				"3x": entry.images.url_2x,
				"4x": entry.images.url_4x
			};
			loaded_twitchEmotes = true;
		}
	}
	if (loaded_twitchEmotes) makeInfoMessage((langFile['twitchEmotesLoaded'] || 'Twitch emotes loaded') + ` (${Object.keys(emotes_twitch).length})`, infoColor);
}

// getting twitch global and channel badges
async function getTwitchBadges() {
	if (channelID == null) return;

	var loaded_twitchBadges = false;
	for (let link of ['https://api.twitch.tv/helix/chat/badges/global', 'https://api.twitch.tv/helix/chat/badges?broadcaster_id=' + channelID]) {
		const response = await fetchThing(link, {headers: {
			'Client-Id': args.twitch_client_id,
			'Authorization': 'Bearer ' + args.twitch_token
		}});
		if (response.data != null) for (let entry of response.data) {
			badges[entry.set_id] = {};
			for (let verEntry of entry.versions)
				badges[entry.set_id][verEntry.id] = verEntry;
			loaded_twitchBadges = true;
		}
	}
	if (loaded_twitchBadges) makeInfoMessage((langFile['twitchBadgesLoaded'] || 'Twitch badges loaded') + ` (${Object.keys(badges).length})`, infoColor);
}

// getting 7tv global and channel emotes
async function get7TVEmotes() {
	if (channelID == null) return;

	var loaded_7tv = false;
	const response_7tvglobal = await fetchThing(`https://7tv.io/v3/emote-sets/01GG8F04Y000089195YKEP5CA3`); // global emote set
	if (response_7tvglobal.emotes != null) for (let entry of response_7tvglobal.emotes) {
		emotes_7tv[entry.name] = {
			"1x": `https:${entry.data.host.url}/1x.webp`,
			"2x": `https:${entry.data.host.url}/2x.webp`,
			"3x": `https:${entry.data.host.url}/3x.webp`,
			"4x": `https:${entry.data.host.url}/4x.webp`,
			"isZeroWidth": entry.flags == 1,
		};
		loaded_7tv = true;
	}

	if (loaded_7tv) {
		const response_7tv = await fetchThing(`https://7tv.io/v3/users/twitch/${channelID}`);
		if (response_7tv.emote_set?.emotes != null) for (let entry of response_7tv.emote_set.emotes) {
			emotes_7tv[entry.name] = {
				"1x": `https:${entry.data.host.url}/1x.webp`,
				"2x": `https:${entry.data.host.url}/2x.webp`,
				"3x": `https:${entry.data.host.url}/3x.webp`,
				"4x": `https:${entry.data.host.url}/4x.webp`,
				"isZeroWidth": entry.flags == 1,
			};
		}

		return makeInfoMessage((langFile['7tvLoaded'] || '7TV emotes loaded') + ` (${Object.keys(emotes_7tv).length})`, infoColor);
	}

	makeInfoMessage(langFile['7tvFetchFailed'] || '7tv fetch error', 'red');
}

async function main() {
	setupParameters();
	makeInfoMessage(versionDisplay, infoColor);
	requiredParameters();

	// initializing comfyjs callbacks
	ComfyJS.onChat = (user, message, flags, self, extra) => {
		makeChatMessage(user, message, extra);
		console.log(user, message, flags, self, extra);	
	};
	if (remove_msg) ComfyJS.onMessageDeleted = (id, extra) => {
		removeChatMessage(id);
	};
	ComfyJS.onConnected = (address, port, isFirstConnect) => {
		makeInfoMessage((langFile['connect'] || 'Chat connected to сhannel') + " " + args.twitch_login, infoColor);
	};
	ComfyJS.onReconnect = (reconnectCount) => {
		makeInfoMessage(langFile['reconnect'] || 'Attempting to reconnect...', infoColor);
	};

	// initializing emotes/badges
	if (args.twitch_client_id != null && args.twitch_token != null) {
		if (!(await getTwitchChannelID())) return;
		await getTwitchEmotes();
		await getTwitchBadges();
		await get7TVEmotes();
	} else
		makeInfoMessage(langFile['noEmotes'] || 'Emotes and badges will be not displayed, you need to specify twitch_client_id and twitch_token', '#BFBF00');

	ComfyJS.Init(args.twitch_client_id, null, [args.twitch_login]);
}
main();