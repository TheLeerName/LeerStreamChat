args = {};
channelID = null;
chatMessagesDiv = [];
badges = {};
emotes_7tv = {};
emotes_twitch = {};

size = 16;

function isOffscreen(el) {
	return el.getBoundingClientRect().y > window.innerHeight;
};

function findEmote(nameToFind) {
	for (let [name, urls] of Object.entries(emotes_twitch))
		if (nameToFind == name) return urls;
	for (let [name, urls] of Object.entries(emotes_7tv))
		if (nameToFind == name) return urls;
	return null;
}

function makeChatMessage(user, message, color, userBadges, bold) {
	if (color == null) color = "#FFFFFF";
	if (userBadges == null) userBadges = {};

	const div = document.createElement('div');
	document.body.appendChild(div);

	for (let [k, v] of Object.entries(userBadges)) {
		const badge = badges[k]?.[v];
		if (badge != null) {
			const img = document.createElement('img');
			img.srcset = `${badge.image_url_1x} 1x, ${badge.image_url_2x} 2x, ${badge.image_url_4x} 4x`;
			img.style.width = "1em";
			img.style.height = "1em";
			img.style.verticalAlign = "middle";
			div.appendChild(img);
		}
	}

	if (user != null) {
		const hUser = document.createElement('p');
		hUser.style.color = color;
		hUser.style.fontSize = size;
		hUser.innerText = user;
		div.appendChild(hUser);
	}

	if (message != null) {
		const hMessage = document.createElement('p');
		hMessage.style.color = "white";
		hMessage.style.fontSize = size;
		if (bold) hMessage.style.fontWeight = 700;
		hMessage.innerText = ": ";
		div.appendChild(hMessage);

		for (let chunk of message.split(' ')) {
			const emoteURLs = findEmote(chunk);
			if (emoteURLs == null) {
				const hMessage = document.createElement('p');
				hMessage.style.color = "white";
				hMessage.style.fontSize = size;
				if (bold) hMessage.style.fontWeight = 700;
				hMessage.innerText = chunk + " ";
				div.appendChild(hMessage);
			} else {
				const img = document.createElement('img');
				img.srcset = `${emoteURLs["1x"]} 1x, ${emoteURLs["2x"]} 2x, ${emoteURLs["3x"]} 3x, ${emoteURLs["4x"]} 4x`;
				img.style.width = "1em";
				img.style.height = "1em";
				img.style.verticalAlign = "middle";
				div.appendChild(img);
			}
		}
	}

	/*var divY = div.getBoundingClientRect().y;
	if (divY > divY * (Math.floor(window.innerHeight / divY) - 1)) {
		document.body.removeChild(chatMessagesDiv[0]);
		chatMessagesDiv.shift();
	}*/

	chatMessagesDiv.push(div);
}

function makeInfoMessage(msg, color) {
	var prevSize = size;
	size *= 1.25;
	makeChatMessage(msg, null, '#9448ff', null, true);
	size = prevSize;
	console.log(msg);
}

async function fetchThing(url, options) {
	try {
		return await (await fetch(url, options)).json();
	} catch(e) {
		console.log(e);
		return null;
	}
}

async function main() {
	for (arg of window.location.search.substring(1).split('&')) {
		if (!arg.includes('=')) continue;
		arg = arg.split('=');
		args[arg[0]] = arg[1];
	}
	size = parseInt(args.size);

	if (args.login == null)
		return makeInfoMessage('login is not specified!', '#FF0000');
	if (args.clientID == null)
		return makeInfoMessage('clientID is not specified!', '#FF0000');
	if (args.token == null)
		return makeInfoMessage('token is not specified!', '#FF0000');

	channelID = (await fetchThing(`https://api.twitch.tv/helix/users?login=${args.login}`, {headers: {
		'Client-Id': args.clientID,
		'Authorization': 'Bearer ' + args.token
	}}))?.data[0]?.id;
	if (channelID == null)
		return makeInfoMessage("Can't get channelID! See console", '#FF0000');

	const response_7tv = await fetchThing(`https://7tv.io/v3/users/twitch/${channelID}`);
	if (response_7tv.error == null) {
		for (let entry of response_7tv.emote_set.emotes)
			emotes_7tv[entry.name] = {
				"1x": `https:${entry.data.host.url}/1x.webp`,
				"2x": `https:${entry.data.host.url}/2x.webp`,
				"3x": `https:${entry.data.host.url}/3x.webp`,
				"4x": `https:${entry.data.host.url}/4x.webp`
			};
	} else {
		console.log('7tv fetch error: ' + response_7tv.error);
	}

	for (let link of ['https://api.twitch.tv/helix/chat/emotes/global', 'https://api.twitch.tv/helix/chat/emotes?broadcaster_id=' + channelID]) {
		const response = await fetchThing(link, {headers: {
			'Client-Id': args.clientID,
			'Authorization': 'Bearer ' + args.token
		}});
		for (let entry of response.data) {
			emotes_twitch[entry.name] = {
				"1x": entry.images.url_1x,
				"2x": entry.images.url_2x,
				"3x": entry.images.url_2x,
				"4x": entry.images.url_4x
			};
		}
	}

	for (let link of ['https://api.twitch.tv/helix/chat/badges/global', 'https://api.twitch.tv/helix/chat/badges?broadcaster_id=' + channelID]) {
		const response = await fetchThing(link, {headers: {
			'Client-Id': args.clientID,
			'Authorization': 'Bearer ' + args.token
		}});
		for (let entry of response.data) {
			badges[entry.set_id] = {};
			for (let verEntry of entry.versions)
				badges[entry.set_id][verEntry.id] = verEntry;
		}
	}

	ComfyJS.onChat = (user, message, flags, self, extra) => {
		makeChatMessage(user, message, extra.userColor, extra.userBadges);
	};
	ComfyJS.onConnected = (address, port, isFirstConnect) => {
		makeInfoMessage('Chat connected to ' + args.login + ' (' + channelID + ')', '#9448ff');
	};
	ComfyJS.onReconnect = (reconnectCount) => {
		makeInfoMessage('Attempting to reconnect...', '#9448ff');
	};
	ComfyJS.Init(null, null, args.login);
}
main();