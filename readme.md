# SongBouncer

_Bouncer [ˈbounsər] NOUN:  
a person employed by a nightclub or similar establishment to prevent troublemakers from entering or to eject them from the premises._

-----------

Initially created to handle song _suggestions_ for Beat Saber as away for people to request songs that the streamer can device to skip if they so wanted.
Has some advanced features like Inactive Queue that "saves" peoples requests if they leave chat moving those who stick around ahead in the list and the perosn who left doesn't miss their request!

Benifits of being a seperate and standalone app makes it agnostic to what game/program you're using (Beat Saber, Rock Band, Twitch Sings, etc) and you can  run it on another computer which protects it from a system crash or other issues.

## Features

* Supports "plaintext" requets
* Supports Beat Saver requests `!bsr <hash>`
* Inactive and Active queue lists that auto detect peopels status
* Followers only mode
* Subscribers only Mode
* Times message in chat

## TODO

* Migrate to TypeScript
* Save queue to file on quit
* Create "modules" to allow plug-n-play for diffrent API's (Move BSR into its own module)
* Delete specific requets from Queue(s)
* Request Histroy
* Song Blacklist
* User Blacklist
* Chat Mods
  