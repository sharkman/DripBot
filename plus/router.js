$(document).ready(function() {
	var appWindow = document.getElementById("app").contentWindow;

	$(window).on('message', function(e) {
		e = e.originalEvent;
		if(e.data.func) {
			var ret = chrome.extension.getBackgroundPage()[e.data.func].apply(e.data.thisObject || this, e.data.args);

			if(e.data.callback) {
				appWindow.postMessage({callback: e.data.callback, ret: ret}, "*")
			}
		}
	});
});
