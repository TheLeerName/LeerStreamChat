# Leer's Stream Chat
Stream chat for displaying on browser source in OBS

## Features
- 7TV channel and global emotes
- Twitch channel and global emotes
- Twitch channel and global badges (only with twitch token)
- Twitch channel points reward redemptions (only if twitch token belongs to broadcaster of chat)
- Twitch channel new follower display (only if twitch token belongs to broadcaster of chat)
- Twitch subscriptions and gifts display
- Twitch raid notification in chat
- Twitch announcements in chat
- Dashboard with showing viewers (if channel is live) / followers / subscribers (if twitch token belongs to broadcaster of chat)
- Removing message
- Fade out of message
- Anonymous connecting to chat via IRC (not all features allowed)
- Russian translation
- Blurring out sensitive info in link builder
- To see logs in Ctrl+Shift+I just add `&debug=1` to link of link builder or chat frame

## TODO
- YouTube stream chat
- BetterTTV emotes

## Special thanks <3
- library [HumanizeDuration.js](https://github.com/EvanHahn/HumanizeDuration.js) by [EvanHahn](https://github.com/EvanHahn), used for displaying access token expiration date
- library [LocalData](https://github.com/DVLP/localStorageDB) by [DVLP](https://github.com/DVLP), used for accessing indexedDB with localStorage-like access