// @author theleername
// you can use things from this code everywhere, but make a credit pls :)

args = {};
channelID = "unknown";

chatMessagesDiv = [];

badges = {};
emotes_7tv = {};
emotes_twitch = {};

userColors = new Map();

prevChannelID = null;
useChannelAvatars = false;
channelAvatars = new Map();

size = 16;
indent = 4;
decay = 0;
decay_duration = 0.5;
langFile = {};

versionDisplay = "LeerStreamChat v1.5.2";

function langFile_RU() {
	return JSON.parse(`{
		"twitchLoginNotFound": "Параметр twitch_login не определён!",
		"deprecatedParameter": "устарел, используйте",
		"noEmotes": "Смайлики и значки не будут отображены, так как параметры twitch_client_id и twitch_token не были указаны",
		"channelIDFetchFailed": "Не могу получить ID канала! Посмотрите в консоль браузера",
		"twitchEmotesLoaded": "Twitch смайлики успешно загружены",
		"twitchBadgesLoaded": "Twitch значки успешно загружены",
		"7tvFetchFailed": "Не могу получить ответ от 7TV! ",
		"7tvLoaded": "7TV смайлики успешно загружены",
		"connect": "Чат подключён к каналу ",
		"reconnect": "Переподключение...",
		"messageDeleted": "<cообщение удалено>",
		"channelAvatarLoaded": "Аватар канала загружен",
		"unknown": "неизвестно"
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
	if (args.twitch_client_id != null && args.twitch_token != null) return null;

	var channelAvatar = channelAvatars.get(channelID);
	if (channelAvatar != null) return channelAvatar;

	const response = await fetchThing(`https://api.twitch.tv/helix/users?id=${channelID}`, {headers: {
		'Client-Id': args.twitch_client_id,
		'Authorization': 'Bearer ' + args.twitch_token
	}});
	if (response?.data == null) return null;

	console.log('%c' + (langFile['channelAvatarLoaded'] || `Channel avatar loaded`) + ` (${channelID})`, 'color: #0080ff');
	channelAvatars.set(channelID, response.data[0].profile_image_url);a
	return response.data[0].profile_image_url;
}

function removeChatMessage(id) {
	for (let i = 0; i < chatMessagesDiv.length; i++) {
		const div = chatMessagesDiv[i];
		if (div != null) {
			const msgID = div.getAttribute('message-id');
			if (msgID != null && msgID == id) {
				// removing message before separator
				for (let i = div.childNodes.length - 1; i >= 0; i--) {
					const node = div.childNodes[i];
					if (node.getAttribute('separator') != null) break;
					div.removeChild(node);
				}

				// replacing message with <message deleted>
				const hMessage = document.createElement('p');
				hMessage.style.color = "white";
				hMessage.style.fontSize = size;
				hMessage.innerText = langFile['messageDeleted'] || "<message deleted>";
				div.appendChild(hMessage);

				const sourceRoomID = div.getAttribute('source-room-id');
				console.log(`(${msgID})${sourceRoomID != null ? ` (${sourceRoomID})` : ''} ${div.getAttribute('user')}: ${hMessage.innerText}`);
				return;
			}
		}
	}
}

async function makeChatMessage(user, message, extra, bold) {
	if (extra == null) extra = {};

	if (extra.logColor == null) extra.logColor = '#c4c4c4';
	if (extra.userColor == null) extra.userColor = userColors.get(user);
	if (extra.userColor == null) {
		extra.userColor = hslToHex(Math.floor(Math.random() * 360), 75, 75);
		userColors.set(user, extra.userColor);
		console.log(`%cColor ${extra.userColor} assigned for user ${user}`, 'color: ' + extra.userColor);
	}

	var logMessage = user;
	if (extra.id != null) logMessage = `(${extra.id}) ` + logMessage;
	if (message != null) logMessage += ': ' + message;

	const div = document.createElement('div');
	if (extra.id != null) div.setAttribute('message-id', extra.id);
	if (message != null) div.setAttribute('user', user);
	div.style.marginTop = indent;
	document.body.appendChild(div);

	// adding avatar of channel as img element from where message was posted
	// (works only if twitch_client_id and twitch_token specified in url parameters)
	// source-room-id is null = shared chat is not enabled
	if (extra['source-room-id'] != null) {
		div.setAttribute('source-room-id', extra['source-room-id']);
		logMessage = `(${extra['source-room-id']}) ` + logMessage;
		var channelAvatar = await getChannelAvatar(extra['source-room-id']);
		if (channelAvatar != null) {
			const img = document.createElement('img');
			img.src = channelAvatar;
			div.appendChild(img);
		}
	}

	// adding user badges as img elements
	// (works only if twitch_client_id and twitch_token specified in url parameters)
	if (extra.userBadges != null) for (let [k, v] of Object.entries(extra.userBadges)) {
		const badge = badges[k]?.[v];
		if (badge != null) {
			const img = document.createElement('img');
			img.srcset = `${badge.image_url_1x} 1x, ${badge.image_url_2x} 2x, ${badge.image_url_4x} 4x`;
			img.style.width = size * 1.25;
			img.style.marginRight = size / 8;
			img.loading = "lazy";
			img.decoding = "async";
			div.appendChild(img);
		}
	}

	if (user != null) {
		const hUser = document.createElement('p');
		hUser.style.color = extra.userColor;
		hUser.style.fontSize = size;
		hUser.innerText = user;
		div.appendChild(hUser);
	}

	var prevEmote = false;
	if (message != null) {
		const hMessage = document.createElement('p');
		hMessage.style.color = "white";
		hMessage.style.fontSize = size;
		hMessage.innerText = ": ";
		hMessage.setAttribute('separator', '');
		div.appendChild(hMessage);

		// splitting message by space to find any emoji word
		var loginLC = args.twitch_login.toLowerCase();
		for (let chunk of message.split(' ')) {
			if (chunk.length == 0) continue;

			// messages which from highlight message reward / pings channel is highlighted
			if (extra.userState?.['msg-id'] == 'highlighted-message' || chunk.toLowerCase() == '@' + loginLC) div.style.background = "rgba(255, 64, 0, 0.25)";

			const emoteURLs = findEmote(chunk);
			if (emoteURLs == null) {
				const hMessage = document.createElement('p');
				// chunk of message which pings someone or is link has another color
				hMessage.style.color = (chunk.startsWith("@") || chunk.startsWith('https://') || chunk.startsWith('http://')) ? "#ff00ff" : "white";
				hMessage.style.fontSize = size;
				if (bold) hMessage.style.fontWeight = 700;
				hMessage.innerText = chunk + " ";
				div.appendChild(hMessage);
				prevEmote = false;
			} else {
				// if chunk of message contains word of emoji
				// we removing this chunk and adding img of emoji instead
				const img = document.createElement('img');
				img.srcset = `${emoteURLs["1x"]} 1x, ${emoteURLs["2x"]} 2x, ${emoteURLs["3x"]} 3x, ${emoteURLs["4x"]} 4x`;
				if (prevEmote && emoteURLs.isZeroWidth) img.style.marginLeft = - size * 1.75 - size / 8;
				img.style.width = size * 1.75;
				img.style.marginRight = size / 8;
				img.loading = "lazy";
				img.decoding = "async";
				div.appendChild(img);
				prevEmote = true;
			}
		}
	}

	if (decay > 0) {
		setTimeout(() => {
			const willBeRemoved = decay_duration * 1000;
			var elapsed = 0;
			setInterval(() => {
				div.style.opacity = 1 - (elapsed / willBeRemoved);
				if (elapsed < willBeRemoved)
					elapsed += 50;
				else {
					if (document.body.children.includes(div))
						document.body.removeChild(div);
					const index = chatMessagesDiv.indexOf(div);
					if (index > -1) chatMessagesDiv.splice(index, 1);
				}
			}, 50);
		}, decay * 1000);
	}

	// removing out of bounds message
	chatMessagesDiv.push(div);
	if (document.body.getBoundingClientRect().height > window.innerHeight) {
		document.body.removeChild(chatMessagesDiv[0]);
		chatMessagesDiv.shift();
	}

	if (logMessage != null) {
		if (extra.logColor != null)
			console.log('%c' + logMessage, 'color: ' + extra.logColor);
		else
			console.log(logMessage);
	}
}

function makeInfoMessage(msg, color) {
	var prevSize = size;
	size *= 1.25;
	makeChatMessage(msg, null, {'userColor': color ?? '#9448ff', 'logColor': color ?? '#0080ff'}, true);
	size = prevSize;
}

async function fetchThing(url, options) {
	try {
		return await (await fetch(url, options)).json();
	} catch(e) {
		console.log('%c' + e, 'color: red');
		return null;
	}
}

function deprecatedParameters() {
	if (args.login != null) {
		args.twitch_login = args.login;
		makeInfoMessage(`login ${langFile['deprecatedParameter'] || 'deprecated, use'} twitch_login`, '#BFBF00');
	}
	if (args.client_id != null) {
		args.twitch_client_id = args.client_id;
		makeInfoMessage(`client_id ${langFile['deprecatedParameter'] || 'deprecated, use'} twitch_client_id`, '#BFBF00');
	}
	if (args.token != null) {
		args.twitch_token = args.token;
		makeInfoMessage(`token ${langFile['deprecatedParameter'] || 'deprecated, use'} twitch_token`, '#BFBF00');
	}
}

function setupParameters() {
	for (arg of window.location.search.substring(1).split('&')) {
		if (!arg.includes('=')) continue;
		arg = arg.split('=');
		args[arg[0]] = arg[1];
	}
	if (args.size != null) size = parseFloat(args.size);
	if (args.decay != null) decay = parseFloat(args.decay);
	if (args.decay_duration != null) decay_duration = parseFloat(args.decay_duration);
	if (args.indent != null) indent = parseFloat(args.indent);
	switch((args.lang || "en").toLowerCase()) {
		case 'ru':
			langFile = langFile_RU();
	}

	makeInfoMessage(versionDisplay, '#9448ff');

	deprecatedParameters();

	if (args.twitch_login == null)
		return makeInfoMessage(langFile['twitchLoginNotFound'] || 'twitch_login is not specified!', '#FF0000');
}

async function getTwitchChannelID() {
	channelID = (await fetchThing(`https://api.twitch.tv/helix/users?login=${args.twitch_login}`, {headers: {
		'Client-Id': args.twitch_client_id,
		'Authorization': 'Bearer ' + args.twitch_token
	}}))?.data[0]?.id ?? "unknown";
	if (channelID == "unknown")
		return makeInfoMessage(langFile['channelIDFetchFailed'] || "Can't get channelID! See console", '#FF0000');
}

// getting twitch global and channel emotes
async function getTwitchEmotes() {
	var loaded_twitchEmotes = false;
	for (let link of ['https://api.twitch.tv/helix/chat/emotes/global', 'https://api.twitch.tv/helix/chat/emotes?broadcaster_id=' + channelID]) {
		const response = await fetchThing(link, {headers: {
			'Client-Id': args.twitch_client_id,
			'Authorization': 'Bearer ' + args.twitch_token
		}});
		for (let entry of response.data) {
			emotes_twitch[entry.name] = {
				"1x": entry.images.url_1x,
				"2x": entry.images.url_2x,
				"3x": entry.images.url_2x,
				"4x": entry.images.url_4x
			};
			loaded_twitchEmotes = true;
		}
	}
	if (loaded_twitchEmotes) makeInfoMessage((langFile['twitchEmotesLoaded'] || 'Twitch emotes loaded') + ` (${Object.keys(emotes_twitch).length})`, '#9448ff');
}

// getting twitch global and channel badges
async function getTwitchBadges() {
	var loaded_twitchBadges = false;
	for (let link of ['https://api.twitch.tv/helix/chat/badges/global', 'https://api.twitch.tv/helix/chat/badges?broadcaster_id=' + channelID]) {
		const response = await fetchThing(link, {headers: {
			'Client-Id': args.twitch_client_id,
			'Authorization': 'Bearer ' + args.twitch_token
		}});
		for (let entry of response.data) {
			badges[entry.set_id] = {};
			for (let verEntry of entry.versions)
				badges[entry.set_id][verEntry.id] = verEntry;
			loaded_twitchBadges = true;
		}
	}
	if (loaded_twitchBadges) makeInfoMessage((langFile['twitchBadgesLoaded'] || 'Twitch badges loaded') + ` (${Object.keys(badges).length})`, '#9448ff');
}

// getting 7tv global and channel emotes
async function get7TVEmotes() {
	var loaded_7tv = false;
	const response_7tvglobal = await fetchThing(`https://7tv.io/v3/emote-sets/01GG8F04Y000089195YKEP5CA3`); // global emote set
	if (response_7tvglobal.error == null) {
		for (let entry of response_7tvglobal.emotes) {
			emotes_7tv[entry.name] = {
				"1x": `https:${entry.data.host.url}/1x.webp`,
				"2x": `https:${entry.data.host.url}/2x.webp`,
				"3x": `https:${entry.data.host.url}/3x.webp`,
				"4x": `https:${entry.data.host.url}/4x.webp`,
				"isZeroWidth": entry.flags == 1,
			};
			loaded_7tv = true;
		}
	} else {
		console.log('%c' + (langFile['7tvFetchFailed'] || '7tv fetch error: ') + response_7tvglobal.error, 'color: red');
	}

	const response_7tv = await fetchThing(`https://7tv.io/v3/users/twitch/${channelID}`);
	if (response_7tv.error == null) {
		for (let entry of response_7tv.emote_set.emotes) {
			emotes_7tv[entry.name] = {
				"1x": `https:${entry.data.host.url}/1x.webp`,
				"2x": `https:${entry.data.host.url}/2x.webp`,
				"3x": `https:${entry.data.host.url}/3x.webp`,
				"4x": `https:${entry.data.host.url}/4x.webp`,
				"isZeroWidth": entry.flags == 1,
			};
			loaded_7tv = true;
		}
	} else {
		console.log('%c' + (langFile['7tvFetchFailed'] || '7tv fetch error: ') + response_7tv.error, 'color: red');
	}
	if (loaded_7tv) makeInfoMessage((langFile['7tvLoaded'] || '7TV emotes loaded') + ` (${Object.keys(emotes_7tv).length})`, '#9448ff');
}

async function main() {
	setupParameters();

	// and use all of this in posting messages to website
	ComfyJS.onChat = (user, message, flags, self, extra) => {
		makeChatMessage(user, message, extra);
	};
	ComfyJS.onMessageDeleted = (id, extra) => {
		removeChatMessage(id);
	};
	ComfyJS.onConnected = (address, port, isFirstConnect) => {
		makeInfoMessage((langFile['connect'] || 'Chat connected to сhannel ') + args.twitch_login + ' (' + (channelID == "unknown" ? langFile['unknown'] : channelID) + ')', '#9448ff');
	};
	ComfyJS.onReconnect = (reconnectCount) => {
		makeInfoMessage(langFile['reconnect'] || 'Attempting to reconnect...', '#9448ff');
	};

	if (args.twitch_client_id != null && args.twitch_token != null) {
		await getTwitchChannelID();
		await getTwitchEmotes();
		await getTwitchBadges();
		await get7TVEmotes();
	} else
		makeInfoMessage(langFile['noEmotes'] || 'Emotes and badges will be not displayed, you need to specify twitch_client_id and twitch_token', '#ff0000');

	ComfyJS.Init(null, null, args.twitch_login);
}
main();