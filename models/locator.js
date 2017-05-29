var Locator = function () {
	this.location = null;
};

/**
 * Fetch the groups (offices) from JobCan
 * @param  {Function} callback - function (err, groups)
 */
Locator.prototype.fetchLocation = function (callback) {

	var self = this;

	navigator.geolocation.getCurrentPosition(function (pos) { // Successful
		self.location = {
			lat: pos.coords.latitude,
			lng: pos.coords.longitude
		};
		callback(null, self.location);
	}, function (err) { // Failed
		self.location = {};
		callback(err, null);
	}, {
		timeout: 10000
	});
};