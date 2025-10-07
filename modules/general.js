async function sha256(str) {
	return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)))).map(v => v.toString(16).padStart(2, '0')).join('');
}

async function sha256_int(str) {
	var n = 0;
	(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)))).forEach(v => n += v);
	return n;
}

const is_number_regex = /^\d+$/;
/** if twitch SOMEHOW changes their ids to not numbers */
async function getNumberFromUserID(user_id) {
	// regex cuz parseint is stupid
	return is_number_regex.test(user_id) ? parseInt(user_id) : await sha256_int(user_id);
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