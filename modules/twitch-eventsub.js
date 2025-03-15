// chat will use eventsub to connect as logged user
// (if twitch_access_token is specified)

twitch.eventsub.connectWebSocket = () => {
	twitch.eventsub.session = null;
	twitch.eventsub.ws?.close();
	twitch.eventsub.ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
	twitch.eventsub.ws.addEventListener('open', twitch.eventsub.onOpen);
	twitch.eventsub.ws.addEventListener('message', e => twitch.eventsub.onMessage(JSON.parse(e.data)));
	twitch.eventsub.ws.addEventListener('error', twitch.eventsub.onError);
	twitch.eventsub.ws.addEventListener('close', twitch.eventsub.onClose);
};

twitch.eventsub.onOpen = async(e) => {
	//console.log(e);
};

twitch.eventsub.onError = async(e) => {
	console.error(e);
};

twitch.eventsub.onClose = async(e) => {
	//console.log(e);
	setTimeout(twitch.eventsub.connectWebSocket, 500);
};

twitch.eventsub.isConnected = false;
twitch.eventsub.onConnect = async() => {
	twitch.eventsub.isConnected = true;

	let r = await twitch.getUsersColor(args.search.twitch_access_token, twitch.broadcasterData.id);
	let userColor = "white";
	if (!requestIsOK(r.status)) console.log(r);
	else
		userColor = r.response[0].color;

	makeMessage(...makeMessageArgumentsInfo(...replaceTagsInTranslation(translation.frame.eventsub.connected, twitch.broadcasterData.display_name, userColor)));
}

twitch.eventsub.onMessage = async(data) => {
	if (twitch.eventsub.session.keepalive_timeout_id != null)
		clearTimeout(twitch.eventsub.session.keepalive_timeout_id);

	if (data.metadata?.message_type === 'session_welcome') twitch.eventsub.onSessionWelcome(data);
	else if (data.metadata?.message_type === 'session_keepalive') twitch.eventsub.onSessionKeepalive(data);
	else if (data.metadata?.message_type === 'notification') twitch.eventsub.onNotification(data);
	else if (args.search.debug) {
		console.log('unsupported message type', data);
	}
};

twitch.eventsub.onSessionWelcome = async(data) => {
	twitch.eventsub.session = data.payload.session;

	let r;

	if (twitch.isSameChannel) {
		r = await twitch.eventsub.subscribeToEvent({
			type: "channel.channel_points_custom_reward_redemption.add",
			version: "1",
			condition: { broadcaster_user_id: twitch.accessTokenData.user_id },
			transport: { method: "websocket", session_id: twitch.eventsub.session.id }
		});
		if (!requestIsOK(r.status)) return console.log(r);
	} else
		makeMessage(...makeMessageArgumentsInfo(...translation.frame.eventsub.token_belongs_to_other_channel));

	r = await twitch.eventsub.subscribeToEvent({
		type: "channel.chat.message",
		version: "1",
		condition: {
			broadcaster_user_id: twitch.broadcasterData.id, // id of broadcaster, see how twitch.broadcasterData is defined in start of main() in index.js
			user_id: twitch.accessTokenData.user_id // id of current user
		},
		transport: { method: "websocket", session_id: twitch.eventsub.session.id }
	});
	if (!requestIsOK(r.status)) return console.log(r);

	if (args.search.remove_msg != 0) {
		r = await twitch.eventsub.subscribeToEvent({
			type: "channel.chat.message_delete",
			version: "1",
			condition: {
				broadcaster_user_id: twitch.broadcasterData.id,
				user_id: twitch.accessTokenData.user_id
			},
			transport: { method: "websocket", session_id: twitch.eventsub.session.id }
		});
		if (!requestIsOK(r.status)) return console.log(r);

		r = await twitch.eventsub.subscribeToEvent({
			type: "channel.chat.clear",
			version: "1",
			condition: {
				broadcaster_user_id: twitch.broadcasterData.id,
				user_id: twitch.accessTokenData.user_id
			},
			transport: { method: "websocket", session_id: twitch.eventsub.session.id }
		});
		if (!requestIsOK(r.status)) return console.log(r);

		r = await twitch.eventsub.subscribeToEvent({
			type: "channel.chat.clear_user_messages",
			version: "1",
			condition: {
				broadcaster_user_id: twitch.broadcasterData.id,
				user_id: twitch.accessTokenData.user_id
			},
			transport: { method: "websocket", session_id: twitch.eventsub.session.id }
		});
		if (!requestIsOK(r.status)) return console.log(r);
	}

	if (!twitch.eventsub.isConnected) twitch.eventsub.onConnect();
};

twitch.eventsub.onSessionKeepalive = async(data) => {
	twitch.eventsub.session.keepalive_timeout_id = setTimeout(() => twitch.eventsub.ws.close(4005, 'session_keepalive timeout'), (twitch.eventsub.session.keepalive_timeout_seconds + 2) * 1000);
};

twitch.eventsub.onNotification = async(data) => {
	const subtype = data.payload.subscription.type;
	const event = data.payload.event;
	if (subtype === "channel.channel_points_custom_reward_redemption.add") twitch.eventsub.makeRewardMessage(event);
	else if (subtype === "channel.chat.message_delete") twitch.eventsub.onMessageDelete(event);
	else if (subtype === "channel.chat.clear") twitch.eventsub.onChatClear(event);
	else if (subtype === "channel.chat.clear_user_messages") twitch.eventsub.onChatClearUserMessages(event);
	else if (event.message_type === 'text' || event.message_type === 'channel_points_highlighted' || event.message_type === 'power_ups_gigantified_emote' || event.message_type === 'power_ups_message_effect') twitch.eventsub.makeChatMessage(event);
	else if (args.search.debug) {
		console.log('unsupported notification message type', data);
	}
};

twitch.eventsub.onChatClearUserMessages = async(event) => {
	if (args.search.remove_msg != 0)
		removeAllUserMessages(event.target_user_id);
};

twitch.eventsub.onChatClear = async(event) => {
	if (args.search.remove_msg != 0)
		removeAllMessages();
};

twitch.eventsub.onMessageDelete = async(event) => {
	if (args.search.remove_msg != 0)
		removeMessageByID(event.message_id);
};

twitch.eventsub.makeRewardMessage = async(event) => {
	if (args.search.debug) console.log(event);

	const div = makeMessage(
		{text: event.user_name, cssClass: "message-chunk-text bold"},
		{text: " redeemed ", cssClass: "message-chunk-text"},
		{text: event.reward.title, cssClass: "message-chunk-text bold"},
		{text: `${event.reward.cost} `, cssClass: "message-chunk-text bold reward"},
		{type: "image", url: twitch.links.icon_channel_points, text: "channel-points", cssClass: "message-chunk-image reward"},
	);

	div.setAttribute('message-id', event.id);
	div.setAttribute('user-id', event.user_id);
	div.classList.add('message-reward');

	return div;
};

twitch.eventsub.makeChatMessage = async(event) => {
	if (args.search.debug) console.log(event);

	// TODO: maybe add message effects
	// i found out these message effects (can be gotten with event.channel_points_animation_id): cosmic-abyss, simmer, rainbow-eclipse

	let isHighlighted = event.message_type === 'channel_points_highlighted' || event.message_type === 'power_ups_message_effect';
	let isGigantifiedEmote = event.message_type === 'power_ups_gigantified_emote';
	const messageChunks = [];

	// chatter badges
	if (args.search.twitch_badges) for (let badge of event.badges) {
		const badgeSet = twitch.links.badges[badge.set_id];
		if (badgeSet) {
			const badgeURL = badgeSet[badge.id] ?? badgeSet['1'];
			if (badgeURL) messageChunks.push({type: "image", url: badgeURL, text: badge.set_id, cssClass: "message-chunk-image badge"});
		}
	}

	// chatter name
	messageChunks.push({text: event.chatter_user_name, cssClass: "message-chunk-text bold", color: twitch.setAndGetUserColor(event.chatter_user_login, event.color)});

	// separator from name and message
	messageChunks.push({text: ": ", cssClass: "message-chunk-text chat", attributes: {isseparator: ''}});

	let prevEmote = false;
	for (let fragment of event.message.fragments) {
		if (fragment.type === 'text') {
			prevEmote = false;

			let chunkText = "";
			for (let chunk of fragment.text.split(' ')) {
				chunkText += `${chunk} `;
				let isLink = regex.http_protocol.test(chunk);
				if (isLink) {
					let chunkAfterComma;
					if (!isLink && chunk.includes(',')) {
						chunkAfterComma = chunk.substring(chunk.indexOf(','));
						chunk = chunk.substring(0, chunk.indexOf(','));
						chunkText = chunkText.substring(0, chunkText.length - chunk.length - chunkAfterComma.length - 1) + chunk + " ";
					}

					// add message fragment before mention/link as new chunk
					chunkText = chunkText.substring(0, chunkText.length - chunk.length - 1);
					messageChunks.push({text: chunkText, cssClass: "message-chunk-text chat"});
					chunkText = "";

					// add mention/link chunk
					messageChunks.push({text: chunk, cssClass: "message-chunk-text", color: "#8000ff"});
					prevEmote = false;

					if (chunkAfterComma)
						messageChunks.push({text: chunkAfterComma, cssClass: "message-chunk-text chat"});
					continue;
				}
				if (args.search['7tv_emotes']) {
					let emote = findInStruct(seventv.links.emotes, chunk);
					if (emote) {
						// add message fragment before emote as new chunk
						chunkText = chunkText.substring(0, chunkText.length - chunk.length - 1);
						messageChunks.push({text: chunkText, cssClass: "message-chunk-text chat"});
						chunkText = "";

						// add emote chunk
						messageChunks.push({type: "image", url: emote.url, text: chunk, cssClass: prevEmote && emote.isZeroWidth ? "message-chunk-image zero-width" : "message-chunk-image"});
						prevEmote = true;
						continue;
					}
				}
			}

			// add new chunk
			if (chunkText.length > 0) messageChunks.push({text: chunkText, cssClass: "message-chunk-text chat"});
		} else if (args.search.twitch_emotes && fragment.type === 'emote') {
			messageChunks.push({type: "image", url: twitch.links.emoticons_v2(fragment.emote.id), text: fragment.text, cssClass: isGigantifiedEmote ? "message-chunk-image gigantified" : "message-chunk-image"});
			prevEmote = true;
		}
		else if (fragment.type === 'mention') {
			var color = twitch.userColors[fragment.mention.user_login];
			if (color == null) {
				let r = await twitch.getUsersColor(args.search.twitch_access_token, fragment.mention.user_id);
				if (!requestIsOK(r.status)) console.log(r);
				else
					color = r.response[0].color;
			}

			messageChunks.push({text: fragment.text, color, cssClass: "message-chunk-text bold"});
			if (fragment.text.toLowerCase() === `@${args.search.twitch_login}`) isHighlighted = true;
		}
		else if (args.search.twitch_emotes && fragment.type === 'cheermote') {
			messageChunks.push({type: "image", url: twitch.links.cheermotes(fragment.cheermote.prefix, fragment.cheermote.bits), text: fragment.text, cssClass: isGigantifiedEmote ? "message-chunk-image gigantified" : "message-chunk-image"});
			messageChunks.push({text: fragment.cheermote.bits, cssClass: "message-chunk-text bits", color: twitch.bitsTextColor[fragment.cheermote.bits]});
			prevEmote = false; // cuz it ends with bits count
		}
		else {
			if (args.search.debug) console.log('unsupported message fragment type', event);
			prevEmote = false;
		}
	}

	const div = makeMessage(...messageChunks);
	div.setAttribute('message-id', event.message_id);
	div.setAttribute('user-id', event.chatter_user_id);

	if (isHighlighted)
		div.style.background = "rgba(255, 64, 0, 0.25)";

	return div;
};

twitch.eventsub.subscribeToEvent = async(jsonBody) => {
	let request, response = null;

	try {
		request = await twitch.fetch.eventsub.subscriptions(args.search.twitch_access_token, jsonBody);
		response = await request.json();

		if (!request.ok) return response;
		return {status: request.status};
	} catch(e) {
		return {status: 400, message: e.toString()};
	}
};