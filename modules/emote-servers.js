const seventv = {
	globalEmoteSetID: "01GG8F04Y000089195YKEP5CA3",

	emoteSize: 4, // can be 1, 2, 3, 4

	links: {
		icon: `${app.link}/assets/7tv.svg`,

		emotesets: (emoteSetID) => `https://7tv.io/v3/emote-sets/${emoteSetID}`,
		users: {
			twitch: (channelID) => `https://7tv.io/v3/users/twitch/${channelID}`
		},

		// will be updated on loadEmotes()
		emotes: {}
	},

	isEmotesLoaded: false,
	loadEmotes: async(channelID) => {
		if (seventv.isEmotesLoaded) return {status: 200, data: {count: Object.keys(seventv.links.emotes).length, message: "7TV emotes were already loaded"}};

		let count = 0;
		let r = await seventv.getGlobalEmoteSet();
		if (!r.ok) return r;
		for (let entry of r.emotes) {
			seventv.links.emotes[entry.name] = {
				url: `https:${entry.data.host.url}/${seventv.emoteSize}x.webp`,
				isZeroWidth: entry.flags == 1
			};
			count++;
		}

		r = await seventv.getChannelEmoteSet(channelID);
		if (!r.ok) return r;
		if (r.emote_set.emotes) for (let entry of r.emote_set.emotes) {
			seventv.links.emotes[entry.name] = {
				url: `https:${entry.data.host.url}/${seventv.emoteSize}x.webp`,
				isZeroWidth: entry.flags == 1
			};
			count++;
		}

		seventv.isEmotesLoaded = true;
		return {ok: true, status: 200, count};
	},

	getGlobalEmoteSet: async() => {
		let request, response;

		try {
			request = await advancedFetch(seventv.links.emotesets(seventv.globalEmoteSetID));
			response = await request.json();

			response.ok = request.ok;
			response.status = request.status;
		} catch(e) {
			response = {ok: false, status: 400, message: e.toString()};
		}

		return response;
	},

	getChannelEmoteSet: async(channelID) => {
		let request, response;

		try {
			request = await advancedFetch(seventv.links.users.twitch(channelID));
			response = await request.json();

			response.ok = request.ok;
			response.status = request.status;
		} catch(e) {
			response = {ok: false, status: 400, message: e.toString()};
		}

		return response;
	},
};