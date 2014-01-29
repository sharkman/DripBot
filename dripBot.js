$dripBot = (function($) {

	var version = '0.1',
	stage1Pid = -1,
	stage2Pid = -1,
	clickerPid = -1,
	protectLeadPid = -1,
	powerups = {},
	topThing = null;

	var clickButton = $('a#btn-addMem'),
	dripButton = $('button#btn-addGlobalMem'),
	modalButton = 'input.vex-dialog-button-primary';

	function OTB(o, upgrade) {
		if(upgrade) {
			this.isUpgrade = true;
			this.item = o;
			if(o.powerup) {
				this.bps = o.powerup.totalBps * 0.1;
			}
			this.price = o.price;
		} else {
			this.isUpgrade = false;
			this.bps = o.currentBps;
			this.item = o;
			this.price = o.currentPrice;
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
			clearInterval(stage1Pid);
			stage2Pid = setInterval(function() { stage2(); }, 500);
			console.log("Proceeding to stage 2.");
		}

		if(story.state != 12 && atMaxBytes()) {
			drip();
		}
	}

	var stage2 = function() {
		if(localStats.bps >= 7 * 1024 * 1024) {
			console.log("Proceeding to stage 3.");
			clearInterval(stage2Pid);
		}

		if(topThing == null) {
			getNewTopThing();
		}

		if(getBytes() >= topThing.price) {
			if(topThing.isUpgrade) {
				buyUpgrade(topThing.item.name);
			} else {
				buyPowerup(topThing.item.name);
			}

			getNewTopThing();
		} else {
			if(getCapacity() < topThing.price) {
				if((getBytes() + getCapacity()) >= topThing.price || atMaxBytes()) {
					drip();
				}
			}
        }
	}

	var stop = function() {
		clearInterval(stage1Pid);
		clearInterval(stage2Pid);
		clearInterval(clickerPid);
		stage1Pid = -1;
		stage2Pid = -1;
		clickerPid = -1;
	}

	var start = function() {
		console.log('Starting DripBot v' + version + '!');
		if (story.inProgress) {
			console.log("Starting or resuming story.");
			stage1Pid = setInterval(function() { stage1(); }, 100);
		} else {
			console.log("Resuming game.")
			stage2Pid = setInterval(function() { stage2(); }, 500);
		}
		clickerPid = setInterval(function() { clickCup(); }, 30);
	}

	var restart = function() {
		init();
	}

	var init = function() {
		document.hasFocus = function() { return true; };
		AnonymousUserManager.canDrip = function() { return true; };
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

		protectLead: protectLead,
		protectLeadStart: protectLeadStart,

		click: clickCup,
		drip: drip,

		getBytes: getBytes,
		getCapacity: getCapacity,
		atMaxBytes: atMaxBytes,

		stop: stop,
		restart: restart
	};
}($));
