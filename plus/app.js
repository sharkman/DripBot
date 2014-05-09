function AppViewModel() {

	this.handleMessage = function(e) {
		if(e.data.callback) {
			this[e.data.callback].apply(this, [e.data.ret]);
		}
	}

	this.callBackground = function(func, args, callback) {
		window.parent.postMessage({func: func, args: args, callback: callback}, "*");
	}

	this.jvmName = ko.observable('name');
	this.jvms = ko.observable([]);
	this.userInfo = ko.observable({});

	this.createNewJvm = function() {
		var name = this.jvmName();
		this.jvmName('');
		this.callBackground('test', [name], 'refreshGui');
	}

	this.refreshGui = function() {
		this.callBackground('getUserInfo', [], 'displayUserInfo');
		this.callBackground('listJvms', [], 'displayJvms');
	}

	this.displayUserInfo = function(info) {
		if(info) {
			this.userInfo(info);
		}
	}

	this.displayJvms = function(jvms) {
		this.jvms(jvms);
	}

	this.getLoggedInUser = function(userInfo) {
	}
}

var app = new AppViewModel();

$(window).on('message', function(e) {
	app.handleMessage(e.originalEvent);
});

$(document).ready(function() {
	ko.applyBindings(app);
	app.refreshGui();
});