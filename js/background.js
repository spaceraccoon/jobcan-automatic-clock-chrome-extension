/**
 * Background script
 */

var stamper = null;
var UPDATE_INTERVAL = 60000; // 60 sec.

function init() {
	chrome.storage.sync.get(function(options) {
		if (options.companyId == null) {
			chrome.browserAction.setTitle({
				title: 'Jobcan Quick Stamp\n[Error] No options set.'
			});
			chrome.browserAction.setBadgeText({
				text: 'ERR'
			});
			chrome.browserAction.setBadgeBackgroundColor({
				color: '#ff0000'
			});
			return;
		}
		updateBadgeStatus();
		if (options.activateIn) {
			console.log("creating inAlarm");
			var timeToFire = calculateTime(options.inTime);
			var alarmPeriod = 60 * 24; // Minutes / day
    		var alarmInfo = { when: timeToFire, periodInMinutes: alarmPeriod};
    		var inAlarm = chrome.alarms.create('inAlarm', alarmInfo);
		}
		if (options.activateOut) {
			console.log("creating outAlarm");
			var timeToFire = calculateTime(options.outTime);
			var alarmPeriod = 60 * 24; // Minutes / day
    		var alarmInfo = { when: timeToFire, periodInMinutes: alarmPeriod};
    		var outAlarm = chrome.alarms.create('outAlarm', alarmInfo);
		}
	});
	return;
}

function calculateTime(time, sendResponse) {
	var dateToFire = new Date();
	var desiredHour = "0";
	var desiredMinute = "0";
	var timeArray = time.split(":");

	if (timeArray.length != 2) {
		sendResponse({ error: "Invalid time"});
		return;
    }

    desiredHour = timeArray[0];
    desiredMinute = timeArray[1];
    dateToFire.setHours(desiredHour);
    dateToFire.setMinutes(desiredMinute);
    dateToFire.setSeconds(0);

    var timeToFire = dateToFire.getTime();
    if (timeToFire < Date.now()) {
    	console.log("Setting time for tomorrow...");
    	timeToFire += 1000 * 60 * 60 * 24; // Milliseconds / day
    } else {
    	console.log("Setting time for today...");
    }
    console.log("Time to fire: " + timeToFire);

    return timeToFire;
}

function updateBadgeStatus() {
	console.log("Updating badge status...");

	chrome.storage.sync.get(function(options) {
		if (options.companyId == null) {
			return;
		}
		// Update the badge of Chrome's toolbar
		chrome.browserAction.setBadgeText({
			text: ''
		});

		// Initialize the checker
		var status_checker = new StampStatusChecker(options.companyId);

		// Fetch the current working status
		status_checker.fetchStartDate(function (err, start_date) {
			if (err) {
				console.log("Could not get status");
				chrome.browserAction.setTitle({
					title: 'Jobcan Quick Stamp\n[Error] Could not get the status.'
				});
				chrome.browserAction.setBadgeText({
					text: 'ERR'
				});
				chrome.browserAction.setBadgeBackgroundColor({
					color: '#ff0000'
				});
				return;
			}
			console.log("Fetched status");
			// Make a status text
			var badge_color = '#AAAAAA', badge_text = '-', detail_status = 'Free Time';
			if (start_date != null) {
				var now = new Date();
				var past_hours = (now.getTime() - start_date.getTime()) / 1000;
				var past_sec = Math.floor(past_hours % 60); past_hours /= 60;
				var past_minutes = Math.floor(past_hours % 60); past_hours /= 60;
				past_hours = Math.floor(past_hours);

				detail_status = 'Working - ';
				badge_color = '#007cff';

				if (1 <= past_hours) {
					badge_text = past_hours + 'h';
					detail_status += past_hours + ' h ' + past_minutes + ' min';
				} else {
					badge_text = past_minutes + 'm';
					detail_status += (past_hours * 60) + past_minutes + ' min';
				}

				detail_status += ' from ' +
					('0' + start_date.getHours()).slice(-2) + ':' + ('0' + start_date.getMinutes()).slice(-2);
			}

			// Update the title of badge
			chrome.browserAction.setTitle({
				title: 'Jobcan Quick Stamp\n' + detail_status
			});

			// Update the badge of Chrome's toolbar
			chrome.browserAction.setBadgeText({
				text: badge_text
			});

			chrome.browserAction.setBadgeBackgroundColor({
				color: badge_color
			});

		});

	});

	console.log("Updated badge status.");
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.evt == 'OPTIONS_UPDATED') {
		chrome.alarms.clearAll();
		updateBadgeStatus();
		// Set clock in alarm
		chrome.storage.sync.get(function(options) {
			if (options.activateIn) {
				console.log("creating inAlarm");
				var timeToFire = calculateTime(options.inTime, sendResponse);
				var alarmPeriod = 60 * 24; // Minutes / day
	    		var alarmInfo = { when: timeToFire, periodInMinutes: alarmPeriod};
	    		var inAlarm = chrome.alarms.create('inAlarm', alarmInfo);
			}
			if (options.activateOut) {
				console.log("creating outAlarm");
				var timeToFire = calculateTime(options.outTime, sendResponse);
				var alarmPeriod = 60 * 24; // Minutes / day
	    		var alarmInfo = { when: timeToFire, periodInMinutes: alarmPeriod};
	    		var outAlarm = chrome.alarms.create('outAlarm', alarmInfo);
			}
		});
		sendResponse({evt: request.evt, result: 'OKAY'});
	} else if (request.evt == 'ON_STAMPED') {
		updateBadgeStatus();
		sendResponse({evt: request.evt, result: 'OKAY'});
	} else if (request.evt == 'LOGGED_OUT') {
		updateBadgeStatus();
		sendResponse({evt: request.evt, result: 'OKAY'});
	} else {
		return;
	}
});

chrome.alarms.onAlarm.addListener(function(alarm) {
	console.log("Alarmed");
	chrome.storage.sync.get(function(options) {
		if (options.companyId == null) {
			return;
		} else {
			var company_id = options.companyId;
			var group_id = options.groupId;
			stamper = new Stamper(company_id);
			var status_checker = new StampStatusChecker(company_id);
			var currLocation = null;
			var locator = new Locator();
			locator.fetchLocation(function (err, fetched_location) {
				if (err) {
					console.log('Failed to get location.');
					currLocation = {};
				} else {
					currLocation = fetched_location;
				}
			});


			// Fetch the current working status
			status_checker.fetchStartDate(function (err, start_date) {
				if (start_date != null) {
					if (alarm.name == 'outAlarm') {
						stamper.sendStamp(group_id, currLocation.lat, currLocation.lng, '', function (err) {
							if (err) {
								console.log("Error clocking out");
								return;
							}

							// Notify to background.js
							window.setTimeout(function () {
								chrome.runtime.sendMessage({
									evt: 'ON_STAMPED'
								}, function(response) {
									console.log(response.result);
								});
							});
						});
					} else {
						console.log("Already clocked in");
					} 
				} else {
					if (alarm.name == 'inAlarm') {
						stamper.sendStamp(group_id, currLocation.lat, currLocation.lng, '', function (err) {
							if (err) {
								console.log("Error clocking in");
								return;
							}

							// Notify to background.js
							window.setTimeout(function () {
								chrome.runtime.sendMessage({
									evt: 'ON_STAMPED'
								}, function(response) {
									console.log(response.result);
								});
							});
						});
					} else {
						console.log("Already clocked out");
					} 
				}
			});
		}
	});
});

init();
window.setInterval(updateBadgeStatus, UPDATE_INTERVAL);
