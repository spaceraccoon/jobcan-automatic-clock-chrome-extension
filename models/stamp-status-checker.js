'use strict';

var StampStatusChecker = function (jobcan_code) {

	this.url = 'https://ssl.jobcan.jp/m/work/accessrecord?_m=adit&code=' + jobcan_code;

};


StampStatusChecker.prototype.fetchStartDate = function (callback) {

	var self = this;

	jQuery.ajax({
		url: self.url,
		timeout: 5000,
		success: function (data, status) {
			var last_stamp_status = self._parseLastStampStatus(data);
			if (last_stamp_status == null) {
				callback('Could not get your status');
			} else if (last_stamp_status.text == '入室' || last_stamp_status.text == 'Clock-in') {
				callback(null, last_stamp_status.date);
			} else {
				callback(null, null);
			}
		},
		error: function (req, status, err) {
			callback(err, null);
		}
	});

};


StampStatusChecker.prototype._parseLastStampStatus = function(html) {

	if (html.match(/認証エラー/)) return null;

	var $page = $($.parseHTML(html, document, false));

	var $tables = $page.find('table');
	var $adits = $($tables[$tables.length - 1]).find('tr');

	if ($adits.length == 0) {
		return null;
	}
	
	// Loop until valid status, accounting for revisions
	var i = 1;
	var status_text = '-';
	while (status_text == '-') {
		var $item = $($adits[$adits.length - i]);
		var $columns = $item.find('td');
		status_text = $($columns[0]).text().replace(new RegExp('[\f\n\r\t\v ]', 'g'), '');
		i++;
	}
	
	// Get a date
	var start_date = null, now = new Date();
	var status_time_str = $($columns[2]).text().replace(new RegExp('[\f\n\r\t\v ]', 'g'), '');
	if (status_time_str.match(/(\d+):(\d+)/)) {
		start_date = new Date();
		var h = parseInt(RegExp.$1, 10), m = parseInt(RegExp.$2, 10);
		if (24 <= h) {
			start_date.setHours(h-24);
			start_date.setMinutes(m);
			start_date.setSeconds(0);
		} else {
			if (now.getHours() < h) {
				start_date.setDate(start_date.getDate() - 1);
			}
			start_date.setHours(h);
			start_date.setMinutes(m);
			start_date.setSeconds(0);
		}
	}
	
	// Return
	return {
		text: status_text,
		date: start_date
	};

};
