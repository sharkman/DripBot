$dripBot = (function($, $dripBot) {

	if($dripBot instanceof Object) {
		console.log("Refusing to run two dripBots (this could have unintended side effects).  Please refresh to update.");
		return $dripBot;
	}

	var version = '1.0',
	stage1Pid = -1,
	stage2Pid = -1,
	stage3Pid = -1,
	clickerPid = -1,
	clickInterval = 30,
	BPSThreshold = 7 * 1000 * 1000,
	powerups = {},
	timeOfLeaderChange = 0,
	currentLeader = '',
	benevolentLeader = false;
	showPops = false;
	topThing = null;

	var clickButton = $('a#btn-addMem'),
	dripButton = $('button#btn-addGlobalMem'),
	modalButton = 'input.vex-dialog-button-primary';

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

	var setClickInterval = function(num) {
		if(num && num > 0) {
			clickInterval = num;
		}
		if(clickerPid != -1) {
			clearInterval(clickerPid);
			clickerPid = setInterval(function() { clickCup(); }, clickInterval);
		}
		return clickInterval;
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
			console.log("Proceeding to stage 2 (Purchase).");
			clearInterval(stage1Pid);
			stage2Pid = setInterval(function() { stage2(); }, 500);
			return;
		}

		if(story.state != 12 && atMaxBytes()) {
			drip();
		}
	}

	var stage2 = function() {
		if(atBPSCap()) {
			console.log("Proceeding to stage 3 (Win).");
			topThing = null;
			clearInterval(stage2Pid);
			stage3Pid = setInterval(function() { stage3(); }, 500);
			return;
		}

		if(topThing == null) {
			getNewTopThing();
		}

		if(getBytes() >= topThing.realPrice) {
			if(topThing.isUpgrade) {
				buyUpgrade(topThing.item.name);
			} else {
				buyPowerup(topThing.item.name);
			}

			getNewTopThing();
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
			console.log("Reverting to stage 2 (Purchase).");
			currentLeader = null;
			timeOfLeaderChange = null;
			clearInterval(stage3Pid);
			stage2Pid = setInterval(function() { stage2(); }, 500);
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

	var stop = function() {
		clearInterval(stage1Pid);
		clearInterval(stage2Pid);
		clearInterval(stage3Pid);
		clearInterval(clickerPid);
		stage1Pid = -1;
		stage2Pid = -1;
		stage3Pid = -1;
		clickerPid = -1;
	}

	var start = function() {
		console.log('Starting DripBot v' + version + '!');
		if (story.inProgress) {
			console.log("Starting or resuming story.");
			stage1Pid = setInterval(function() { stage1(); }, 100);
		} else if(!atBPSCap()) {
			console.log("Resuming stage 2 (Purchase).");
			stage2Pid = setInterval(function() { stage2(); }, 500);
		} else {
			console.log("Resuming stage 3 (Win).");
			stage3Pid = setInterval(function() { stage3(); }, 500);
		}
		clickerPid = setInterval(function() { clickCup(); }, clickInterval);
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
		clickCup();
		setTimeout(function() { start(); }, 500);
	}


	init();

	return {
		buyPowerup: buyPowerup,
		buyUpgrade: buyUpgrade,

		getSortedUpgradeList: getSortedUpgradeList,
		getOTBList: getOTBList,
		sortOTBList: sortOTBList,

		click: clickCup,
		drip: drip,

		setBPSThreshold: setBPSThreshold,
		setBenevolentLeader: setBenevolentLeader,
		setShowPops: setShowPops,
		setClickInterval: setClickInterval,

		stop: stop,
		restart: restart
	};
}($, $dripBot));
