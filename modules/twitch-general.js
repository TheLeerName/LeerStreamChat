const twitch = {
	client_id: app.twitch_client_id,
	scopes: [
		"channel:read:redemptions",
		"channel:read:subscriptions",
		"moderator:read:followers",
		"user:read:chat",
	],

	emoteSize: 4, // can be 1, 2, 3, 4
	bitsTextColor: {
		1: '#979797',
		100: '#9c3ee8',
		1000: '#1db2a5',
		5000: '#0099fe',
		10000: '#f43021'
	},

	links: {
		icon: `${app.link}/assets/twitch.png`,
		icon_channel_points: `${app.link}/assets/twitch-channel-points.svg`,
		icon_sub: `${app.link}/assets/twitch-sub.svg`,
		icon_sub_prime: `${app.link}/assets/twitch-sub-prime.svg`,
		icon_viewers: `${app.link}/assets/twitch-viewers.svg`,
		icon_follow: `${app.link}/assets/twitch-follow.svg`,

		emoticons_v2: (id) => `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/${twitch.emoteSize}.0`,
		cheermotes: (prefix, bits) => `https://d3aqoihi2n8ty8.cloudfront.net/actions/${prefix}/dark/animated/${bits}/${twitch.emoteSize}.gif`,
		authorize: () => `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${twitch.client_id}&redirect_uri=${app.link}&scope=${twitch.scopes.join('%20')}`,

		// will be updated on loadBadges() if twitch_access_token is specified
		badges: {
			staff: {'1': 'https://static-cdn.jtvnw.net/badges/v1/7833bb6e-d20d-48ff-a58d-67fe827a4f84/3'},
			partner: {'1': 'https://static-cdn.jtvnw.net/badges/v1/d12a2e27-16f6-41d0-ab77-b780518f00a3/3'},
			premium: {'1': 'https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a598-423e-86d0-f9fb98ca1933/3'},
			broadcaster: {'1': 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3'},
			moderator: {'1': 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/3'},
			VIP: {'1': 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3'},
			founder: {'1': 'https://static-cdn.jtvnw.net/badges/v1/511b78a9-ab37-472f-9569-457753bbe7d3/3'},
			'artist-badge': {'1': 'https://static-cdn.jtvnw.net/badges/v1/4300a897-03dc-4e83-8c0e-c332fee7057f/3'},
			'no_audio': {'1': 'https://static-cdn.jtvnw.net/badges/v1/aef2cd08-f29b-45a1-8c12-d44d7fd5e6f0/3'},
			'no_video': {'1': 'https://static-cdn.jtvnw.net/badges/v1/199a0dba-58f3-494e-a7fc-1fa0a1001fb8/3'},
			subscriber: {'1': 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/3'}
		}
	},
	fetch: {
		revoke: (accessToken) => advancedFetch(`https://id.twitch.tv/oauth2/revoke?client_id=${twitch.client_id}&token=${accessToken}`, {method: "POST", headers: {'Content-Type': 'application/x-www-form-urlencoded'}}),
		validate: (accessToken) => advancedFetch("https://id.twitch.tv/oauth2/validate", {headers: {Authorization: `Bearer ${accessToken}`}}),
		streams: (accessToken, user_id) => advancedFetch(`https://api.twitch.tv/helix/streams?user_id=${user_id}`, {headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}}),
		subscriptions: (accessToken, broadcaster_id) => advancedFetch(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcaster_id}&first=1`, {headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}}),
		channels: {
			followers: (accessToken, broadcaster_id) => advancedFetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcaster_id}&first=1`, {headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}}),
		},
		users: {
			byID: (accessToken, user_id) => advancedFetch(`https://api.twitch.tv/helix/users?id=${user_id}`, {headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}}),
			byLogin: (accessToken, user_login) => advancedFetch(`https://api.twitch.tv/helix/users?login=${encodeURI(user_login)}`, {headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}})
		},
		shared_chat: {
			session: (accessToken, broadcaster_id) => advancedFetch(`https://api.twitch.tv/helix/shared_chat/session?broadcaster_id=${broadcaster_id}`, {headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}}),
		},
		search: {
			channels: (accessToken, query) => advancedFetch(`https://api.twitch.tv/helix/search/channels?first=1&query=${encodeURI(query)}`, {abortIfNewStarted: true, headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}})
		},
		eventsub: {
			subscriptions: {
				get: (accessToken, body) => advancedFetch("https://api.twitch.tv/helix/eventsub/subscriptions", {method: "POST", headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json"}, body: JSON.stringify(body)}),
				delete: (accessToken, id) => advancedFetch(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${id}`, {method: "DELETE", headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}})
			}
		},
		chat: {
			color: (accessToken, user_id) => advancedFetch(`https://api.twitch.tv/helix/chat/color?user_id=${user_id}`, {headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}}),
			badges: (accessToken, broadcaster_id) => advancedFetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcaster_id}`, {headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}}),
			badges_global: (accessToken) => advancedFetch(`https://api.twitch.tv/helix/chat/badges/global`, {headers: {'Client-Id': twitch.client_id, Authorization: `Bearer ${accessToken}`}}),
		}
	},

	eventsub: {
		session: {
			connected_at: "",
			id: "",
			reconnect_url: null,
			recovery_url: null,
			status: "connected",
			keepalive_timeout_seconds: 10,
			keepalive_timeout_id: null
		},
	},
	irc: {},

	isSameChannel: false,
	isAnonymous: false,

	// <userID> => <userColor>
	userColors: {},
	/** https://dev.twitch.tv/docs/api/reference/#get-user-chat-color  */
	getUserColor: async(accessToken, userID) => {
		let color = twitch.userColors[userID];
		if (color) return {status: 200, response: color};

		let request, response, output = null;
		if (accessToken) {
			try {
				request = await twitch.fetch.chat.color(accessToken, userID);
				response = await request.json();

				if (response.status != null) output = response;
				else if (response.data.length === 0) throw `User not found: ${userID}`;
				else {
					output = {status: request.status, response: response.data[0].color};
					if (output.response.length === 0) output.response = await generateUserColor(userID);
				}
			} catch(e) {
				output = {status: 400, message: e.toString(), response: await generateUserColor(userID)};
			}
		} else
			output = {status: 200, response: await generateUserColor(userID)};

		if (output.response) twitch.userColors[userID] = output.response;
		return output;
	},

	// <userLogin> => <userAvatarURL>
	userAvatars: {},
	getUserAvatar: async(accessToken, userLogin) => {
		let avatar = twitch.userAvatars[userLogin];
		if (avatar) return {status: 200, response: avatar};

		const r = await twitch.getUserData(accessToken, userLogin);
		if (!r.response) return {status: 400, message: `User not found: ${userLogin}`};
		if (!requestIsOK(r.status)) return r;

		let output = {status: r.status, response: r.response.profile_image_url};
		twitch.userAvatars[userLogin] = output.response;
		return output;
	},

	broadcasterData: {},
	accessTokenData: {},

	loadBadges: async(accessToken, channelID) => {
		let count = 0;

		r = await twitch.getGlobalBadges(accessToken);
		if (!requestIsOK(r.status)) return r;
		else {
			for (let badge of r.response) {
				let versions = {};
				for (let version of badge.versions)
					versions[version.id] = version.image_url_4x;
				twitch.links.badges[badge.set_id] = versions;
				count++;
			}
		}

		r = await twitch.getChannelBadges(accessToken, channelID);
		if (!requestIsOK(r.status)) return r;
		else {
			for (let badge of r.response) {
				let versions = {};
				for (let version of badge.versions)
					versions[version.id] = version.image_url_4x;
				twitch.links.badges[badge.set_id] = versions;
				count++;
			}
		}

		return {status: 200, response: {count}};
	},

	/** https://dev.twitch.tv/docs/authentication/validate-tokens/#how-to-validate-a-token */
	validateAccessToken: async(accessToken) => {
		let request, response, output = null;

		try {
			request = await twitch.fetch.validate(accessToken);
			response = await request.json();

			if (response.status != null) output = response;
			else if (response.scopes.sort().join(' ') != twitch.scopes.sort().join(' ')) throw `Twitch access token has wrong scopes, needed: "${twitch.scopes.join(' ')}"`;
			else {
				twitch.accessTokenData = response;
				output = {status: request.status, response};
			}
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},

	revokeAccessToken: async(accessToken) => {
		let request, output = null;

		try {
			request = await twitch.fetch.revoke(accessToken);
			if (requestIsOK(request.status)) output = {status: request.status};
			else output = await request.json();
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},

	/**
	 * https://dev.twitch.tv/docs/api/reference/#get-shared-chat-session
	 * 
	 * WARNING: `response` can be null! (if channel isnt in shared chat session or not found)
	 */
	getSharedChatSession: async(accessToken, channelID) => {
		let request, response, output = null;

		try {
			request = await twitch.fetch.shared_chat.session(accessToken, channelID);
			response = await request.json();

			if (response.status != null) output = response;
			else output = {status: request.status, response: response.data[0]};
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},

	/** https://dev.twitch.tv/docs/api/reference/#get-streams */
	getStreamData: async(accessToken, channelID) => {
		let request, response, output = null;

		try {
			request = await twitch.fetch.streams(accessToken, channelID);
			response = await request.json();

			if (response.status != null) output = response;
			else output = {status: request.status, response: response.data[0]};
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},

	/** https://dev.twitch.tv/docs/api/reference/#get-users */
	getUserData: async(accessToken, channelLogin) => {
		let request, response, output = null;

		try {
			request = await twitch.fetch.users.byLogin(accessToken, channelLogin);
			response = await request.json();

			if (response.status != null) output = response;
			else output = {status: request.status, response: response.data[0]};
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},

	/** https://dev.twitch.tv/docs/api/reference/#get-channel-followers */
	getChannelFollowers: async(accessToken, channelID) => {
		let request, output = null;

		try {
			request = await twitch.fetch.channels.followers(accessToken, channelID);
			response = await request.json();

			if (response.status != null) output = response;
			else output = {status: request.status, response: response};
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},

	/** https://dev.twitch.tv/docs/api/reference/#get-broadcaster-subscriptions */
	getChannelSubscribers: async(accessToken, channelID) => {
		let request, output = null;

		try {
			request = await twitch.fetch.subscriptions(accessToken, channelID);
			output = await request.json();
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},

	/** https://dev.twitch.tv/docs/api/reference/#get-channel-chat-badges */
	getChannelBadges: async(accessToken, channelID) => {
		let request, response, output = null;

		try {
			request = await twitch.fetch.chat.badges(accessToken, channelID);
			response = await request.json();

			if (response.status != null) output = response;
			else output = {status: request.status, response: response.data};
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},

	/** https://dev.twitch.tv/docs/api/reference/#get-global-chat-badges */
	getGlobalBadges: async(accessToken) => {
		let request, response, output = null;

		try {
			request = await twitch.fetch.chat.badges_global(accessToken);
			response = await request.json();

			if (response.status != null) output = response;
			else output = {status: request.status, response: response.data};
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},

	/** https://dev.twitch.tv/docs/api/reference/#search-channels */
	getChannelByQuery: async(accessToken, query) => {
		let request, response, output = null;

		try {
			request = await twitch.fetch.search.channels(accessToken, query);
			response = await request.json();

			if (response.status != null) output = response;
			else if (response.data.length === 0) throw `Channel not found: ${query}`;
			else output = {status: request.status, response: response.data[0]};
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	}
};