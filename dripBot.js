$dripBot = (function($, $dripBot, isPro) {

	if($dripBot instanceof Object) {
		console.log("Refusing to run two dripBots (this could have unintended side effects).  Please refresh to update.");
		return $dripBot;
	}

	var version = '1.1',
	isDripBotPro = isPro,
	stage1Pid = -1,
	stage2Pid = -1,
	stage3Pid = -1,
	canBuy = true,
	errorCheckPid = -1,
	errorAlerted = false,
	signupAlerted = false,
	stage = '',
	started = false,
	clicking = false,
	status = 'Running',
	stopColor = '#e9656d',
	startColor = '#47a447',
	clickerPid = -1,
	clickInterval = 500,
	BPSThreshold = 7 * 1000 * 1000,
	powerups = {},
	timeOfLeaderChange = 0,
	currentLeader = '',
	benevolentLeader = false,
	showPops = true,
	MINUTE = 60 * 1000,
	topThing = null;

	function Rc4Random(seed) {
		var keySchedule = [];
		var keySchedule_i = 0;
		var keySchedule_j = 0;
		
		function init(seed) {
			for (var i = 0; i < 256; i++)
				keySchedule[i] = i;
			
			var j = 0;
			for (var i = 0; i < 256; i++)
			{
				j = (j + keySchedule[i] + seed.charCodeAt(i % seed.length)) % 256;
				
				var t = keySchedule[i];
				keySchedule[i] = keySchedule[j];
				keySchedule[j] = t;
			}
		}
		init(seed);
		
		function getRandomByte() {
			keySchedule_i = (keySchedule_i + 1) % 256;
			keySchedule_j = (keySchedule_j + keySchedule[keySchedule_i]) % 256;
			
			var t = keySchedule[keySchedule_i];
			keySchedule[keySchedule_i] = keySchedule[keySchedule_j];
			keySchedule[keySchedule_j] = t;
			
			return keySchedule[(keySchedule[keySchedule_i] + keySchedule[keySchedule_j]) % 256];
		}
		
		this.getRandomNumber = function() {
			var number = 0;
			var multiplier = 1;
			for (var i = 0; i < 8; i++) {
				number += getRandomByte() * multiplier;
				multiplier *= 256;
			}
			return number / 18446744073709551616;
		}
	}
	var rc4Rand = new Rc4Random((new Date()).toString());

	var displayBox = '<div id="dripbot"><img id="dripbot-logo" src="https://raw.github.com/apottere/DripBot/master/dripico.png" /><h3 id="dripbot-title"></h3><button id="dripbot-toggle" class="btn" href="#" onclick=""></button><ul><li id="next-purchase"><p>Next Purchase: </p></li><li id="click-interval"><p></p><button id="dripbot-click-toggle" class="btn" href="#" onclick=""></button></li></ul></div>';

	var clickButton = $('a#btn-addMem'),
	dripButton = $('button#btn-addGlobalMem'),
	modalButton = 'input.vex-dialog-button-primary';

	var checkForError = function() {
		if(!signupAlerted && $('div#signupDlg').is(':visible')) {
			signupAlerted = true;
			alert("Please sign in to continue playing.  After the page is reloaded, make sure to start DripBot again.");
		}
		if(!errorAlerted && $('div#networkError').is(':visible')) {
			if(isDripBotPro) {
				location.reload();
			} else {
				errorAlerted = true;
				alert("DripBot has detected that the game errored (way to go, dripstat).  Please refresh your browser and re-run DripBot.");
			}
		}
	}

	var updateTitleText = function() {
		$('#dripbot-title').text('DripBot v' + version + (isDripBotPro ? ' Pro' : '') + ', Stage ' + stage + ' (Status: ' + status + ')')
	}

	var toggleClickButton = function() {
		toggleButton(clicking, $('#dripbot-click-toggle'), 'stopClicking()', 'startClicking()');
	}

	var toggleButton = function(started, button, ftrue, ffalse) {
		var color;
		if(started) {
			color = stopColor;
			button.text('Stop');
			button.attr("onclick", "$dripBot." + ftrue + "; return false;");
		} else {
			color = startColor;
			button.text('Start');
			button.attr("onclick", "$dripBot." + ffalse + "; return false");
		}

		button.css({
			"background-color": color
		});
	}

	var toggleStopButton = function(started) {
		toggleButton(started, $('#dripbot-toggle'), "stop()", "start()");
	}

	var updateNextPurchase = function(purchase) {
		str = '';
		if(purchase.isUpgrade) {
			str += '(Upgrade) ';
		}
		str += purchase.item.name;
		$('#next-purchase p').text('Next Purchase: ' + str);
	}

	var updateClickInterval = function() {
		$('#click-interval p').text("Clicking every: " + clickInterval + 'ms');
	}

	function OTB(o, upgrade) {
		if(upgrade) {
			this.isUpgrade = true;
			this.item = o;
			if(o.powerup) {
				if(o.powerup.name == 'Cursor') {
					this.bps = o.powerup.totalBps * 0.1 + getClickingBps() * 0.1;
				} else {
					this.bps = o.powerup.totalBps * 0.1;
				}
			}
			this.realPrice = o.price;
			this.price = o.price;
		} else {
			this.isUpgrade = false;
			this.bps = o.currentBps;
			this.item = o;
			this.realPrice = o.currentPrice;
			this.price = o.currentPrice;
		}
		if(getCapacity() < this.realPrice) {
			this.price = (this.realPrice - getCapacity()) * 2 + getCapacity();
		}

		if(! this.item.available) {
			this.timeToPurchase = (this.price - localStats.byteCount) / localStats.bps;
		} else {
			this.timeToPurchase = 0;
		}
	}

	var buyPowerup = function(name) {
		$(powerups[name]).click();
	}

	var getOTBList = function() {
		var powerupsAndUpgrades = []
		localStats.powerUps.slice(0).forEach(function(e) {
			powerupsAndUpgrades.push(new OTB(e, false));
			if(e.upgrades.length) {
				e.upgrades.forEach(function(u) {
					if((!u._purchased) && u._unlocked) {
						powerupsAndUpgrades.push(new OTB(u, true));
					}
				});
			}
		});
		return powerupsAndUpgrades;
	}

	var sortOTBList = function(otbList) {
		return otbList.sort(function(a,b) {
			var sign = 1,
			shorter,
			longer,
			delta;
			if(b.timeToPurchase >= a.timeToPurchase) {
				shorter = a;
				longer = b;
				sign = 1;
			} else {
				shorter = b;
				longer = a;
				sign = -1;
			}
			var delta = longer.timeToPurchase - shorter.timeToPurchase;
			var newLongerPrice = longer.price + shorter.bps * delta;
			return (shorter.price / shorter.bps - newLongerPrice / longer.bps) * sign; // Adjust based on which was shorter.
		});
	}

	var getNewTopThing = function() {
		topThing = null;
		localStats.specialUpgrades.forEach(function(u) {
			if(!u._purchased && u.available) {
				topThing = new OTB(u, true);
			}
		});
		if(topThing == null) {
			topThing = sortOTBList(getOTBList())[0];
		}
		updateNextPurchase(topThing);
		console.log("Next purchase" + (topThing.isUpgrade ? " (upgrade)" : "") + ": " + topThing.item.name);
	}

	var i = 1;
	localStats.powerUps.forEach(function(pu) { powerups[pu.name] = '#pu' + i++; });

	var getLeader = function() {
		return $('div#leaderBoard table tbody').children('tr').first().children('td').eq(1).text();
	}
	
	var getClickingBps = function() {
		return CoffeeCup.calcBytesPerClick() * 20;
	}

	var clickCup = function() {
		clickButton.click();
	}

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

	var getBPS = function() {
		return localStats.bps;
	}

	var atBPSCap = function() {
		return getBPS() >= BPSThreshold;
	}

	var getMyName = function() {
		return networkUser.userName;
	}

	var getSortedUpgradeList = function() {
		var upgrades = [];
		localStats.powerUps.forEach(function(e) {
			e.upgrades.forEach(function(u) {
				if(u._unlocked && ! u._purchased) {
					upgrades.push(u);
				}
			});
		});
		localStats.specialUpgrades.forEach(function(u) {
			if(!u._purchased) {
				upgrades.push(u);
			}
		});

		upgrades.sort(function(a,b) {
			return a.price - b.price;
		});
		return upgrades;
	}

	var buyUpgrade = function(name) {
		// Not thread safe!  If someone else uses the bytes we'll never know.
		var i = 1;
		getSortedUpgradeList().forEach(function(u) {
			if(u.name == name) {
				var upgrade = $('#upg' + i);
				upgrade.click();

				for(var n=0; n<localStats.specialUpgrades.length; n++) {
					if(localStats.specialUpgrades[n].name == name) {
						$(modalButton).click();
						break;
					}
				}
				return true;
			}
			i++;
		});
		return false;
	}

	var setBPSThreshold = function(num) {
		if(num && num > 0) {
			BPSThreshold = num * 1000 * 1000;
		}
		return BPSThreshold;
	}

	var stopClicking = function() {
		clicking = false;
		clearTimeout(clickerPid);
		clickerPid = -1;
		toggleClickButton();
	}

	var startClicking = function() {
		if(!clicking && clickerPid == -1) {
			clicking = true;
			clickInterval = getNewClickTimeout();
			clickerPid = setTimeout(function() { smartChainClick(); }, clickInterval);
			toggleClickButton();
		}
	}

	var setBenevolentLeader = function(bool) {
		benevolentLeader = bool || false;
		return benevolentLeader;
	}

	var setShowPops = function(bool) {
		showPops = bool || false;
		return showPops;
	}

	var stage1 = function() {
		if(story.state == 6) {
			drip();
		}

		if(story.state == 9) {
			buyPowerup('Cursor');
		}

		if(story.state == 11) {
			buyUpgrade('Enhanced Precision');
		}

		if(story.state == 12) {
			stage = '2';
			console.log("Proceeding to stage 2 (Purchase).");
			clearInterval(stage1Pid);
			stage2Pid = setInterval(function() { stage2(); }, 500);
			updateTitleText();
			return;
		}

		if(story.state != 12 && atMaxBytes()) {
			drip();
		}
	}

	var stage2 = function() {
		if(atBPSCap()) {
			stage = '3';
			console.log("Proceeding to stage 3 (Win).");
			topThing = null;
			clearInterval(stage2Pid);
			stage3Pid = setInterval(function() { stage3(); }, 1000);
			updateTitleText();
			return;
		}

		if(topThing == null) {
			getNewTopThing();
		}

		if(getBytes() >= topThing.realPrice) {
			if(canBuy) {
				if(topThing.isUpgrade) {
					buyUpgrade(topThing.item.name);
				} else {
					buyPowerup(topThing.item.name);
				}
				canBuy = false;
				setTimeout(function() { canBuy = true; }, 800);

				getNewTopThing();
			}
		} else {
			if(getCapacity() < topThing.realPrice) {
				if((getBytes() + getCapacity()) >= topThing.realPrice || atMaxBytes()) {
					drip();
				}
			}
        }
	}

	var stage3 = function() { 
		if(!atBPSCap()) {
			stage = '2';
			console.log("Reverting to stage 2 (Purchase).");
			currentLeader = null;
			timeOfLeaderChange = null;
			clearInterval(stage3Pid);
			stage2Pid = setInterval(function() { stage2(); }, 500);
			updateTitleText();
			return;
		}

		var leaderName = getLeader();
		if(!currentLeader) {
			currentLeader = getMyName();
		}

		if (leaderName != getMyName()) {
			if(currentLeader == getMyName()) {
				currentLeader = leaderName;
				timeOfLeaderChange = $.now();
				console.log("As of " + timeOfLeaderChange + " there is one fairer in the land... it is '" + leaderName + "'.");

			} else if(leaderName != currentLeader) {
				console.log("Leader changed from '" + currentLeader + "' to '" + leaderName + "'.");
				currentLeader = leaderName;
			}
			drip();

		} else {
			if (currentLeader != leaderName) {
				currentLeader = leaderName;
				var diffTime = $.time;
				console.log("As of " + $.now() + " you are the fairest of them all (it took " + diffTime + " to recover).");
			}

			if(!benevolentLeader) {
				drip();
			}
		}
	}

	var getNewClickTimeout = function() {
		var temp = rc4Rand.getRandomNumber();
		if(temp >= 0.98) {
			temp = temp * 3 * MINUTE + 4 * MINUTE;
		} else {
			temp =  temp * 500 + 500;
		}

		return Math.floor(temp);
	}

	var smartChainClick = function() {
		if(clicking) {
			clickInterval = getNewClickTimeout();
			updateClickInterval();
		}

		if(clicking) {
			clickerPid = setTimeout(function() { smartChainClick(); }, clickInterval);
			clickCup();
		}
	}

	var stop = function() {
		if(!started) {
			return;
		} else {
			started = false;
			status = 'Stopped';
		}
		console.log('Stopping DripBot.');
		clearInterval(stage1Pid);
		clearInterval(stage2Pid);
		clearInterval(stage3Pid);
		clearInterval(clickerPid);
		clearInterval(errorCheckPid);
		stage1Pid = -1;
		stage2Pid = -1;
		stage3Pid = -1;
		clickerPid = -1;
		clicking = false;
		toggleClickButton();
		errorCheckPid = -1;
		updateTitleText();
		toggleStopButton(false);
	}

	var start = function() {
		if(started) {
			return;
		} else {
			started = true;
			status = 'Running';
		}
		console.log('Starting DripBot v' + version + '!');
		if (story.inProgress) {
			console.log("Starting or resuming story.");
			stage = '1';
			stage1Pid = setInterval(function() { stage1(); }, 100);
		} else if(!atBPSCap()) {
			stage = '2';
			console.log("Resuming stage 2 (Purchase).");
			stage2Pid = setInterval(function() { stage2(); }, 500);
		} else {
			stage = '3';
			console.log("Resuming stage 3 (Win).");
			stage3Pid = setInterval(function() { stage3(); }, 1000);
		}
		updateTitleText();
		toggleStopButton(true);
		errorCheckPid = setInterval(function() { checkForError(); }, 2000);
	}

	var restart = function() {
		stop();
		start();
	}

	var init = function() {
		document.hasFocus = function() { return true; };
		AnonymousUserManager.canDrip = function() { return true; };
		popManager.oldNewPop = popManager.newPop;
		popManager.newPop = function(e, t, a) {
			if(showPops || (e.indexOf('addMem') == -1 && e != 'chartContainer')) {
				popManager.oldNewPop(e,t,a);
			}
		}
		$('div#middleColumn').append(displayBox);
		$.getScript('https://raw.github.com/apottere/DripBot/master/dripBot-css.js');
		updateClickInterval();
		toggleClickButton();
		clickCup();
		setTimeout(function() { start(); }, 500);
	}

	init();

	return {
		setBPSThreshold: setBPSThreshold,
		setBenevolentLeader: setBenevolentLeader,
		setShowPops: setShowPops,

		startClicking: startClicking,
		stopClicking: stopClicking,

		stop: stop,
		start: start,
		restart: restart
	};
}(
	$,
	(typeof($dripBot) !== 'undefined' ? $dripBot : null),
	(typeof(window.dripBotPro) !== 'undefined' ? window.dripBotPro : false)
));
