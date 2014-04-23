$(document).ready(function() {
	var getJvmName = function() {
		var box = $('#newJvmName');
		var text = box.val();

		box.val('');
		return text;
	};

	$('#test').click(function() {
		chrome.extension.getBackgroundPage().test(getJvmName());
	});
});