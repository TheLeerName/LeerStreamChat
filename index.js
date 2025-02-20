var allowedSymbols_textAreaOnlyNumbers = /[\.0-9]|Backspace|Arrow(?:Left|Right)/;
function textAreaOnlyNumbers_onkeydown(e) {
	if (!allowedSymbols_textAreaOnlyNumbers.test(e.key))
		e.preventDefault();
}
function focusTextAreaOnClickDiv_onclick(el) {
	el = el.children[0];
	el.focus();
	el.selectionStart = el.selectionEnd = getElementValue(el).length;
}

// from deepseek ai
function getValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

// country codes from: https://gist.github.com/msikma/8912e62ed866778ff8cd
function isUserRussianUnderstanding() { // maybe
	const l = navigator.language;
	return l == 'be' || l == 'be-BY' ||
		   l == 'et' || l == 'et-EE' ||
		   l == 'hy' || l == 'hy-AM' ||
		   l == 'kk' || l == 'kk-KZ' ||
		   l == 'lt' || l == 'lt-LT' ||
		   l == 'lv' || l == 'lv-LV' ||
		   l == 'ru' || l == 'ru-RU' ||
		   l == 'uk' || l == 'uk-UA' || // <3
		   l == 'uz' || l == 'uz-UZ'; // fun fact: im 50% uzbek
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

// https://stackoverflow.com/a/16861050
const popupCenter = ({url, title, w, h}) => {
    // Fixes dual-screen position                             Most browsers      Firefox
    const dualScreenLeft = window.screenLeft !==  undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !==  undefined   ? window.screenTop  : window.screenY;

    const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    const systemZoom = width / window.screen.availWidth;
    const left = (width - w) / 2 / systemZoom + dualScreenLeft
    const top = (height - h) / 2 / systemZoom + dualScreenTop
    const newWindow = window.open(url, title, 
      `
      scrollbars=yes,
      width=${w / systemZoom}, 
      height=${h / systemZoom}, 
      top=${top}, 
      left=${left}
      `
    )

    if (window.focus) newWindow.focus();
	return newWindow;
}

function setElementValue(el, v) {
	el[el.nodeName.toLowerCase() == 'div' ? 'innerText' : 'value'] = v;
}
function getElementValue(el) {
	return el[el.nodeName.toLowerCase() == 'div' ? 'innerText' : 'value'];
}

function updateHideSensitiveInfo(v) {
	if (v == '1') {
		textarea_twitch_access_token.classList.add('blurred');
		textarea_output.classList.add('blurred');
	} else {
		textarea_twitch_access_token.classList.remove('blurred');
		textarea_output.classList.remove('blurred');
	}
}

var twitchClientID = '7fjojtvr0o9307fp4vnkj8km3ngbwm';
var twitchScopes = 'channel:read:redemptions'; // pro tip: use %20 instead of space
var link = 'https://theleername.github.io/LeerStreamChat/frame';
var twitchHelixSearchChannelsLink = 'https://api.twitch.tv/helix/search/channels';
var twitchOAuth2ValidateLink = 'https://id.twitch.tv/oauth2/validate';
var twitchOAuth2RevokeLink = `https://id.twitch.tv/oauth2/revoke`;
var twitchOAuth2AuthorizeLink = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${twitchClientID}&redirect_uri=http://localhost&scope=${twitchScopes}`;
var twitchOAuth2AuthorizePopupParameters = {url: twitchOAuth2AuthorizeLink, w: 436, h: 855};
var defaultValues = {
	twitch_access_token: '',
	twitch_login: '',
	hide_sensitive_info: '1',
	lang: isUserRussianUnderstanding() ? 'ru' : 'en',
	remove_msg: '2',
	size: '16',
	indent: '4',
	fadeout: '0',
	fadeout_duration: '0.5',
	twitch_emotes: '1',
	twitch_badges: '1',
	'7tv_emotes': '1'
};
var values = null;

var searchArgs = {};
for (arg of window.location.search.substring(1).split('&')) {
	if (!arg.includes('=')) continue;
	arg = arg.split('=');
	searchArgs[arg[0]] = arg[1];
}

var hashArgs = {};
for (arg of window.location.hash.substring(1).split('&')) {
	if (!arg.includes('=')) continue;
	arg = arg.split('=');
	hashArgs[arg[0]] = arg[1];
}

if (searchArgs.error == 'access_denied')
	window.close();
if (hashArgs.access_token != null) {
	localStorage.setItem('lsc_popupwindowclosed', true);
	localStorage.setItem('lsc_access_token', hashArgs.access_token);
	window.close();
}

var curPopupWindow = null;
/** starts listening popup window for access token or if it was closed */
function startListenPopupWindow() {
	curPopupWindow = popupCenter(twitchOAuth2AuthorizePopupParameters);
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
	if (localStorage.getItem('lsc_popupwindowclosed')) {
		localStorage.removeItem('lsc_popupwindowclosed');
		var accessToken = localStorage.getItem('lsc_access_token');
		console.log({status: 200, message: `access token received: ${accessToken}`});
		values.twitch_access_token = accessToken;
		setElementValue(textarea_twitch_access_token, accessToken);
		localStorage.setItem('lsc_saveData', JSON.stringify(values));
		twitchAccessTokenValidated = true;
		message_twitch_access_token_invalid.classList.add('hidden');


		curPopupWindow = null;
	} else if (curPopupWindow?.closed) {
		console.log({status: 400, message: `user denied: ${accessToken}`});
		curPopupWindow = null;
	} else {
		setTimeout(listenPopupWindow, 750);
		console.log({status: 100, message: `waiting for response...`});
	}
}

access_token_expires_in = 0;
var twitchAccessTokenValidated = false;
/**
 * validates `accessToken` in Twitch API and calls `oncomplete()`
 * 
 * checks for needed client_id and scopes, and logs whats u did wrong to browser console
 * 
 * logs to console completed/error message
 */
function validateTwitchAccessToken(accessToken, oncomplete) {
	if (textarea_twitch_access_token.innerText.length < 0 || textarea_twitch_access_token.innerText.length > 30 || accessToken?.length == 0) return;

	fetch(twitchOAuth2ValidateLink, {headers: {Authorization: `Bearer ${accessToken}`}})
	.then(r => r.json())
	.then(r => {
		values.twitch_access_token = accessToken;
		localStorage.setItem('lsc_saveData', JSON.stringify(values));

		twitchAccessTokenValidated = false;
		message_twitch_access_token_invalid.classList.remove('hidden');
		message_twitch_access_token_expires_in.classList.add('hidden');

		if (r.status != null)
			return console.log(r);
		if (r.client_id != twitchClientID)
			return console.log({status: 401, message: 'access token belongs to wrong client_id, needed: "' + twitchClientID + '"'});
		if ((r.scopes ?? "").join(' ') != twitchScopes)
			return console.log({status: 401, message: 'access token has wrong scopes, needed: "' + twitchScopes + '"'});

		console.log({status: 400, message: 'access token validated'});
		twitchAccessTokenValidated = true;
		message_twitch_access_token_invalid.classList.add('hidden');
		message_twitch_access_token_expires_in.classList.remove('hidden');
		access_token_expires_in = r.expires_in * 1000;
		message_twitch_access_token_expires_in.innerHTML = getValue(lang, 'builder.category.cell.footer.twitch_access_token.expires_in').replace('$1', humanizeDuration(access_token_expires_in, {largest: 2, language: values.lang, delimiter: ' and '}));

		oncomplete?.();
	}).catch(e => {
		twitchAccessTokenValidated = false;
		message_twitch_access_token_invalid.classList.remove('hidden');
		message_twitch_access_token_expires_in.classList.add('hidden');
		return console.log({message: e});
	});
}

/**
 * revokes `accessToken` from Twitch API and calls `oncomplete()`
 * 
 * logs to console completed/error message
 */
function revokeTwitchAccessToken(accessToken, oncomplete) {
	fetch(`${twitchOAuth2RevokeLink}?client_id=${twitchClientID}&token=${accessToken}`, {
		method: "POST",
		headers: {'Content-Type': 'application/x-www-form-urlencoded'}
	})
	.then(r => {
		if (r.status == 200) {
			values.twitch_access_token = '';
			setElementValue(textarea_twitch_access_token, '');
			localStorage.setItem('lsc_saveData', JSON.stringify(values));
	
			twitchAccessTokenValidated = false;
			if (!message_twitch_access_token_invalid.classList.contains('hidden')) message_twitch_access_token_invalid.classList.add('hidden');
			console.log({status: 200, message: `access token revoked`});
			oncomplete?.();
		} else
			// error status, some of 400 401 404
			r.json().then(r => console.log(r));
	})
	.catch(e => console.log({message: e}));
}

var searchTwitchChannelController = new AbortController();
var searchTwitchChannelWorking = false;
function searchTwitchChannel() {
	if (textarea_twitch_login.innerText == null || textarea_twitch_login.innerText.length < 1 || textarea_twitch_login.innerText == '\n') return;

	if (searchTwitchChannelWorking) {
		searchTwitchChannelController?.abort('aborted old request');
		searchTwitchChannelController = new AbortController();
	}
	searchTwitchChannelWorking = true;
	textarea_twitch_login_placeholder.innerText = '';

	var postFetch = null;
	fetch(`${twitchHelixSearchChannelsLink}?first=1&query=${encodeURI(textarea_twitch_login.innerText)}`, {
		signal: searchTwitchChannelController.signal,
		headers: {
			'Client-Id': twitchClientID,
			'Authorization': `Bearer 6h454tp8j4yw9io99lmvxoy4nmujhq`
		}
	})
	.then(r => {
		postFetch = r;
		return r.json();
	})
	.then(r => {
		var v = "";

		if (postFetch.status == 200) {
			if (r.data.length == 0) console.log({status: 400, message: `channel not found: ${textarea_twitch_login.innerText}`});
			else {
				v = r.data[0].broadcaster_login;
				console.log({status: 200, message: `channel found: ${v}`});
			}
		} else
			console.log(r);

		textarea_twitch_login_placeholder.innerText = v;
		searchTwitchChannelWorking = false;
	})
	.catch(e => {
		console.log({status: postFetch?.status ?? 400, message: e.toString()});
		searchTwitchChannelWorking = false;
	});
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

	var toadd = `${link}?`;
	for (let arg of Object.keys(values)) {
		if (createChatLinkWorking > 1) return await createChatLink(true);
		values[arg] = getElementValue(document.getElementById(arg)) ?? defaultValues[arg];
		toadd += `${arg}=${values[arg]}&`;
	}
	localStorage.setItem('lsc_saveData', JSON.stringify(values));
	textarea_output.innerText = encodeURI(toadd);

	createChatLinkWorking = false;
}

var translatedNodes;
function updateTranslation(langID) {
	fetch(`lang/${langID ?? values.lang}.json`)
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
		message_twitch_access_token_expires_in.innerHTML = getValue(lang, 'builder.category.cell.footer.twitch_access_token.expires_in').replace('$1', humanizeDuration(access_token_expires_in, {largest: 2, language: values.lang, delimiter: ' and '}));
	});
}

document.addEventListener('DOMContentLoaded', (_, e) => main());

async function main() {
	// get input field values from browser cache
	values = JSON.parse(localStorage.getItem('lsc_saveData') ?? '{}');
	for (let [arg, defaultValue] of Object.entries(defaultValues))
		values[arg] ??= defaultValue;

	// iterate over all input fields
	for (let [arg, value] of Object.entries(values)) {
		setElementValue(document.getElementById(arg), value);

		// adding "change" event in each input field which will execute creating chat link,
		// if createChatLink already executing, this will stop current executing and will start a new one
		const node = document.getElementById(arg);
		//console.log(node.nodeName, arg);
		const nodeName = node.nodeName.toLowerCase();
		if (nodeName == 'select')
			document.getElementById(arg).addEventListener('change', e => createChatLink());
		else if (nodeName == 'textarea' || arg == 'twitch_login')
			document.getElementById(arg).addEventListener('input', e => createChatLink());
		else if (arg == 'twitch_access_token')
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

	// pasting text to twitch_access_token input field will call validateTwitchAccessToken,
	// which displays on frontend if token was successfully validated
	validateTwitchAccessToken(textarea_twitch_access_token.innerText);
	textarea_twitch_access_token.addEventListener('paste', e => {
		e.target.innerText = '';
		validateTwitchAccessToken(e.clipboardData.getData('Text'));
	});

	// adding click event which will open popup window with twitch auth:
	// user must authenticate app with their twitch account to get access token for chat needs,
	// otherwise popup just closes and does nothing;
	// if access token already exists, it will be revoked and then it will open the popup
	document.getElementById('button_twitch_access_token_generate').addEventListener('click', e => {
		if (twitchAccessTokenValidated) revokeTwitchAccessToken(textarea_twitch_access_token.innerText, startListenPopupWindow);
		else startListenPopupWindow();
	});

	// adding click event which will revoke current access token and will remove it from input field,
	// if access token isnt validated or not entered it does nothing
	document.getElementById('button_twitch_access_token_revoke').addEventListener('click', e => {
		if (!twitchAccessTokenValidated) return;
		revokeTwitchAccessToken(textarea_twitch_access_token.innerText);
	});

	// adding change event of hide_sensitive_info "checkbox" which will blur/show sensitive fields
	document.getElementById('hide_sensitive_info').addEventListener('change', e => updateHideSensitiveInfo(e.target.value));
	updateHideSensitiveInfo(values.hide_sensitive_info);

	// needs to create chat link on page load lol
	createChatLink(true);

	document.getElementById('twitch_login').addEventListener('input', e => searchTwitchChannel());
}