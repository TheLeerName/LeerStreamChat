// chat will use eventsub to connect as logged user
// (if twitch_access_token is specified)

twitch.eventsub.subscriptions = [];
twitch.eventsub.subscriptions_localstoragekey = "twitch_subscriptions";

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

twitch.eventsub.connected = false;
twitch.eventsub.onConnect = async() => {
	twitch.eventsub.connected = true;

	let r = await twitch.getUserColor(args.search.twitch_access_token, twitch.broadcasterData.id);
	if (!requestIsOK(r.status)) console.error(r);
	let userColor = r.response;

	makeMessage(messageChunks.twitch_icon, {text: translation.frame.twitch.eventsub.connected}, {text: twitch.broadcasterData.display_name, color: userColor});
	twitch.eventsub.releaseMessages();
};

twitch.eventsub.delayMessagesEnabled = false;
twitch.eventsub.delayedMessages = [];
twitch.eventsub.delayMessages = () => {
	if (twitch.eventsub.delayMessagesEnabled) return;

	twitch.eventsub.delayMessagesEnabled = true;
	while (twitch.eventsub.delayedMessages.length > 0)
		twitch.eventsub.delayedMessages.splice(0, 1);
};
twitch.eventsub.releaseMessages = async() => {
	if (!twitch.eventsub.delayMessagesEnabled) return;

	twitch.eventsub.delayMessagesEnabled = false;
	for (let message of twitch.eventsub.delayedMessages)
		await twitch.eventsub.onMessage(message);
	while (twitch.eventsub.delayedMessages.length > 0)
		twitch.eventsub.delayedMessages.splice(0, 1);
};

twitch.eventsub.onMessage = async(data) => {
	if (twitch.eventsub.delayMessagesEnabled)
		return twitch.eventsub.delayedMessages.push(data);

	if (twitch.eventsub.session?.keepalive_timeout_id)
		clearTimeout(twitch.eventsub.session.keepalive_timeout_id);

	if (data.metadata?.message_type === 'session_welcome') twitch.eventsub.onSessionWelcome(data);
	else if (data.metadata?.message_type === 'session_keepalive') twitch.eventsub.onSessionKeepalive(data);
	else if (data.metadata?.message_type === 'notification') twitch.eventsub.onNotification(data);
	else if (args.search.debug) {
		console.warn('unsupported message type', data);
	}
};

twitch.eventsub.onSessionWelcome = async(data) => {
	twitch.eventsub.session = data.payload.session;

	let r;

	twitch.eventsub.delayMessages();

	const broadcaster_user_id = twitch.broadcasterData.id; // id of broadcaster, see how twitch.broadcasterData is defined in start of main() in index.js
	const user_id = twitch.accessTokenData.user_id; // id of current user

	// removing previous subscriptions
	twitch.eventsub.subscriptions = JSON.parse(localStorage.getItem(twitch.eventsub.subscriptions_localstoragekey) ?? "[]");
	for (const id of twitch.eventsub.subscriptions) {
		twitch.eventsub.unsubscribeFromEvent(id);
		twitch.eventsub.subscriptions.shift();
	}

	if (args.search.twitch_dashboard) {
		r = await twitch.eventsub.subscribeToEvent("stream.online", {broadcaster_user_id});
		if (!requestIsOK(r.status)) return console.error(r);
		r = await twitch.eventsub.subscribeToEvent("stream.offline", {broadcaster_user_id});
		if (!requestIsOK(r.status)) return console.error(r);

		// if stream already started, show viewers on dashboard
		r = await twitch.getStreamData(args.search.twitch_access_token, broadcaster_user_id);
		if (!requestIsOK(r.status)) return console.error(r);
		if (r.response) twitch.dashboard.showViewers(r.response.viewer_count);

		// channel followers will be updated with timeout of 5 min
		// or will be increased by 1 on channel.follow
		await twitch.dashboard.updateFollowers();
		setInterval(twitch.dashboard.updateFollowers, 300000);

		// channel subscribers will be updated with timeout of 5 min
		// or will be increased by 1 on channel.chat.notification if its sub
		if (await twitch.dashboard.updateSubscribers())
			setInterval(twitch.dashboard.updateSubscribers, 300000);
	}

	const t = translation.frame.twitch.eventsub;

	if (args.search.twitch_notifications_follow) {
		r = await twitch.eventsub.subscribeToEvent("channel.follow", {broadcaster_user_id, moderator_user_id: user_id}, "2");
		if (r.status === 403) makeMessage(messageChunks.twitch_icon, {text: t.twitch_notifications_follow.unauthorized[0], color: warnColor}, {text: t.twitch_notifications_follow.unauthorized[1], color: "white"});
		else if (!requestIsOK(r.status)) return console.error(r);
	}

	r = await twitch.eventsub.subscribeToEvent("channel.chat.message", {broadcaster_user_id, user_id});
	if (!requestIsOK(r.status)) return console.error(r);
	r = await twitch.eventsub.subscribeToEvent("channel.chat.notification", {broadcaster_user_id, user_id});
	if (!requestIsOK(r.status)) return console.error(r);

	if (args.search.remove_msg != 0) {
		r = await twitch.eventsub.subscribeToEvent("channel.chat.message_delete", {broadcaster_user_id, user_id});
		if (!requestIsOK(r.status)) return console.error(r);
		r = await twitch.eventsub.subscribeToEvent("channel.chat.clear", {broadcaster_user_id, user_id});
		if (!requestIsOK(r.status)) return console.error(r);
		r = await twitch.eventsub.subscribeToEvent("channel.chat.clear_user_messages", {broadcaster_user_id, user_id});
		if (!requestIsOK(r.status)) return console.error(r);
	}

	if (args.search.twitch_notifications_reward_redemption) {
		r = await twitch.eventsub.subscribeToEvent("channel.channel_points_custom_reward_redemption.add", {broadcaster_user_id});
		if (r.status === 403)
			makeMessage(messageChunks.twitch_icon, {text: t.twitch_notifications_reward_redemption.unauthorized[0], color: warnColor}, {text: t.twitch_notifications_reward_redemption.unauthorized[1], color: "white"});
		else if (!requestIsOK(r.status)) return console.error(r);
	}

	twitch.eventsub.sharedChatEnabled = (await twitch.getSharedChatSession(args.search.twitch_access_token, twitch.broadcasterData.id)).response != null;
	r = await twitch.eventsub.subscribeToEvent("channel.shared_chat.begin", {broadcaster_user_id});
	if (!requestIsOK(r.status)) return console.error(r);
	r = await twitch.eventsub.subscribeToEvent("channel.shared_chat.end", {broadcaster_user_id});
	if (!requestIsOK(r.status)) return console.error(r);

	localStorage.setItem(twitch.eventsub.subscriptions_localstoragekey, JSON.stringify(twitch.eventsub.subscriptions));

	if (!twitch.eventsub.connected) twitch.eventsub.onConnect();
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
	else if (subtype === "channel.chat.notification") twitch.eventsub.onChatNotification(event);
	else if (subtype === "channel.shared_chat.begin") twitch.eventsub.onSharedChatBegin(event);
	else if (subtype === "channel.shared_chat.end") twitch.eventsub.onSharedChatEnd(event);
	else if (subtype === "stream.online") twitch.eventsub.onStreamOnline(event);
	else if (subtype === "stream.offline") twitch.eventsub.onStreamOffline(event);
	else if (subtype === "channel.follow") twitch.eventsub.onChannelFollow(event);
	else if (subtype === "channel.subscribe") twitch.eventsub.onChannelSubscribe(event);
	else if (event.message_type === 'text' || event.message_type === 'channel_points_highlighted' || event.message_type === 'power_ups_gigantified_emote' || event.message_type === 'power_ups_message_effect') twitch.eventsub.makeChatMessage(event);
	else if (args.search.debug) {
		console.warn('unsupported notification message type', data);
	}
};

twitch.eventsub.onChannelFollow = async(event) => {
	if (args.search.debug) console.log(event);

	if (args.search.twitch_dashboard)
		twitch.dashboard.addFollowers(1);

	const div = makeMessage(
		{type: "group", cssClass: "container-header", chunks: [
			{type: "image", url: twitch.links.icon_follow, text: "twitch_follow", cssClass: "image"},
			{text: event.user_name, cssClass: "text bold"},
		]},
		{type: "group", cssClass: "container-description", chunks: [
			{text: translation.frame.twitch.eventsub.twitch_notifications_follow.text, cssClass: "text chat"}
		]}
	);
	div.classList.add('message-sub');
	div.setAttribute('user-id', event.user_id);
	return div;
};

twitch.eventsub.onStreamOnline = async(event) => {
	if (args.search.debug) console.log(event);

	twitch.dashboard.showViewers();
};

twitch.eventsub.onStreamOffline = async(event) => {
	if (args.search.debug) console.log(event);

	twitch.dashboard.hideViewers();
};

twitch.eventsub.onChatNotification = async(event) => {
	if (args.search.debug) console.log(event);

	const noticetype = event.notice_type;
	const noticeinfo = event[noticetype];

	if (args.search.twitch_dashboard && twitch.dashboard.subscribers.added && (noticetype === "sub" || (noticetype === "shared_chat_sub" && !event.source_broadcaster_user_name) || noticetype === "sub_gift" || (noticetype === "shared_chat_sub_gift" && !event.source_broadcaster_user_name)))
		twitch.dashboard.setSubscribers(1);

	if (noticetype === "sub" || noticetype === "resub" || noticetype === "shared_chat_sub" || noticetype === "shared_chat_resub") {
		const isprime = noticeinfo.is_prime;
		const t = translation.frame.twitch.general.sub;
		const messageChunks = [
			{type: "group", cssClass: "container-header", chunks: [
				{type: "image", url: twitch.links[isprime ? 'icon_sub_prime' : 'icon_sub'], text: isprime ? "sub-prime" : "sub", cssClass: "image"},
				{text: event.chatter_user_name, cssClass: "text bold"},
			]},
			{type: "group", cssClass: "container-description", chunks: [
				{text: t.text_bold, cssClass: "text chat bold"},
				{text: ` ${isprime ? t.text_prime : t.text_tier.replace('$1', noticeinfo.sub_tier.substring(0, 1))}` + (twitch.eventsub.sharedChatEnabled ? ` ${t.text_tochannel.replace('$1', event.source_broadcaster_user_name ?? event.broadcaster_user_name)}` : "") + ".", cssClass: "text chat"},
			]},
		];
		if (noticetype === "resub") {
			const chunk = messageChunks[1];
			chunk.chunks[1].text += ` ${t.text_resub} `;
			const months = noticeinfo[`${isprime ? 'duration' : 'cumulative'}_months`];
			chunk.chunks.push(
				{text: (months > 1 ? (t[`text_months${months}`] ?? t.text_months) : t.text_month).replace('$1', months), cssClass: "text chat bold"},
				{text: (!isprime && noticeinfo.streak_months ? t.text_resub_streak.replace('$1', noticeinfo.streak_months) : "") + "!", cssClass: "text chat"}
			);
		}

		const div = await twitch.eventsub.makeChatMessage(event, messageChunks, true);
		div.classList.add('message-sub');
		return div;
	}
	else if (noticetype === "community_sub_gift" || noticetype === "shared_chat_community_sub_gift") {
		const t = translation.frame.twitch.general.community_sub_gift;
		const div = makeMessage(
			{text: event.chatter_is_anonymous ? translation.frame.twitch.general.anonymous_user : event.chatter_user_name, cssClass: "text" + (event.chatter_is_anonymous ? "" : " bold")},
			{text: ` ${t.text.replace('$1', (noticeinfo.total > 1 ? (t[`text_subs${noticeinfo.total}`] ?? t.text_subs) : t.text_sub).replace('$1', noticeinfo.total)).replace('$2', noticeinfo.sub_tier.substring(0, 1)).replace('$3', event.source_broadcaster_user_name ?? event.broadcaster_user_name)}.${noticeinfo.cumulativeTotal > 0 ? ` ${t.text_total.replace('$1', noticeinfo.cumulative_total)}` : ""}`, cssClass: "text"}
		);
		div.classList.add('message-sub');
		div.setAttribute('message-id', event.message_id);
		div.setAttribute('user-id', event.chatter_user_id);
		return div;
	}
	else if (noticetype === "sub_gift" || noticetype === "shared_chat_sub_gift") {
		const t = translation.frame.twitch.general.sub_gift;
		const div = makeMessage(
			{text: event.chatter_is_anonymous ? translation.frame.twitch.general.anonymous_user : event.chatter_user_name, cssClass: "text" + (event.chatter_is_anonymous ? "" : " bold")},
			{text: ` ${t.text.replace('$1', noticeinfo.sub_tier.substring(0, 1))} `, cssClass: "text"},
			{text: noticeinfo.recipient_user_name, cssClass: "text bold"},
			{text: (twitch.eventsub.sharedChatEnabled ? ` ${t.text_tochannel.replace('$1', event.source_broadcaster_user_name ?? event.broadcaster_user_name)}` : "") + "!", cssClass: "text"}
		);
		div.classList.add('message-sub');
		div.setAttribute('message-id', event.message_id);
		div.setAttribute('user-id', event.chatter_user_id);
		return div;
	}
	else if (noticetype === "raid" || noticetype === "shared_chat_raid") {
		const t = translation.frame.twitch.general.raid;
		const div = makeMessage(
			{text: noticeinfo.user_name, cssClass: "text bold"},
			{text: ` ${twitch.eventsub.sharedChatEnabled ? t.text_shared_chat.replace('$1', event.source_broadcaster_user_name ?? event.broadcaster_user_name) : t.text} `, cssClass: "text"},
			{text: (noticeinfo.viewer_count > 1 ? (t[`text_viewers${noticeinfo.viewer_count}`] ?? t.text_viewers) : t.text_viewer).replace('$1', noticeinfo.viewer_count), cssClass: "text bold"},
			{text: "!", cssClass: "text"}
		);
		div.classList.add('message-sub');
		div.setAttribute('message-id', event.message_id);
		div.setAttribute('user-id', event.chatter_user_id);
		return div;
	}
	else if (noticetype === "unraid")
		return null;
	else if (noticetype === "announcement" || noticetype === "shared_chat_announcement") {
		// TODO: remake this with current announcement message design in default twitch chat
		event.message_type = "channel_points_highlighted";
		const div = await twitch.eventsub.makeChatMessage(event, null, true);
		return div;
	}

	if (args.search.debug) {
		console.warn('unsupported chat notification notice type', event);
		return null;
	}
};

twitch.eventsub.sharedChatEnabled = false;
twitch.eventsub.onSharedChatBegin = async(event) => {
	if (args.search.debug) console.log(event);

	twitch.eventsub.sharedChatEnabled = true;
};

twitch.eventsub.onSharedChatEnd = async(event) => {
	if (args.search.debug) console.log(event);

	twitch.eventsub.sharedChatEnabled = false;
};

twitch.eventsub.onChatClearUserMessages = async(event) => {
	if (args.search.remove_msg == 0) return;

	if (args.search.debug) console.log(event);
	removeAllUserMessages(event.target_user_id);
};

twitch.eventsub.onChatClear = async(event) => {
	if (args.search.remove_msg == 0) return;
	
	if (args.search.debug) console.log(event);
	removeAllMessages();
};

twitch.eventsub.onMessageDelete = async(event) => {
	if (args.search.remove_msg == 0) return;

	if (args.search.debug) console.log(event);
	removeMessageByID(event.message_id);
};

twitch.eventsub.makeRewardMessage = async(event) => {
	if (args.search.debug) console.log(event);

	const div = makeMessage(
		{type: "group", cssClass: "container-text", chunks: [
			{text: `${event.user_name} `, cssClass: "text bold"},
			{text: translation.frame.twitch.eventsub.twitch_notifications_reward_redemption.text, cssClass: "text"},
			{text: ` ${event.reward.title}`, cssClass: "text bold"},
		]},
		{type: "group", cssClass: "container-reward", chunks: [
			{type: "image", url: twitch.links.icon_channel_points, text: "twitch_channel_points", cssClass: "image"},
			{text: `${event.reward.cost}`, cssClass: "text bold reward"},
		]}
	);

	div.setAttribute('message-id', event.id);
	div.setAttribute('user-id', event.user_id);
	div.classList.add('message-reward');

	return div;
};

twitch.eventsub.makeChatMessage = async(event, prefixChunks, ignoreDebug) => {
	if (args.search.debug && !ignoreDebug) console.log(event);

	// TODO: channel_points_animation_id
	// i found out these message effects (can be gotten with event.channel_points_animation_id): cosmic-abyss, simmer, rainbow-eclipse

	// TODO: channel_points_custom_reward_id

	let isHighlighted = event.message_type === 'channel_points_highlighted' || event.message_type === 'power_ups_message_effect';
	let isGigantifiedEmote = event.message_type === 'power_ups_gigantified_emote';
	const messageChunks = [];

	if (prefixChunks) messageChunks.push(...prefixChunks);

	if (event.message.text.length > 0) {
		// chatter badges

		// TODO: for youtube chat in future
		//messageChunks.push(messageChunks.twitch_icon);

		if (args.search.twitch_badges) {
			let badges = event.badges;

			// broadcaster avatar if shared chat enabled
			if (twitch.eventsub.sharedChatEnabled) {
				let broadcasterLogin = event.source_broadcaster_user_login;
				if (broadcasterLogin == null) broadcasterLogin = event.broadcaster_user_login;
				else badges = event.source_badges; // display badges from source broadcaster

				let r = await twitch.getUserAvatar(args.search.twitch_access_token, broadcasterLogin);
				if (!requestIsOK(r.status)) console.error(r);
				else messageChunks.push({type: "image", url: r.response, text: broadcasterLogin, cssClass: "image badge"});
			}

			// chatter badges
			if (badges) for (let badge of badges) {
				const badgeSet = twitch.links.badges[badge.set_id];
				if (badgeSet) {
					const badgeURL = badgeSet[badge.id] ?? badgeSet['1'];
					if (badgeURL) messageChunks.push({type: "image", url: badgeURL, text: badge.set_id, cssClass: "image badge"});
				}
			}
		}

		// chatter name
		let color = event.color;
		if (color.length === 0) {
			let r = await twitch.getUserColor(args.search.twitch_access_token, event.chatter_user_id);
			if (!requestIsOK(r.status)) console.error(r);
			color = r.response;
		} else
			twitch.userColors[event.chatter_user_id] = color;
		messageChunks.push({text: event.chatter_user_name, cssClass: "text bold", color});

		// separator from name and message
		messageChunks.push({text: ": ", cssClass: "text chat", attributes: {isseparator: ''}});

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

						// add message fragment before link as new chunk
						chunkText = chunkText.substring(0, chunkText.length - chunk.length - 1);
						messageChunks.push({text: chunkText, cssClass: "text chat"});
						chunkText = " ";

						// add link chunk
						messageChunks.push({text: chunk, cssClass: "text", color: "#8000ff"});
						prevEmote = false;

						if (chunkAfterComma)
							messageChunks.push({text: chunkAfterComma, cssClass: "text chat"});
						continue;
					}
					if (args.search['7tv_emotes']) {
						let emote = findInStruct(seventv.links.emotes, chunk);
						if (emote) {
							// add message fragment before emote as new chunk
							chunkText = chunkText.substring(0, chunkText.length - chunk.length - 1);
							messageChunks.push({text: chunkText, cssClass: "text chat"});
							chunkText = "";

							// add emote chunk
							messageChunks.push({type: "image", url: emote.url, text: chunk, cssClass: prevEmote && emote.isZeroWidth ? "image zero-width" : "image"});
							prevEmote = true;
							continue;
						}
					}
				}

				// add new chunk
				if (chunkText.length > 0) messageChunks.push({text: chunkText, cssClass: "text chat"});
			}
			else if (fragment.type === 'emote') {
				if (args.search.twitch_emotes) {
					messageChunks.push({type: "image", url: twitch.links.emoticons_v2(fragment.emote.id), text: fragment.text, cssClass: isGigantifiedEmote ? "image gigantified" : "image"});
					prevEmote = true;
				}
			}
			else if (fragment.type === 'mention') {
				let color = twitch.userColors[fragment.mention.user_id];
				if (color == null) {
					let r = await twitch.getUserColor(args.search.twitch_access_token, fragment.mention.user_id);
					if (!requestIsOK(r.status)) console.error(r);
					color = r.response;
				}

				messageChunks.push({text: fragment.text, color, cssClass: "text bold"});
				if (fragment.text.toLowerCase() === `@${args.search.twitch_login}`) isHighlighted = true;
			}
			else if (fragment.type === 'cheermote') {
				if (args.search.twitch_emotes) {
					messageChunks.push({type: "image", url: twitch.links.cheermotes(fragment.cheermote.prefix, fragment.cheermote.bits), text: fragment.text, cssClass: isGigantifiedEmote ? "image gigantified" : "image"});
					messageChunks.push({text: fragment.cheermote.bits, cssClass: "text bits", color: twitch.bitsTextColor[fragment.cheermote.bits]});
					prevEmote = false; // cuz it ends with bits count
				}
			}
			else {
				if (args.search.debug) console.warn('unsupported message fragment type', event);
				prevEmote = false;
			}
		}
	}

	const div = makeMessage(...messageChunks);
	div.setAttribute('message-id', event.message_id);
	div.setAttribute('user-id', event.chatter_user_id);

	if (isHighlighted)
		div.style.background = "rgba(255, 64, 0, 0.25)";

	return div;
};

twitch.eventsub.subscribeToEvent = async(type, condition, version) => {
	version ??= "1";

	let request, response = null;

	try {
		const subscription = { type, version, condition, transport: { method: "websocket", session_id: twitch.eventsub.session.id } };
		request = await twitch.fetch.eventsub.subscriptions.get(args.search.twitch_access_token, subscription);
		response = await request.json();

		if (!request.ok) return response;
		twitch.eventsub.subscriptions.push(response.data[0].id);
		return {status: request.status};
	} catch(e) {
		return {status: 400, message: e.toString()};
	}
};
twitch.eventsub.unsubscribeFromEvent = async(id) => {
	let request, response = null;

	try {
		request = await twitch.fetch.eventsub.subscriptions.delete(args.search.twitch_access_token, id);
		response = await request.json();

		if (!request.ok) return response;
		return {status: request.status};
	} catch(e) {
		return {status: 400, message: e.toString()};
	}
};