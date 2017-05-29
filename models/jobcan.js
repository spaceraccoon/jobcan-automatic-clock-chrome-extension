var Jobcan = function () {
	this.url = 'https://ssl.jobcan.jp/login/client/try';
};

Jobcan.prototype.auth = function (company_id, group_manager_id, password, callback) {

	var self = this;

	jQuery.ajax({
		url: self.url,
		method: 'POST',
		timeout: 5000,
		data: {
			client_login_id: company_id,
			client_manager_login_id: group_manager_id,
			client_login_password: password,
			url: '/client',
			login_type: 2
		},
		// success: function (data, data_type) {

		// 	var parsed_data = self._parseAccessRecordPage(data);
		// 	console.log('fetchGroups', parsed_data.groups);
		// 	callback(null, parsed_data.groups);

		// },
		// error: function (req, status, err) {

		// 	callback(err, null);

		// }
	});
	// request.post({
	// 	url: self.BASE_URL + '/login/client/try',
	// 	formData: {
	// 		client_login_id: company_id,
	// 		client_manager_login_id: group_manager_id,
	// 		client_login_password: password,
	// 		url: '/client',
	// 		login_type: 2
	// 	},
	// 	followRedirect: false,
	// 	headers: self.defaultHttpHeaders,
	// 	jar: true
	// 	});
};
