DripBot
=======

Makes dripstat fun again.  Plays the game at <http://dripstat.com/game> optimally and automatically.

Stages
------

1. *Story:* Traverses the story, starting the game from any point.
2. *Purchase:* Builds B/s as fast as possible, optimizing powerup and upgrade purchases with minimal dripping (dripping is waste).  Runs untill a B/s threshold is reached.  The threshold can be changed with `$dripBot.setBPSThreshold(float), where float is the desired threshold in MB/s.  Defaults to 7.
3. *Win:* Attempts to climb to first place by dripping constantly, and optionally stops when achieved.


Usage
-----
Paste the following into your browser's console and press Enter: `$.getScript('https://raw.github.com/apottere/DripBot/master/dripBot.js');`

For more information on browser consoles, see <http://webmasters.stackexchange.com/questions/8525/how-to-open-the-javascript-console-in-different-browsers> (YMMV).

