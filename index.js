args.search.debug = args.search.debug == 1;
if (args.search.error === 'access_denied')
	window.close();
if (args.hash.access_token != null) {
	localStorage.setItem('popupwindowclosed', true);
	localStorage.setItem('popupaccesstoken', args.hash.access_token);
	window.close();
}

function textAreaOnlyNumbers_onkeydown(e) {
	if (!/[\.0-9]|Backspace|Arrow(?:Left|Right)/.test(e.key))
		e.preventDefault();
}
function focusTextAreaOnClickDiv_onclick(el) {
	el = el.children[0];
	el.focus();
	el.selectionStart = el.selectionEnd = getElementValue(el).length;
}

// https://stackoverflow.com/a/34748190
function selectTextRange(obj, start, stop) {
	var endNode, startNode = endNode = obj.firstChild

	if (startNode?.nodeValue != null) {
		startNode.nodeValue = startNode.nodeValue.trim();

		var range = document.createRange();
		range.setStart(startNode, start);
		range.setEnd(endNode, stop + 1);

		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	}
}

function setElementValue(el, v) {
	el[el.nodeName.toLowerCase() === 'div' ? 'innerText' : 'value'] = v;
}
function getElementValue(el) {
	return el[el.nodeName.toLowerCase() === 'div' ? 'innerText' : 'value'];
}

function updateHideSensitiveInfo(v) {
	if (v == 1) {
		textarea_twitch_access_token.classList.add('blurred');
		textarea_output.classList.add('blurred');
	} else {
		textarea_twitch_access_token.classList.remove('blurred');
		textarea_output.classList.remove('blurred');
	}
}

const values = {
	default: {},
	current: {
		twitch_access_token: null,
		twitch_login: 'kaicenat',
		hide_sensitive_info: '1',
		lang: isUserRussianUnderstanding ? 'ru' : 'en',
		remove_msg: '1',
		size: '16',
		indent: '4',
		fadeout: '0',
		fadeout_duration: '0.5',
		twitch_emotes: '1',
		twitch_badges: '1',
		'7tv_emotes': '1',
		twitch_dashboard: '0',
		twitch_dashboard_size: '16',
		twitch_notifications_follow: '1',
		twitch_notifications_reward_redemption: '1',
		sound_volume_on_message: '0',
		sound_volume_on_follower: '0',
		sound_volume_on_subscriber: '0',
		sound_volume_on_raid: '0'
	}
};

var curPopupWindow = null;
/** starts listening popup window for access token or if it was closed */
function startListenPopupWindow() {
	curPopupWindow = popupCenter({url: twitch.links.authorize(), w: 436, h: 855});
	listenPopupWindow();
}
/**
 * **do not call it, use `startListenPopupWindow()`**
 * 
 * checks for access token / if popup was closed / if user denied auth each 750ms
 * 
 * logs to console the result
 */
function listenPopupWindow() {
	if (localStorage.getItem('popupwindowclosed')) {
		localStorage.removeItem('popupwindowclosed');
		const accessToken = localStorage.getItem('popupaccesstoken');
		localStorage.removeItem('popupaccesstoken');

		if (args.search.debug) console.log({status: 200, message: `access token received: ${accessToken}`});
		twitch.validateAccessToken(accessToken).then(r => {
			if (requestIsOK(r.status))
				twitch.addAccessToken(accessToken);
			else {
				twitch.removeAccessToken(accessToken);
				console.log(r);
			}
		});

		curPopupWindow = null;
	} else if (curPopupWindow?.closed) {
		if (args.search.debug) console.log({status: 400, message: `user denied: ${accessToken}`});
		curPopupWindow = null;
	} else {
		setTimeout(listenPopupWindow, 750);
		if (args.search.debug) console.log({status: 100, message: `waiting for response...`});
	}
}

twitch.addAccessToken = (newAccessToken) => {
	setElementValue(textarea_twitch_access_token, newAccessToken);
	createChatLink();
	values.current.twitch_access_token = newAccessToken;
	localStorage.setItem('values', JSON.stringify(values.current));

	if (!message_twitch_access_token_invalid.classList.contains('hidden')) message_twitch_access_token_invalid.classList.add('hidden');
	message_twitch_access_token_expires_in.classList.remove('hidden');
	message_twitch_access_token_expires_in.innerHTML = getValue(lang, 'builder.category.cell.footer.twitch_access_token.expires_in').replace('$1', humanizeAccessTokenExpireDate());
};
twitch.removeAccessToken = async(accessToken) => {
	const r = await twitch.revokeAccessToken(accessToken);

	if (args.search.debug) console[requestIsOK(r.status) ? 'log' : 'error'](r);

	setElementValue(textarea_twitch_access_token, '');
	createChatLink();
	values.current.twitch_access_token = "";
	localStorage.setItem('values', JSON.stringify(values.current));

	message_twitch_access_token_invalid.classList.remove('hidden');
	if (!message_twitch_access_token_expires_in.classList.contains('hidden')) message_twitch_access_token_expires_in.classList.add('hidden');
};

function humanizeAccessTokenExpireDate() {
	return humanizeDuration(twitch.accessTokenData.expires_in * 1000, {largest: 2, language: values.current.lang, delimiter: values.current.lang === "ru" ? " и " : " and "});
}

var createChatLinkWorking = 0;
/**
 * generates chat link and enters it to #textarea_output div on async;
 * 
 * if method is already executed, stops current running method and starts the new one
 */
async function createChatLink(cancel) {
	if (cancel) createChatLinkWorking = 0;
	if (createChatLinkWorking > 0) return;
	createChatLinkWorking++;

	var toadd = `${app.link}/frame?`;
	for (let arg of Object.keys(values.current)) {
		if (createChatLinkWorking > 1) return await createChatLink(true);
		values.current[arg] = getElementValue(document.getElementById(arg)) ?? values.default[arg];
		toadd += `${arg}=${values.current[arg]}&`;
	}
	localStorage.setItem('values', JSON.stringify(values.current));
	textarea_output.innerText = encodeURI(toadd);

	createChatLinkWorking = false;
}

var translatedNodes;
function updateTranslation(langID) {
	fetch(`lang/${langID ?? values.current.lang}.json`)
	.then(r => r.json())
	.then(r => {
		lang = r;

		if (translatedNodes == null) {
			translatedNodes = new Map();
			document.body.querySelectorAll('body *').forEach(node => {
				if (node.innerText?.startsWith('#') && node.textContent.trim !== '' && node.children.length === 0)
					translatedNodes.set(node.innerText.substring(1), node);
			});
		}

		translatedNodes.forEach((node, id) => node.innerHTML = getValue(lang, id));
		message_twitch_access_token_expires_in.innerHTML = getValue(lang, 'builder.category.cell.footer.twitch_access_token.expires_in').replace('$1', humanizeAccessTokenExpireDate());
	});
}

document.addEventListener('DOMContentLoaded', (_, e) => main());

async function main() {
	// get input field values from browser cache
	for (let [arg, value] of Object.entries(values.current))
		values.default[arg] = value;
	const cache = JSON.parse(localStorage.getItem('values') ?? '{}');
	for (let [arg, value] of Object.entries(values.default))
		values.current[arg] = cache[arg] ?? value;

	// iterate over all input fields
	for (let [arg, value] of Object.entries(values.current)) {
		setElementValue(document.getElementById(arg), value);

		// adding "change" event in each input field which will execute creating chat link,
		// if createChatLink already executing, this will stop current executing and will start a new one
		const node = document.getElementById(arg);
		//console.log(node.nodeName, arg);
		const nodeName = node.nodeName.toLowerCase();
		if (nodeName === 'select')
			document.getElementById(arg).addEventListener('change', e => createChatLink());
		else if (nodeName === 'textarea' || arg === 'twitch_login')
			document.getElementById(arg).addEventListener('input', e => createChatLink());
		else if (arg === 'twitch_access_token')
			document.getElementById(arg).addEventListener('paste', e => createChatLink());
	}

	updateTranslation();
	document.getElementById('lang').addEventListener('change', e => updateTranslation(e.target.value));

	// set useful shortcuts
	message_twitch_access_token_expires_in = document.getElementById('message_twitch_access_token_expires_in');
	message_twitch_access_token_invalid = document.getElementById('message_twitch_access_token_invalid');
	textarea_twitch_access_token = document.getElementById('twitch_access_token');
	textarea_output = document.getElementById('textarea_output');
	textarea_twitch_login_placeholder = document.getElementById('twitch_login-placeholder');
	textarea_twitch_login = document.getElementById('twitch_login');

	async function lol() {
		if (textarea_twitch_access_token.innerText == "") return;

		let r = await twitch.validateAccessToken(textarea_twitch_access_token.innerText);
		if (requestIsOK(r.status))
			twitch.addAccessToken(textarea_twitch_access_token.innerText);
		else {
			twitch.removeAccessToken(textarea_twitch_access_token.innerText);
			console.error(r);
		}
	}
	// pasting text to twitch_access_token input field will validate access token in twitch api,
	// which displays on frontend if token was successfully validated
	await lol(textarea_twitch_access_token.innerText);
	textarea_twitch_access_token.addEventListener('paste', e => {
		lol(e.clipboardData.getData('Text'));
		e.target.innerText = '';
		e.preventDefault();
	});

	// adding click event which will open popup window with twitch auth:
	// user must authenticate app with their twitch account to get access token for chat needs,
	// otherwise popup just closes and does nothing;
	// if access token already exists, it will be revoked and then it will open the popup
	document.getElementById('button_twitch_access_token_generate').addEventListener('click', e => {
		if (values.current.twitch_access_token != "") 
			twitch.removeAccessToken(values.current.twitch_access_token).then(_ => startListenPopupWindow());
		else startListenPopupWindow();
	});

	// adding click event which will revoke current access token and will remove it from input field,
	// if access token isnt validated or not entered it does nothing
	document.getElementById('button_twitch_access_token_revoke').addEventListener('click', e => {
		if (values.current.twitch_access_token != "") twitch.removeAccessToken(values.current.twitch_access_token);
	});

	// adding change event of hide_sensitive_info "checkbox" which will blur/show sensitive fields
	document.getElementById('hide_sensitive_info').addEventListener('change', e => updateHideSensitiveInfo(e.target.value));
	updateHideSensitiveInfo(values.current.hide_sensitive_info);

	// needs to create chat link on page load lol
	createChatLink(true);

	document.getElementById('twitch_login').addEventListener('input', e => {
		textarea_twitch_login_placeholder.innerText = '';

		if (textarea_twitch_login.innerText == null || textarea_twitch_login.innerText.length < 1 || textarea_twitch_login.innerText === '\n' || values.current.twitch_access_token == "") return;

		twitch.getChannelByQuery(values.current.twitch_access_token, textarea_twitch_login.innerText)
		.then(r => {
			if (!requestIsOK(r.status)) return console.error(r);
			textarea_twitch_login_placeholder.innerText = r.response.broadcaster_login;
		});
	});
}