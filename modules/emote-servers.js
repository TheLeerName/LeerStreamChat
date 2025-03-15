const seventv = {
	globalEmoteSetID: "01GG8F04Y000089195YKEP5CA3",

	emoteSize: 4, // can be 1, 2, 3, 4

	links: {
		icon: `${link}/assets/7tv.svg`,

		emotesets: (emoteSetID) => `https://7tv.io/v3/emote-sets/${emoteSetID}`,
		users: {
			twitch: (channelID) => `https://7tv.io/v3/users/twitch/${channelID}`
		},

		// will be updated on loadEmotes()
		emotes: {}
	},

	isEmotesLoaded: false,
	loadEmotes: async(channelID) => {
		if (seventv.isEmotesLoaded) return {status: 200, response: {count: Object.keys(seventv.links.emotes).length, message: "7TV emotes were already loaded"}};

		let count = 0;
		let r = await seventv.getGlobalEmoteSet();
		if (!requestIsOK(r.status)) return r;
		for (let entry of r.response.emotes) {
			seventv.links.emotes[entry.name] = {
				url: `https:${entry.data.host.url}/${seventv.emoteSize}x.webp`,
				isZeroWidth: entry.flags == 1
			};
			count++;
		}

		r = await seventv.getChannelEmoteSet(channelID);
		if (!requestIsOK(r.status)) return r;
		if (r.response.emote_set.emotes) for (let entry of r.response.emote_set.emotes) {
			seventv.links.emotes[entry.name] = {
				url: `https:${entry.data.host.url}/${seventv.emoteSize}x.webp`,
				isZeroWidth: entry.flags == 1
			};
			count++;
		}

		seventv.isEmotesLoaded = true;
		return {status: 200, response: {count}};
	},

	getGlobalEmoteSet: async() => {
		let request, response, output = null;

		try {
			request = await advancedFetch(seventv.links.emotesets(seventv.globalEmoteSetID));
			response = await request.json();

			if (response.error_code != null) output = {status: request.status, message: `(${response.status}) ${response.error}`};
			else output = {status: request.status, response};
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},

	getChannelEmoteSet: async(channelID) => {
		let request, response, output = null;

		try {
			request = await advancedFetch(seventv.links.users.twitch(channelID));
			response = await request.json();

			if (response.error_code != null) output = {status: request.status, message: `(${response.status}) ${response.error}`};
			else output = {status: request.status, response};
		} catch(e) {
			output = {status: 400, message: e.toString()};
		}

		return output;
	},
};