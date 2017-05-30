/**
 * Script for pages/popup.html
 */

'use strict';

// Declaration for allow the global objects in ESLint
/*global chrome, Stamper, StampStatusChecker*/


$(function() {

	// Loading flag
	var isLoading = true;

	// Stamper instance
	var stamper = null;

	// Get a location
	var location = null;

	/**
	 * Initialize
	 */
	var init = function () {

		// isLoading = false;

		chrome.storage.sync.get(function(options) {
			var code = options.companyId || null;
			
			// Initialize the checker
			var status_checker = new StampStatusChecker(code);

			// Fetch the current working status
			status_checker.fetchStartDate(function (err, start_date) {
				if (err) {
					$('#notice').html('<a href="https://ssl.jobcan.jp/login/pc-employee/" id="errBtn" class="btn btn-primary btn-lg btn-block" target="_blank">ログインしてください');
					isLoading = true;
					chrome.runtime.sendMessage({
						evt: 'LOGGED_OUT'
					}, function(response) {
						console.log(response.result);
					});
					return;					
				}
				if (start_date != null) {
					$('#submitBtn').val('打刻 (退室)');
					$('#submitBtn').removeClass('btn-primary');
					$('#submitBtn').addClass('btn-danger');
				} else {
					$('#submitBtn').val('打刻 (入室)');
					$('#submitBtn').removeClass('btn-danger');
					$('#submitBtn').addClass('btn-primary');
				}
			});
			

			if (code == null) {
				$('#notice').html('で設定を完了して下さい<a href="options.html" id="errBtn" class="btn btn-primary btn-lg btn-block" target="_blank">オプションページ</a>');
				return;
			}

			isLoading = false;

			// Get a current location
			var currLocation = null;
			var locator = new Locator();
			locator.fetchLocation(function (err, fetched_location) {
				if (err) {
					console.log('Failed to get location.');
					currLocation = {};
					$('#currentLocation').html('現在地を取得できません');
				} else {
					currLocation = fetched_location;
					var lat_str = (Math.floor(currLocation.lat * 1000000) / 1000000);
					var lng_str = (Math.floor(currLocation.lng * 1000000) / 1000000);
					$('#currentLocation').html(lat_str + ', ' + lng_str);
				}
			});
			
			// Initialize an instance of Stamper
			stamper = new Stamper(code);

			// Fetch the groups (offices)
			$('#group').empty();
			stamper.fetchGroups(function (err, groups) {

				for (var group_id in groups) {

					var $opt = $('<option/>');
					$opt.val(group_id);
					$opt.text(groups[group_id]);
					$('#group').append($opt);

				}

			});

			// Start a timer for choose a group by the current location
			var timer = setInterval(function () {

				if (location == null || location.lat == null || location.lng == null || $('#group').children().length == 0) {
					return;
				}

				clearInterval(timer);
				chooseGroupByLocation(location.lat, location.lng);

			}, 100);


		});

	};


	/**
	 * Choose a group (office) by the current location
	 */
	var chooseGroupByLocation = function (lat, lng) {

		var location_distances = {};

		chrome.storage.sync.get('storedLocations', function (saved_value) {

			var stored_locations = [];
			if (saved_value != null && saved_value.storedLocations != null) {
				stored_locations = saved_value.storedLocations;
			}

			if (stored_locations.length == 0) {
				return;
			}

			// Calculate distance from current location
			for (var i = 0, l = stored_locations.length; i < l; i++) {
				var loc = stored_locations[i];

				var a = lat - loc.lat;
				var b = lng - loc.lng;
				loc.distance = Math.sqrt(Math.pow(a,2) + Math.pow(b,2));
			}

			// Choose a most near location
			stored_locations.sort(function(a, b) {
				return a.distance > b.distance ? 1 : -1;
			});

			var group_id = stored_locations[0].groupId;

			// Choose the group from select box
			console.log('chooseGroupByLocation - Choosed Group ' + group_id);
			var $groups = $('#group option');
			$groups.each(function () {

				if ($(this).val() == group_id) {
					$(this).prop('selected', true);
				} else {
					$(this).prop('selected', false);
				}

			});

			chrome.storage.sync.set({
				groupId: group_id,
			}, function() {
				console.log('Saved group ID.');
			});
		});
	};


	/**
	 * Send a stamp
	 */
	var sendStamp = function() {

		var group_id = parseInt($('#group').val());

		$('#submitBtn').prop('disabled', true);
		$('#submitBtn').val('Sending...');
		var $alert = $('#alert');
		$alert.html('');
		$alert.removeClass('alert alert-success');
		$alert.removeClass('alert alert-danger');

		// Check a option
		if ($('#remGroupWithLocation').is(':checked') && location.lat != null) {

			// Store this group with this location
			chrome.storage.sync.get('storedLocations', function (saved_value) {

				var stored_locations = [];
				if (saved_value != null && saved_value.storedLocations != null) {
					stored_locations = saved_value.storedLocations;
				}

				stored_locations.push({
					lat: location.lat,
					lng: location.lng,
					groupId: group_id
				});

				chrome.storage.sync.set({
					storedLocations: stored_locations
				}, function() {
					return;
				});

			});
		}

		// Send a stamp
		stamper.sendStamp(group_id, location.lat, location.lng, $('#note').val(), function (err) {

			$('#submitBtn').prop('disabled', false);

			if (err) {
				// Solution from StackOverflow to strip HTML tags
				$('#submitBtn').val('再送信');
				var html = err.toString();
				var div = document.createElement("div");
				div.innerHTML = html;
				var text = div.textContent || div.innerText || "";
				$alert.addClass('alert alert-danger');
				$alert.html('エラー! ' + text);
				return;
			}

 			$('#submitBtn').val('打刻しました');

			// Notify to background.js
			window.setTimeout(function () {

				chrome.runtime.sendMessage({
					evt: 'ON_STAMPED'
				}, function(response) {

				});

			}, 1000);
			
			// Reload
			window.setTimeout(function () {

				$('#submitBtn').prop('disabled', false);
				init();

			}, 3000);

		});

	};


	// ----

	// Initialize
	init();

	// Set a timer for update the current time
	setInterval(function () {

		var now = new Date();
		var str = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ':' + ('0' + now.getSeconds()).slice(-2);
		$('#currentTime').html(str);

		if (isLoading) {
			$('#notice').show();
			$('#stampForm').hide();
		} else {
			$('#notice').hide();
			$('#stampForm').show();
		}

	}, 100);

	// Set an event handler
	$('#stampForm').submit(function () {

		sendStamp();
		return false;

	});

});
