$dripBot = (function($) {

	var version = '0.1';


	var showPowerup = function(powerup, prefix) {
		console.log(prefix + powerup.name + " " + powerup.currentBps / powerup.currentPrice + " bps per byte (" + powerup.currentBps + " bps currently)");
	}
	var showBangForBuck = function () {
		getUpgradesByBPS().forEach(function (powerup) {
			showPowerup(powerup);
		})
	}

	var showNextBuy = function() {
		showPowerup(getUpgradesByBPS()[0], "Next purchase: ");
	}

	var getUpgradesByBPS = function() {
		return localStats.powerUps.slice(0).sort(function(a,b) { return a.currentPrice/a.currentBps - b.currentPrice/b.currentBps; });
	}

	var buyPowerup = function(name) {
		$(powerups[name]).click();
	}

	var autoBuyTopThing = function() {
		var topPowerup = getUpgradesByBPS()[0]; 
		if (topPowerup.available) { 
			buyPowerup(topPowerup.name);
			showNextBuy();
		} else {
			if(getCapacity() < topPowerup.currentPrice) {
				if((getBytes() + getCapacity()) > topPowerup.currentPrice || atMaxBytes()) {
					drip();
				}
			}
		}
	}

	var powerups = {};
	var i = 1;
	localStats.powerUps.forEach(function(pu) { powerups[pu.name] = '#pu' + i++; });
	
	var timeOfChange = 0;
	var protectLead = function() { 
		var leaderName = $('div#leaderBoard table tbody').children('tr').first().children('td').eq(1).text();
		if (leaderName != networkUser.userName) {
			if (protectLeadPid == -1) {
				timeOfChange = $.now();
				console.log("As of " + $.now() + " there is one fairer in the land... it is " + leaderName);
				$('#btn-addGlobalMem').click();
				protectLeadPid = setInterval( function() { $('#btn-addGlobalMem').click()}, 9500);
			}

		} else {
			if (protectLeadPid != -1) {
				var diffTime = $.time;
				console.log("as of " + $.now() + " you are the fairest of them all (it took " + diffTime + " to recover)");
				clearInterval(protectLeadPid);
				protectLeadPid = -1;
			}
		}
	}

	var protectLeadStart = function() {
		protectLeadPid = setInterval( function() { protectLead() }, 1000);
	}

	var clickButton = $('a#btn-addMem');
	var clickCup = function() {
		clickButton.click();
	}

	var dripButton = $('button#btn-addGlobalMem');
	var drip = function() {
		dripButton.click();
	}

	var getBytes = function() {
		return localStats.byteCount;
	}

	var getCapacity = function() {
		return localStats.memoryCapacity;
	}

	var atMaxBytes = function() {
		return getBytes() == getCapacity();
	}

	var buyUpgrade = function(num) {
		// Not thread safe!  If someone else uses the bytes we'll never know.
		var upgrade = $('#upg' + num);
		var price = parseInt(upgrade.children('.upgprice').first().text().split(' ')[0]);
		if(upgrade && getBytes() >= price) {
			upgrade.click();
			return true;
		} else {
			return false;
		}
	}

	var boughtOthers = false;
	var boughtLeaderboard = false;
	var traverseStory = function() {

		if(story.state == 6) {
			drip();
		}

		if(story.state == 9) {
			buyPowerup('Cursor');
		}

		if(story.state == 11) {
			$('#upg1').click();
		}

		if(story.state == 12) {
			if(! boughtOthers) {
				if(buyUpgrade(1)) {
					boughtOthers = true;
					$('input.vex-dialog-button-primary').click();
				}

			} else if(! boughtLeaderboard) {
				if(buyUpgrade(1)) {
					boughtLeaderboard = true;
				}
			} else {
				clearInterval(storyPid);
				autoBuyTopThingPid = setInterval(function() { autoBuyTopThing(); }, 500);
				console.log("Please sign in to continue.");
			}
		}

		if(story.state != 12 && atMaxBytes()) {
			drip();
		}
	}

	var stop = function() {
		clearInterval(autoBuyTopThingPid);
		clearInterval(storyPid);
		clearInterval(clickerPid);
	}

	var init = function() {
		document.hasFocus = function() { return true; };
		AnonymousUserManager.canDrip = function() { return true; };
		clickCup();
		setTimeout(function() { start(); }, 500);
	}

	var restart = function() {
		init();
	}

	var storyPid = -1;
	var clickerPid = -1;
	var autoBuyTopThingPid = -1;
	function start() {
		console.log('Starting DripBot v' + version + '!');
		if (story.state != 0) {
			console.log("Starting story.");
			storyPid = setInterval(function() { traverseStory(); }, 100);
		} else {
			console.log("Resuming.")
			autoBuyTopThingPid = setInterval(function() { autoBuyTopThing(); }, 500);
		}
		clickerPid = setInterval(function() { clickCup(); }, 30);
	}

	return {
		powerups: powerups,
		showBangForBuck: showBangForBuck,
		buyPowerup: buyPowerup,
		buyUpgrade: buyUpgrade,
		autoBuyTopThing: autoBuyTopThing,
		protectLeadPid: -1,
		protectLead: protectLead,
		protectLeadStart: protectLeadStart,
		protectLeadPid: -1,
		traverseStory: traverseStory,
		click: clickCup,
		drip: drip,
		getBytes: getBytes,
		getCapacity: getCapacity,
		atMaxBytes: atMaxBytes,
		stop: stop,
		init: init,
		restart: restart,
		start: start
	};
}($));
