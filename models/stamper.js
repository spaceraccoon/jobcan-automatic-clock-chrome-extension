'use strict';

var Stamper = function (jobcan_code) {

	this.jobCanCode = jobcan_code;

	this.urlAccessRecord = 'https://ssl.jobcan.jp/m/work/accessrecord?_m=adit&code=' + jobcan_code;
	this.urlStampSave = 'https://ssl.jobcan.jp/m/work/stamp-save-smartphone/';

};


/**
 * Fetch the groups (offices) from JobCan
 * @param  {Function} callback - function (err, groups)
 */
Stamper.prototype.fetchGroups = function (callback) {

	var self = this;

	jQuery.ajax({
		url: self.urlAccessRecord,
		timeout: 5000,
		success: function (data, data_type) {

			var parsed_data = self._parseAccessRecordPage(data);
			console.log('fetchGroups', parsed_data.groups);
			callback(null, parsed_data.groups);

		},
		error: function (req, status, err) {

			callback(err, null);

		}
	});

};

/**
 * Send a stamp to JobCan
 * @param  {Number} group_id	Group ID
 * @param  {Number} lat			Location latitude
 * @param  {Number} lng		Loocation longitude
 * @param  {String} opt_note	Note text (Optional)
 * @param  {Function} callback	Callback function - (err)
 */
Stamper.prototype.sendStamp = function (group_id, lat, lng, opt_note, callback) {

	var self = this;

	var now = new Date();

	jQuery.ajax({
		type: 'POST',
		url: self.urlStampSave,
		timeout: 5000,
		data: {
			confirm: 'yes',
			lat: lat,
			lon: lng,
			year: now.getFullYear(),
			month: now.getMonth() + 1,
			day: now.getDate(),
			reason: opt_note,
			time: null,
			group_id: group_id,
			position_id: null,
			adit_item: '打刻',
			yakin: null,
			code: self.jobCanCode
		},
		success: function (data, status, xhr) {

			if (data.match(/打刻完了/) || data.match(/Clocking completed/)) {
				// Successful
				callback(null);
				return;
			}

			// Failed
			callback(data);

		},
		error: function (req, status, err) {

			callback(err, null);

		}
	});

};

Stamper.prototype._parseAccessRecordPage = function(html) {

	var $page = $($.parseHTML(html, document, false));

	// Get the groups
	var groups = {};
	var $groups = $page.find('select[name="group_id"] OPTION');
	$groups.each(function (index) {
		var group_id = $(this).val();
		var group_name = $(this).text();
		groups[group_id] = group_name;
	});

	// Return
	return {
		groups: groups
	};

};
