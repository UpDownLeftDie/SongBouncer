# SongBouncer

_Bouncer [ˈbounsər] NOUN:
a person employed by a nightclub or similar establishment to prevent troublemakers from entering or to eject them from the premises._

---

Initially created to handle song _suggestions_ for Beat Saber as away for people to request songs that the streamer can device to skip if they so wanted.
Has some advanced features like Inactive Queue that "saves" peoples requests if they leave chat moving those who stick around ahead in the list and the person who left doesn't miss their request!

Benefits of being a separate and standalone app makes it agnostic to what game/program you're using (Beat Saber, Rock Band, etc) and you can run it on another computer which protects it from a system crash or other issues.

## Features

- Supports "plaintext" request
- Supports Beat Saver requests `!sr <key or search>`
  - `!bsr` is an alias
- Active and Inactive queues that auto-detect viewers status
  - Viewers wont miss their song if they step away!
- Followers only mode
- Subscribers only mode
- Mod only commands
- Times message in chat
- Modular

## TODO

- Custom song list requests
- JustDance requests
- RockBand requests
- Save queue to file on quit/crash
- Request History/Stats
- Song Blocklist
- User Blocklist
- Dynamically change modes based on game set on Twitch
- [Electron](https://www.electronjs.org/) + ReactJS UI
