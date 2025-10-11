const app = {
	version: "v2.3.5",
	name: "LeerStreamChat",

	link: "https://theleername.github.io/LeerStreamChat",
	twitch_client_id: "7fjojtvr0o9307fp4vnkj8km3ngbwm",

	icon: "/assets/leerstreamchat.png",
};
app.icon = app.link + app.icon;
document.title = app.name;

const regex = {
	http_protocol: /https?:\/\//,
	is_number: /^\d+$/
};

const args = {
	search: {},
	hash: {}
};

// adds the <meta name="apple-mobile-web-app-title" content="LeerStreamChat" />
let metaApple = document.createElement('meta');
metaApple.setAttribute('name', 'apple-mobile-web-app-title');
metaApple.setAttribute('content', app.name);
if (document.currentScript) document.currentScript.parentNode.insertBefore(metaApple, document.currentScript);
else document.head.appendChild(metaApple);

for (let arg of window.location.search.substring(1).split('&')) {
	if (!arg.includes('=')) continue;
	arg = arg.split('=');
	if (arg[1].length > 0) args.search[arg[0]] = arg[1];
}
for (let arg of window.location.hash.substring(1).split('&')) {
	if (!arg.includes('=')) continue;
	arg = arg.split('=');
	if (arg[1].length > 0) args.hash[arg[0]] = arg[1];
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

// from deepseek ai
const getValue = (obj, path) => {
	return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

// country codes from: https://gist.github.com/msikma/8912e62ed866778ff8cd
const isUserRussianUnderstanding = 
	navigator.language === 'be' || navigator.language === 'be-BY' ||
	navigator.language === 'et' || navigator.language === 'et-EE' ||
	navigator.language === 'hy' || navigator.language === 'hy-AM' ||
	navigator.language === 'kk' || navigator.language === 'kk-KZ' ||
	navigator.language === 'lt' || navigator.language === 'lt-LT' ||
	navigator.language === 'lv' || navigator.language === 'lv-LV' ||
	navigator.language === 'ru' || navigator.language === 'ru-RU' ||
	navigator.language === 'uk' || navigator.language === 'uk-UA' || // <3
	navigator.language === 'uz' || navigator.language === 'uz-UZ'; // fun fact: im 50% uzbek

const requestIsOK = (code) => code > 199 && code < 300;

const fetchTimeout = 5000;
const abortControllers = {};
function advancedFetch(input, init) {
	init ??= {};

	const inputWithoutSearch = input.substring(0, input.includes('?') ? input.indexOf('?') : input.length);
	if (init.abortIfNewStarted && abortControllers[inputWithoutSearch] != null) {
		abortControllers[inputWithoutSearch].abort('Request was aborted, because a new one was started');
		delete abortControllers[inputWithoutSearch];
	}

	const controller = new AbortController();
	abortControllers[inputWithoutSearch] = controller;
	init.signal = controller.signal;

	const timeoutID = setTimeout(() => {
		abortControllers[inputWithoutSearch].abort('Request timeout');
	}, fetchTimeout);

	const request = fetch(input, init);
	request.then(r => {
		delete abortControllers[inputWithoutSearch];
		clearTimeout(timeoutID);
		return r;
	});
	request.catch(e => {
		delete abortControllers[inputWithoutSearch];
		clearTimeout(timeoutID);
		return e;
	});

	return request;
}