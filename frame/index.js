var chatMessagesDiv = null; // document.getElementsByClassName("messages")[0]

const imagePlaceholderColor = "#0080ff";
const infoColor = "#FFFFFF";
const warnColor = "#FFC000";
const errorColor = "#ff0000";

// https://stackoverflow.com/a/25644409
function Uint8ToBase64(u8Arr) {
	var CHUNK_SIZE = 0x8000; //arbitrary number
	var index = 0;
	var length = u8Arr.length;
	var result = '';
	var slice;
	while (index < length) {
		slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length)); 
		result += String.fromCharCode.apply(null, slice);
		index += CHUNK_SIZE;
	}
	return btoa(result);
}

async function sha256(str) {
	return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)))).map(v => v.toString(16).padStart(2, '0')).join('');
}

async function sha256_int(str) {
	var n = 0;
	(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)))).forEach(v => n += v);
	return n;
}

/** if twitch SOMEHOW changes their ids to not numbers */
async function getNumberFromUserID(user_id) {
	// regex cuz parseint is stupid
	return regex.is_number.test(user_id) ? parseInt(user_id) : await sha256_int(user_id);
}

const defaultUserColors = [
	"#ff0000",
	"#0000ff",
	"#008000",
	"#b22222",
	"#ff7f50",
	"#9acd32",
	"#ff4500",
	"#2e8b57",
	"#daa520",
	"#d2691e",
	"#5f9ea0",
	"#1e90ff",
	"#ff69b4",
	"#8a2be2",
	"#00ff7f"
];

// new method for generating user colors!!! now its not resets on each reload of chat!!!
async function generateUserColor(str) {
	return defaultUserColors[(await getNumberFromUserID(str)) % defaultUserColors.length];
}

function findInStruct(struct, nameToFind) {
	if (struct != null) for (let [name, url] of Object.entries(struct))
		if (nameToFind === name) return url;
	return null;
}

function createMessageChunkImage(src, cssClass, appendTo) {
	const chunk = document.createElement('img');
	chunk.src = src;
	chunk.className = cssClass ?? "image";
	chunk.loading = "lazy";
	chunk.decoding = "async";
	if (appendTo != null) appendTo.appendChild(chunk);
	return chunk;
}

function createMessageChunkText(text, cssClass, appendTo) {
	const chunk = document.createElement('p');
	chunk.className = cssClass ?? "text";
	chunk.innerText = text;
	if (appendTo != null) appendTo.appendChild(chunk);
	return chunk;
}

const messageChunks = {
	twitch_icon: {type: "image", url: twitch.links.icon, text: "twitch_icon", cssClass: "image badge"}
};
function makeMessage(...chunks) {
	const div = document.createElement('div');
	div.className = "message";

	const consoleLogChunks = [];
	function addChunks(chunks, appendTo) {
		for (let chunk of chunks) {
			let chunkDiv;
			if (chunk.type === "image") {
				chunkDiv = createMessageChunkImage(chunk.url, chunk.cssClass, appendTo);
				if (args.search.debug) consoleLogChunks.push({text: `%c${chunk.text} `, css: `color:${chunk.color ?? imagePlaceholderColor}`});
			} else if (chunk.type === "group") {
				chunkDiv = document.createElement('div');
				chunkDiv.className = chunk.cssClass ?? "";
				addChunks(chunk.chunks, chunkDiv);
				if (args.search.debug) consoleLogChunks.push({text: "\n"});
				appendTo.appendChild(chunkDiv);
			} else { // else if (chunk.type === "text")
				chunkDiv = createMessageChunkText(chunk.text, chunk.cssClass, appendTo);
				if (chunk.color) chunkDiv.style.color = chunk.color;
				if (args.search.debug) consoleLogChunks.push({text: `%c${chunk.text}`, css: `color:${chunk.color ?? infoColor}`});
			}

			if (chunkDiv && chunk.attributes) for (let [k, v] of Object.entries(chunk.attributes))
				chunkDiv.setAttribute(k, v);
		}
	}
	addChunks(chunks, div);

	// adding message to messages div
	chatMessagesDiv.appendChild(div);

	// removing out of bounds message
	while (chatMessagesDiv.getBoundingClientRect().height > window.innerHeight)
		chatMessagesDiv.removeChild(chatMessagesDiv.children[0]);
	document.body.scrollTop = document.body.scrollHeight;

	// starting fadeout of message (if allowed)
	if (args.search.fadeout > 0)
		setTimeout(() => { div.className += " decaying" }, args.search.fadeout);

	if (args.search.debug && consoleLogChunks.length > 0) {
		let message = "";
		const css = [];
		consoleLogChunks.forEach(v => {
			message += v.text;
			if (v.css) css.push(v.css);
		});
		//console.log(div);
		console.log(message, ...css);
	}

	return div;
}

function removeMessageFromDiv(message) {
	if (args.search.remove_msg == 1)
		chatMessagesDiv.removeChild(message);
	else if (args.search.remove_msg == 2) {
		let separator;
		message.childNodes.forEach(chunk => {
			if (chunk.hasAttribute('isseparator')) separator = chunk;
			else if (separator) {
				message.removeChild(chunk);
			}
		});

		if (separator) {
			separator.innerHTML = `: ${translation.frame.general.message_deleted}`;
			separator.removeAttribute('isseparator');
		}
	}
}

function removeMessageByID(id) {
	chatMessagesDiv.childNodes.forEach(message => {
		if (message == null) return;

		if (message.getAttribute('message-id') === id)
			removeMessageFromDiv(message)
	});
}

function removeAllMessages() {
	chatMessagesDiv.childNodes.forEach(message => {
		if (message != null) removeMessageFromDiv(message)
	});
	makeMessage(
		messageChunks.twitch_icon,
		{text: translation.frame.general.chat_cleared}
	);
}

function removeAllUserMessages(userID) {
	chatMessagesDiv.childNodes.forEach(message => {
		if (message == null) return;

		if (message.getAttribute('user-id') === userID)
			removeMessageFromDiv(message)
	});
}

const translation = {};
async function loadTranslation() {
	const request = await fetch(`../lang/${args.search.lang}.json`);
	const response = await request.json();
	for (let [k, v] of Object.entries(response)) translation[k] = v;
}

async function main() {
	chatMessagesDiv = document.getElementsByClassName("messages")[0];
	const style = document.body.style;
	style.setProperty('--info_color', infoColor);
	style.setProperty('--args_size', `${args.search.size}px`);
	style.setProperty('--args_decay', `${args.search.fadeout}ms`);
	style.setProperty('--args_decay_duration', `${args.search.fadeout_duration}ms`);
	style.setProperty('--args_margin_top', args.search.indent * 0.5);
	style.setProperty('--args_padding', args.search.indent * 0.5);

	makeMessage({type: "image", url: app.icon, text: "lsc_icon", cssClass: "image badge"}, {text: `${app.name} ${app.version}`, cssClass: "text bold", color: "#8000ff"});
	await loadTranslation();

	const t = translation.frame.general;

	if (!args.search.twitch_login)
		return makeMessage(messageChunks.twitch_icon, {text: t.twitch_login.not_found[0], color: errorColor}, {text: " twitch_login ", color: "white"}, {text: t.twitch_login.not_found[1], color: errorColor});
	if (!args.search.twitch_access_token) {
		twitch.isAnonymous = true;
		makeMessage(messageChunks.twitch_icon, {text: t.twitch_access_token.not_found[0], color: warnColor}, {text: " twitch_access_token ", color: "white"}, {text: t.twitch_access_token.not_found[1], color: warnColor});
	}

	args.search.twitch_login = args.search.twitch_login.toLowerCase();
	args.search.lang ??= 'en';
	args.search.remove_msg = parseInt(args.search.remove_msg ?? '1');
	args.search.size = parseFloat(args.search.size ?? '16');
	args.search.indent = parseFloat(args.search.indent ?? '4');
	args.search.fadeout = parseFloat(args.search.fadeout ?? '0') * 1000;
	args.search.fadeout_duration = parseFloat(args.search.fadeout_duration ?? '0.5') * 1000;
	args.search.twitch_emotes = args.search.twitch_emotes == 1;
	args.search['7tv_emotes'] = args.search['7tv_emotes'] == 1;
	args.search.twitch_dashboard = args.search.twitch_dashboard == 1;
	args.search.twitch_badges = args.search.twitch_badges == 1;
	args.search.twitch_notifications_follow = args.search.twitch_notifications_follow == 1;
	args.search.twitch_notifications_subscribe = args.search.twitch_notifications_subscribe == 1;
	args.search.twitch_notifications_reward_redemption = (args.search.twitch_notifications_reward_redemption ?? args.search.twitch_reward_redemptions) == 1;
	args.search.twitch_message_sound = args.search.twitch_message_sound == 1;
	args.search.debug = args.search.debug == 1;

	if (!twitch.isAnonymous) {
		var r = await twitch.validateAccessToken(args.search.twitch_access_token);
		if(!requestIsOK(r.status)) {
			twitch.isAnonymous = true;
			delete args.search.twitch_access_token;
			makeMessage(messageChunks.twitch_icon, {text: t.twitch_access_token.invalid, color: warnColor});
			console.error(r);
		}

		if (!twitch.isAnonymous) {
			r = await twitch.getUserData(args.search.twitch_access_token, args.search.twitch_login);
			if (!r.response) return makeMessage(messageChunks.twitch_icon, {text: t.twitch_login.invalid[0], color: errorColor}, {text: args.search.twitch_login, color: "white"}, {text: t.twitch_login.invalid[1], color: errorColor});
			else if (!requestIsOK(r.status)) return console.error(r);
			else {
				twitch.broadcasterData = r.response;
				// put the broadcaster avatar to userAvatars to use it for shared chat later
				twitch.userAvatars[twitch.broadcasterData.login] = twitch.userAvatars.profile_image_url;
			}

			if (args.search.twitch_badges) {
				let r = await twitch.loadBadges(args.search.twitch_access_token, twitch.broadcasterData.id);
				if (requestIsOK(r.status)) makeMessage(messageChunks.twitch_icon, {text: t.twitch_badges.loaded[0]}, {text: `${r.response.count}`, color: "white"}, {text: t.twitch_badges.loaded[1]});
				else makeMessage(messageChunks.twitch_icon, {text: t.twitch_badges.not_loaded, color: errorColor}, {text: r.message, color: "white"});
			}

			if (args.search['7tv_emotes']) {
				let r = await seventv.loadEmotes(twitch.broadcasterData.id);
				if (requestIsOK(r.status)) makeMessage(messageChunks.twitch_icon, {text: t['7tv_emotes'].loaded[0]}, {text: `${r.response.count}`, color: "white"},{text: t['7tv_emotes'].loaded[1]});
				else makeMessage(messageChunks.twitch_icon,{text: t['7tv_emotes'].not_loaded, color: errorColor},{text: r.message, color: "white"});
			}
		}
	}

	if (twitch.isAnonymous)
		twitch.irc.connectWebSocket();
	else
		twitch.eventsub.connectWebSocket();

	twitch.sounds.init();
}
document.addEventListener('DOMContentLoaded', (_, e) => main());