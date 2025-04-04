twitch.dashboard = {
	div: null,
	viewers: {
		div: null,
		div_count: null,
		added: false,
		interval_id: null
	},
	followers: {
		div: null,
		div_count: null
	},
	subscribers: {
		div: null,
		div_count: null,
		added: false
	}
};

twitch.dashboard.initialized = false;
twitch.dashboard.initialize = () => {
	if (twitch.dashboard.initialized) return;

	const div = document.createElement('div');
	div.className = "dashboard";
	document.body.insertBefore(div, document.body.children[0]);

	const viewers = document.createElement('div');
	viewers.className = "container-viewer";
	const viewers_svg = document.createElement('img');
	viewers_svg.src = twitch.links.icon_viewers;
	viewers.appendChild(viewers_svg);
	const viewers_count = document.createElement('p');
	viewers_count.className = "text";
	viewers_count.style.color = "rgb(255, 130, 128)";
	viewers_count.innerText = "...";
	viewers.appendChild(viewers_count);
	twitch.dashboard.viewers.div = viewers;
	twitch.dashboard.viewers.div_count = viewers_count;

	const followers = document.createElement('div');
	const followers_count = document.createElement('p');
	followers_count.className = "text chat bold";
	followers_count.innerText = "...";
	followers.appendChild(followers_count);
	const followers_text = document.createElement('p');
	followers_text.className = "text";
	followers_text.innerText = ` ${translation.frame.dashboard.followers}`;
	followers.appendChild(followers_text);
	div.appendChild(followers);
	twitch.dashboard.followers.div = followers;
	twitch.dashboard.followers.div_count = followers_count;

	const subscribers = document.createElement('div');
	const subscribers_count = document.createElement('p');
	subscribers_count.className = "text chat bold";
	subscribers_count.innerText = "...";
	subscribers.appendChild(subscribers_count);
	const subscribers_text = document.createElement('p');
	subscribers_text.className = "text";
	subscribers_text.innerText = ` ${translation.frame.dashboard.subscribers}`;
	subscribers.appendChild(subscribers_text);
	twitch.dashboard.subscribers.div = subscribers;
	twitch.dashboard.subscribers.div_count = subscribers_count;

	twitch.dashboard.div = div;
	twitch.dashboard.initialized = true;
};

twitch.dashboard.showViewers = (viewer_count) => {
	if (twitch.dashboard.viewers.added) return;
	twitch.dashboard.initialize();

	twitch.dashboard.div.insertBefore(twitch.dashboard.viewers.div, twitch.dashboard.followers.div);
	twitch.dashboard.viewers.added = true;

	if (twitch.dashboard.viewers.interval_id) clearInterval(twitch.dashboard.viewers.interval_id);
	twitch.dashboard.updateViewers(viewer_count);
	twitch.dashboard.viewers.interval_id = setInterval(twitch.dashboard.updateViewers, 10000);
};

twitch.dashboard.hideViewers = () => {
	if (!twitch.dashboard.viewers.added) return;
	twitch.dashboard.initialize();

	twitch.dashboard.div.removeChild(twitch.dashboard.viewers.div);

	if (twitch.dashboard.viewers.interval_id) clearInterval(twitch.dashboard.viewers.interval_id);
};

twitch.dashboard.updateViewers = async(count) => {
	twitch.dashboard.showViewers();

	if (!count) {
		const r = await twitch.getStreamData(args.search.twitch_access_token, twitch.broadcasterData.id);
		if (!requestIsOK(r.status)) return console.error(r);
		count = r.response?.viewer_count ?? 0;
	}

	twitch.dashboard.viewers.div_count.innerText = `${count}`;
};

twitch.dashboard.updateFollowers = async() => {
	twitch.dashboard.initialize();

	const r = await twitch.getChannelFollowers(args.search.twitch_access_token, twitch.broadcasterData.id);
	if (!requestIsOK(r.status)) return console.error(r);
	twitch.dashboard.setFollowers(r.response.total);
};

twitch.dashboard.setFollowers = (count) => {
	twitch.dashboard.followers.div_count.innerText = `${count}`;
};

twitch.dashboard.getFollowers = () => {
	return parseInt(twitch.dashboard.followers.div_count.innerText);
};

twitch.dashboard.addFollowers = (add) => {
	twitch.dashboard.setFollowers(twitch.dashboard.getFollowers() + add);
};

twitch.dashboard.showSubscribers = () => {
	if (twitch.dashboard.subscribers.added) return;
	twitch.dashboard.subscribers.added = true;
	twitch.dashboard.div.appendChild(twitch.dashboard.subscribers.div);
};

twitch.dashboard.updateSubscribers = async() => {
	twitch.dashboard.initialize();

	const r = await twitch.getChannelSubscribers(args.search.twitch_access_token, twitch.broadcasterData.id);
	if (!requestIsOK(r.status)) {
		if (args.search.debug) console.error(r);
		return false;
	}

	twitch.dashboard.showSubscribers();
	twitch.dashboard.setSubscribers(r.response.total);
	return true;
};

twitch.dashboard.setSubscribers = (count) => {
	twitch.dashboard.subscribers.div_count.innerText = `${count}`;
};

twitch.dashboard.getSubscribers = () => {
	return parseInt(twitch.dashboard.subscribers.div_count.innerText);
};

twitch.dashboard.addSubscribers = (add) => {
	twitch.dashboard.setSubscribers(twitch.dashboard.getSubscribers() + add);
};