// chat will use irc to connect as anonymous user
// (if twitch_access_token is not specified)

twitch.irc.connectWebSocket = () => {
	twitch.irc.ws?.close();
	twitch.irc.ws = new WebSocket('wss://irc-ws.chat.twitch.tv');
	twitch.irc.ws.addEventListener('open', twitch.irc.onOpen);
	twitch.irc.ws.addEventListener('message', twitch.irc.onMessage);
	twitch.irc.ws.addEventListener('error', twitch.irc.onError);
	twitch.irc.ws.addEventListener('close', twitch.irc.onClose);
};

twitch.irc.onOpen = async(e) => {
	//console.log(e);
	twitch.irc.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
	twitch.irc.ws.send('PASS kappa');
	twitch.irc.ws.send('NICK justinfan42');
	twitch.irc.ws.send(`JOIN #${args.search.twitch_login}`);
};

twitch.irc.onMessage = async(data) => {
	//console.log(data);

	for (let chunk of data.data.split('\r\n')) twitch.irc.onMessageChunk(chunk);
};

twitch.irc.onError = async(e) => {
	console.error(e);
};

twitch.irc.onClose = async(e) => {
	//console.log(e);
	setTimeout(twitch.irc.connectWebSocket, 500);
};

twitch.irc.onMessageChunk = async(data) => {
	try {
		if (data.length === 0) return;

		if (data === "PING :tmi.twitch.tv")
			return twitch.irc.ws.send("PONG :tmi.twitch.tv");

		const event = twitch.irc.parseMessageData(data);

		const type = event.type;

		if (type === "JOIN") twitch.irc.onJoin(event);
		else if (type === "PRIVMSG") twitch.irc.makeChatMessage(event);
		else if (type === "USERNOTICE") twitch.irc.onUserNotice(event);
		else if (type === "CLEARCHAT") twitch.irc.onClearChat(event);
		else if (type === "CLEARMSG") twitch.irc.onClearMsg(event);
		else if (type === "RECONNECT") twitch.itc.onReconnect(event);
		else if (type === "ROOMSTATE") twitch.irc.onRoomState(event);
		else if (type === "USERSTATE" || type === "NOTICE") {} // ignore
		else if (type === "CAP * ACK" || type === "CAP * NAK") {} // ignore
		else if (type === "001" || type === "002" || type === "003" || type === "004" || type === "353" || type === "366" || type === "372" || type === "375" || type === "376") {} // ignore
		else if (args.search.debug)
			console.warn(`unsupported message type: ${type}`, event);
	} catch(e) {
		console.error(e, chunk);
	}
};

twitch.irc.onJoin = async(event) => {
	makeMessage(...makeMessageArgumentsInfo(...replaceTagsInTranslation(translation.frame.irc.connected, args.search.twitch_login)));
};

twitch.irc.onReconnect = async(event) => {
	makeMessage(...makeMessageArgumentsInfo(...translation.frame.irc.reconnecting));
	twitch.irc.connectWebSocket();
};

twitch.irc.onRoomState = async(event) => {
	if (args.search['7tv_emotes'] && !seventv.isEmotesLoaded) {
		let r = await seventv.loadEmotes(event['room-id']);
		if (requestIsOK(r.status)) makeMessage(...makeMessageArgumentsInfo(...replaceTagsInTranslation(translation.frame.parameter.loaded['7tv_emotes'], r.response.count)));
		else makeMessage(...makeMessageArgumentsInfo(...replaceTagsInTranslation(translation.frame.parameter.error['7tv_emotes'], r.message)));
	}
};

twitch.irc.onClearChat = async(event) => {
	if (args.search.remove_msg != 0) {
		if (event['target-user-id'] != null)
			removeAllUserMessages(event['target-user-id']);
		else
			removeAllMessages();
	}
};

twitch.irc.onClearMsg = async(event) => {
	if (args.search.remove_msg != 0)
		removeMessageByID(event['target-msg-id']);
};

twitch.irc.onUserNotice = async(event) => {
	const msgid = event['msg-id'];
	if (msgid === 'announcement') {
		event['msg-id'] = 'highlighted-message';
		twitch.irc.makeChatMessage(event);
	}
	else if (msgid === 'sub' || msgid === 'resub') {
		const isprime = event['msg-param-sub-plan'] === "Prime";
		const translationEvent = translation.frame.general.sub;
		const messageChunks = [
			{type: "group", cssClass: "container-header", chunks: [
				{type: "image", url: twitch.links[isprime ? 'icon_sub_prime' : 'icon_sub'], text: isprime ? "sub-prime" : "sub", cssClass: "message-chunk-image"},
				{text: event['display-name'], cssClass: "message-chunk-text bold"},
			]},
			{type: "group", cssClass: "container-description", chunks: [
				{text: translationEvent.text_bold, cssClass: "message-chunk-text chat bold"},
				{text: ` ${isprime ? translationEvent.text_prime : translationEvent.text_tier.replace('$1', event['msg-param-sub-plan'].substring(0, 1))}.`, cssClass: "message-chunk-text chat"},
			]},
		];
		if (msgid === "resub") {
			const chunk = messageChunks[1];
			chunk.chunks[1].text += ` ${translationEvent.text_resub} `;
			const months = event['msg-param-cumulative-months'];
			chunk.chunks.push(
				{text: (months > 1 ? (translationEvent[`text_months${months}`] ?? translationEvent.text_months) : translationEvent.text_month).replace('$1', months), cssClass: "message-chunk-text chat bold"},
				{text: (!isprime && event['msg-param-streak-months'] ? translationEvent.text_resub_streak.replace('$1', event['msg-param-streak-months']) : "") + "!", cssClass: "message-chunk-text chat"}
			);
		}

		const div = await twitch.irc.makeChatMessage(event, messageChunks);
		div.classList.add('message-sub');
		return div;
	}
	else if (msgid === "subgift") {
		const translationEvent = translation.frame.general.sub_gift;
		const div = makeMessage(
			{text: event['display-name'], cssClass: "message-chunk-text bold"},
			{text: ` ${translationEvent.text.replace('$1', event['msg-param-sub-plan'].substring(0, 1))} `, cssClass: "message-chunk-text"},
			{text: event['msg-param-recipient-display-name'], cssClass: "message-chunk-text bold"},
			{text: "!", cssClass: "message-chunk-text"}
		);
		div.classList.add('message-sub');
		div.setAttribute('message-id', event.id);
		div.setAttribute('user-id', event['user-id']);
		return div;
	}
	else if (msgid === "raid") {
		const translationEvent = translation.frame.general.raid;
		const div = makeMessage(
			{text: event['display-name'], cssClass: "message-chunk-text bold"},
			{text: ` ${translationEvent.text} `, cssClass: "message-chunk-text"},
			{text: (event['msg-param-viewerCount'] > 1 ? (translationEvent[`text_viewers${event['msg-param-viewerCount']}`] ?? translationEvent.text_viewers) : translationEvent.text_viewer).replace('$1', event['msg-param-viewerCount']), cssClass: "message-chunk-text bold"},
			{text: "!", cssClass: "message-chunk-text"}
		);
		div.classList.add('message-sub');
		div.setAttribute('message-id', event.message_id);
		div.setAttribute('user-id', event.chatter_user_id);
		return div;
	}
	else if (msgid === 'unraid') {} // do nothing
	else if (args.search.debug)
		console.warn(`unsupported user notice id: ${msgid}`, event);
};

twitch.irc.makeChatMessage = async(event, prefixChunks) => {
	let isHighlighted = event['msg-id'] === 'highlighted-message';
	const messageChunks = [];

	if (prefixChunks) messageChunks.push(...prefixChunks);

	if (event.text.length > 0 && event.text != event['broadcaster-login']) {
		// TODO: for youtube chat in future
		//messageChunks.push({type: "image", url: twitch.links.icon, text: "twitch_icon", cssClass: "message-chunk-image badge"});

		let badges = event.badges;
		if (event['source-room-id']) badges = event['source-badges'];
		if (badges) for (let fragment of badges.split(',')) {
			const [badgeSetID, badgeID] = fragment.split('/');
			const badgeSet = twitch.links.badges[badgeSetID];
			if (badgeSet) {
				const badgeURL = badgeSet[badgeID] ?? badgeSet['1'];
				if (badgeURL) messageChunks.push({type: "image", url: badgeURL, text: badgeSetID, cssClass: "message-chunk-image badge"});
			}
		}

		// chatter name
		let color = event.color;
		if (!color || color.length === 0)
			color = (await twitch.getUserColor(null, event['user-id'])).response;
		else
			twitch.userColors[event['user-id']] = color;
		messageChunks.push({text: event['display-name'], cssClass: "message-chunk-text bold", color});

		// separator from name and message
		messageChunks.push({text: ": ", cssClass: "message-chunk-text chat", attributes: {isseparator: ''}});

		const emoteURLs = {};
		if (event.emotes) event.emotes.split('/').forEach(a => {
			a = a.split(':');
			const id = a[0];
			a[1].split(',').forEach(sub => {
				let [start, end] = sub.split('-', 2);
				emoteURLs[event.text.substring(parseInt(start), parseInt(end) + 1)] = twitch.links.emoticons_v2(id);
			});
		});

		let prevEmote = false;
		let chunkText = "";
		for (let chunk of event.text.split(' ')) {
			if (chunk.length === 0) continue;

			chunkText += `${chunk} `;

			if (chunk.toLowerCase() === `@${args.search.twitch_login}`) isHighlighted = true;
			let isLink = regex.http_protocol.test(chunk);
			if (chunk.startsWith('@') || isLink) {
				let chunkAfterComma;
				if (!isLink && chunk.includes(',')) {
					chunkAfterComma = chunk.substring(chunk.indexOf(','));
					chunk = chunk.substring(0, chunk.indexOf(','));
					chunkText = chunkText.substring(0, chunkText.length - chunk.length - chunkAfterComma.length - 1) + chunk + " ";
				}

				// add message fragment before mention/link as new chunk
				chunkText = chunkText.substring(0, chunkText.length - chunk.length - 1);
				messageChunks.push({text: chunkText, cssClass: "message-chunk-text chat"});
				chunkText = " ";

				let color = "#8000ff";
				if (!isLink) color = twitch.userColors[chunk.substring(1).toLowerCase()] ?? color;

				// add mention/link chunk
				messageChunks.push({text: chunk, cssClass: isLink ? "message-chunk-text" : "message-chunk-text bold", color});
				prevEmote = false;

				if (chunkAfterComma)
					messageChunks.push({text: chunkAfterComma, cssClass: "message-chunk-text chat"});
				continue;
			}
			if (args.search.twitch_emotes) {
				let emote = findInStruct(emoteURLs, chunk);
				if (emote) {
					// add message fragment before mention/link as new chunk
					chunkText = chunkText.substring(0, chunkText.length - chunk.length - 1);
					messageChunks.push({text: chunkText, cssClass: "message-chunk-text chat"});
					chunkText = " ";

					// add emote chunk
					messageChunks.push({type: "image", url: emote, text: chunk, cssClass: "message-chunk-image"});
					prevEmote = true;
					continue;
				}
			}
			if (args.search['7tv_emotes']) {
				let emote = findInStruct(seventv.links.emotes, chunk);
				if (emote) {
					// add message fragment before mention/link as new chunk
					chunkText = chunkText.substring(0, chunkText.length - chunk.length - 1);
					messageChunks.push({text: chunkText, cssClass: "message-chunk-text chat"});
					chunkText = " ";

					// add emote chunk
					messageChunks.push({type: "image", url: emote.url, text: chunk, cssClass: prevEmote && emote.isZeroWidth ? "message-chunk-image zero-width" : "message-chunk-image"});
					prevEmote = true;
					continue;
				}
			}
		}
		if (chunkText.length > 0) messageChunks.push({text: chunkText, cssClass: "message-chunk-text chat"});
	}

	const div = makeMessage(...messageChunks);
	div.setAttribute('message-id', event.id);
	div.setAttribute('user-id', event['user-id']);

	if (isHighlighted)
		div.style.background = "rgba(255, 64, 0, 0.25)";

	return div;
};

twitch.irc.parseMessageData = (data) => {
	let index;
	let part;

	const event = {};
	event.message = data;

	if (data.startsWith('@')) {
		data = data.substring(1); // remove @

		index = data.indexOf(" :");
		if (index > -1) {
			data.substring(0, index).split(';').forEach(tag => {
				const [k, v] = tag.split('=', 2);
				if (v?.length > 0) event[k] = v;
			});
		}

		data = data.substring(index + 1);
	}

	if (data.startsWith(':')) {
		data = data.substring(1); // remove :
		index = data.indexOf(' ');
		event.login = data.substring(0, index);
		data = data.substring(index + 1);
		if (event.login === "tmi.twitch.tv")
			delete event.login;
		else {
			index = event.login.indexOf('.tmi.twitch.tv');
			if (index > -1) {
				event.login = event.login.substring(0, index);
				index = event.login.indexOf('!');
				if (index > -1) event.login = event.login.substring(0, index);
			} else
				delete event.login;
		}

		index = data.indexOf(' :');
		if (index > -1) {
			part = data.substring(0, index).split(' ');
			event.type = part[0];
			if (event.type === "CAP") {
				event.type = part.join(' ');
			}
			else {
				part.forEach((str, i) => {
					if (str === "=" || i === 0) return;
					if (str.startsWith('#')) event['broadcaster-login'] = str.substring(1);
					else event.login = str;
				});
			}

			event.text = data = data.substring(index + 2);
		} else {
			index = data.indexOf(' ');
			event.type = data.substring(0, index);
			data = data.substring(index + 2);

			event.text = event['broadcaster-login'] = data;
		}
	}

	if (args.search.debug) console.log(data, event);
	return event;
};