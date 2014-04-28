var jvms = [];
var apiKey = null;

var test = function(name) {
	if(!name) {
		return;
	}

	if(!apiKey) {
		$.ajax('https://apmgui.dripstat.com/rest/accountinfo', {
			type: 'GET',
			async: false,
			headers: {
				'Accept': 'application/json'
			},

			success: function(resp) {
				apiKey = resp.licenseKey;
			}
		});
	}

	if(!apiKey) {
		console.log("Not logged in, aborting.");
	}

	var url = 'http://datacollector.dripstat.com/agent/v1/init';
	$.ajax(url, {
		type: 'POST',
		async: false,
		dataType: 'json',

		headers: {
			'X-License-Key': apiKey,
			'X-App-Name': name,
			'Accept': 'application/json',
	        'Content-Type': 'application/json' 
		},

		data: JSON.stringify({
			"cpuCount":1,
			"osVersion":"Mac",
			"host":"None",
			"arch":"i386",
			"javaVendor":"Oracle Corporation",
			"javaVMName":"Java HotSpot(TM) Client VM",
			"appServer":"Unknown",
			"pid":1,
			"heapInitialBytes":16777216,
			"heapMaxBytes":259522560,
			"javaVersion":"1.7.0_45",
			"systemRam":2067872,
			"agentVersion":"1.1.1",
			"jvmArgs":["-javaagent:dripstat\/dripstat.jar"],
			"osName":"Mac",
			"javaVMVersion":"1"
		}),

		success: function(resp) {
			console.log("Pushing new app.");
			jvms.push({
				name: name,
				auth: resp.authtoken
			});

			refreshApps();
		},

		error: function(resp) {
			console.log('Init error:' + JSON.stringify(resp));
		}
	});
};

var listJvms = function() {
	return jvms.slice(0);
}

var refreshApps = function() {
	jvms.forEach(function(jvm) {
		console.log('Pinging ' + jvm.name)
		var url = 'http://datacollector.dripstat.com/agent/v1/data';
		$.ajax(url, {
			type: 'POST',
			async: true,
			dataType: 'json',

			headers: {
				'X-Auth-Token': jvm.auth,
				'Accept': 'application/json',
		        'Content-Type': 'application/json' 
			},

			data: JSON.stringify({
				"metrics":[
					{"Processor.CPU":2.6465028355387523},
					{"Processor.GC":1.1814744801512287},
					{"Memory.HeapCommitted":16318464},
					{"Memory.HeapMax":259522560},
					{"Memory.HeapUsed":4035184},
					{"Threads.daemon":4},
					{"Threads.nonDaemon":1},
					{"ClassCount.loaded":918}
				]
			}),

			success: function(resp) {
				console.log('Success:' + JSON.stringify(resp));
			},

			error: function(resp) {
				console.log('Error:' + JSON.stringify(resp));
			}
		});
	});
};

setInterval(refreshApps, 58 * 1000);