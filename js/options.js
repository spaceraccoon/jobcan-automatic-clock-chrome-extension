/*
** file: js/options.js
** description: javascript code for html/options.html page
*/

var has_group_id = false;

function init () {
    console.log('function: init_options');

    var company_id = null;
    var group_id = null;

	chrome.storage.sync.get(function(options) {

		// Company ID
		company_id = options.companyId || null;
		$('#company-id').val(company_id);

		// Group ID
		group_id = options.groupId || null;
		if (company_id && group_id) {
			has_group_id = true;
			var stamper = new Stamper(company_id);
			$('#group').empty();
			stamper.fetchGroups(function (err, groups) {
				if (groups) {
					for (var group_id in groups) {
						var $opt = $('<option/>');
						$opt.val(group_id);
						$opt.text(groups[group_id]);
						$('#group').append($opt);
					}
				}
			});
			var $groups = $('#group option');
			$groups.each(function () {
				if ($(this).val() == group_id) {
					$(this).prop('selected', true);
				} else {
					$(this).prop('selected', false);
				}

			});
		} else {
			var $alert = $('#alert');
			$alert.html('');
			$alert.removeClass('alert alert-success');
			$alert.removeClass('alert alert-danger');
			$alert.addClass('alert alert-danger');
			$alert.html('会社IDとグループを記入してください。');
			$('#group').prop('disabled', true);
			$('#save-options-button').prop('disabled', true);
		}

		$('#company-id').val(company_id);
		
		// Time
		var in_time = options.inTime || null;
		$('#in-time').val(in_time);
		if (options.activateIn) {
			$('#activate-in-time').prop("checked", true);
		}
		var out_time = options.outTime || null;
		$('#out-time').val(out_time);
		if (options.activateOut) {
			$('#activate-out-time').prop("checked", true);
		}
		
		// Stored locations
		var stored_locations = options.storedLocations;
		$('#stored_locations').empty();
		if (stored_locations) {
			stored_locations.forEach(function (loc) {

				var $loc = $('<li/>');

				var $span = $('<span/>');
				$span.text('GroupID: ' + loc.groupId + ' - ' + loc.lat + ', ' + loc.lng);
				$loc.append($span);

				var $delete_btn = $('<a/>');
				$delete_btn.prop('href', 'javascript:void(0)');
				$delete_btn.css('marginLeft', '1rem');
				$delete_btn.text('削除');
				(function ($loc, loc) {
					$delete_btn.click(function () {
						deleteStoredLocation(loc.groupId, loc.lat, loc.lng);
						$loc.fadeOut('500', function () {
							$loc.remove();
						});
					});
				})($loc, loc);
				$loc.append($delete_btn);

				$('#storedLocations').append($loc);
			});
		}
	});

}

function load_groups () {
	console.log('function: load_groups');
	var $alert = $('#alert');
	$alert.html('');
	$alert.removeClass('alert alert-success');
	$alert.removeClass('alert alert-danger');

	var company_id = $('#company-id').val();
	if (company_id == null || company_id.length <= 0) {
		return;
	}

	var stamper = new Stamper(company_id);
	var init_group_id = null;
	
	$('#group').prop('disabled', false);
	if (!has_group_id) {
		$('#group').empty();
		stamper.fetchGroups(function (err, groups) {
			if (groups) {
				for (var group_id in groups) {
					var $opt = $('<option/>');
					$opt.val(group_id);
					$opt.text(groups[group_id]);
					$('#group').append($opt);
				}
			}
		});
		has_group_id = true;
	}
	$('#save-options-button').prop('disabled', false);
}


function save_options () {
    console.log('function: save_options');

	var $alert = $('#alert');
	$alert.html('');
	$alert.removeClass('alert alert-success');
	$alert.removeClass('alert alert-danger');

	var company_id = $('#company-id').val();
	if (company_id == null || company_id.length <= 0) {
		$alert.addClass('alert alert-danger');
		$alert.html('Company ID is empty!');
		return;
	}
	console.log('company_id = ' + company_id);
	
	var group_id = $('#group').val();
	if (group_id == null) {
		$alert.addClass('alert alert-danger');
		$alert.html('Select Group ID!');
		return;
	}
	console.log('group_id = ' + group_id);

	var activate_in_time = false;
	var in_time = $('#in-time').val();
	if ($('#activate-in-time').is(':checked')) {
		if (in_time == null || in_time.length <= 0) {
			$alert.addClass('alert alert-danger');
			$alert.html('Clock in time is empty!');
			return;
		}
		else {
			var activate_in_time = true;
		}
	}
	else {
		in_time = null;
	}
	console.log('activate_in_time = ' + activate_in_time);
	console.log('in_time = ' + in_time);

	var activate_out_time = false;
	var out_time = $('#out-time').val();
	if ($('#activate-out-time').is(':checked')) {
		if (out_time == null || out_time.length <= 0) {
			$alert.addClass('alert alert-danger');
			$alert.html('Clock out time is empty!');
			return;
		}
		else {
			var activate_out_time = true;
		}
	}
	else {
		out_time = null;
	}
	console.log('activate_out_time = ' + activate_out_time);
	console.log('out_time = ' + out_time);
	
	chrome.storage.sync.set({
		companyId: company_id,
		groupId: group_id,
		activateIn: activate_in_time,
		inTime: in_time,
		activateOut: activate_out_time,
		outTime: out_time
	}, function() {

		var activated_success = '';

		if (activate_in_time) {
			activated_success = ' Automatic clock in activated.'
		}
		if (activate_out_time) {
			activated_success = ' Automatic clock out activated.'
		}
		if (activate_in_time && activate_out_time) {
			activated_success = ' Automatic clock in and clock out activated.'
		}

		$alert.addClass('alert alert-success');
		$alert.html('Saved settings.' + activated_success);

		// Notify to background.js
		chrome.runtime.sendMessage({
			evt: 'OPTIONS_UPDATED'
		}, function(response) {
			console.log(response.result);
		});
	});
}

//bind events to dom elements
document.addEventListener('DOMContentLoaded', init);
document.querySelector('#company-id').addEventListener('blur', load_groups);
document.querySelector('#save-options-button').addEventListener('click', save_options);
