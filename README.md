# Leer's Stream Chat
Stream chat for displaying on browser source in OBS

## Twitch messages displays
- 7TV channel and global emotes
- Twitch channel and global emotes
- Twitch channel and global badges

## How to use?
1. Paste this link in OBS browser source
```
https://theleername.github.io/LeerStreamChat?twitch_login=<twitch_login>&twitch_client_id=<twitch_client_id>&twitch_token=<twitch_token>&lang=<lang>&7tv=<7tv>&size=<size>&indent=<indent>&remove_msg=<remove_msg>&decay=<decay>&decay_duration=<decay_duration>
```
2. Replace placeholders with some parameters in link:

| Parameter                   | Description                                                                                                                       | Example                                 | Required                                                         |
|-----------------------------|-----------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|------------------------------------------------------------------|
| `<twitch_login>`            | Twitch channel name                                                                                                               | `xqc`                                   | Yes                                                              |
| `<twitch_client_id>`        | Client ID of your twitch bot                                                                                                      | `bp6vo2242t6s58epgeck17dabsabu1`        | No (if didnt specified, emotes and badges will be not displayed) |
| `<twitch_token>`            | Access token of your twitch bot                                                                                                   | `sfjhjtvr06al24jp4vnbj8km3njc91`        | No (if didnt specified, emotes and badges will be not displayed) |
| `<lang>`                    | Which language chat will use to print messages, for now only exists `en` and `ru`                                                 | `en`                                    | No (default value: `en`)                                         |
| `<7tv>`                     | If `1`, then chat will display emotes from 7TV                                                                                    | `1`                                     | No (default value: `1`)                                          |
| `<size>`                    | (float) Font size of messages in chat                                                                                             | `16`                                    | No (default value: `16`)                                         |
| `<indent>`                  | Indent size of messages                                                                                                           | `4`                                     | No (default value: `4`)                                          |
| `<remove_msg>`              | If `1`, then message will be removed when it was removed by moderator in actual chat                                              | `1`                                     | No (default value: `1`)                                          |
| `<decay>`                   | (seconds) Specifies how much time message will be seen before disappearing, if `0`, message will stay before going outside screen | `5`                                     | No (default value: `0`)                                          |
| `<decay_duration>`          | (seconds) Specifies how long the disappearing will last                                                                           | `0.5`                                   | No (default value: `0.5`)                                        |
3. If you don't want change some not required parameters, just remove them
- for example `https://theleername.github.io/LeerStreamChat?twitch_login=<twitch_login>&size=20` will be after removing `https://theleername.github.io/LeerStreamChat?twitch_login=<twitch_login>`
4. Now you have the cooliest chat :3

## TODO
- viewer count
- makeChatMessage triggers on reward too
- YouTube stream chat

## Special thanks <3
- library [ComfyJS](https://github.com/instafluff/ComfyJS) by [instafluff](https://github.com/instafluff)
- library [HumanizeDuration.js](https://github.com/EvanHahn/HumanizeDuration.js) by [EvanHahn](https://github.com/EvanHahn)