var map;
var here = {};
var geocoder = new google.maps.Geocoder();

var inputFieldEl = document.getElementById('position');
var withinEl = document.getElementById('within');

var parishMarkers = [];
var infowindows = [];

var image = 'public/images/church2.png';

var directionDisplay;
var directionsService = new google.maps.DirectionsService();


function calcRoute(start, end) {
	var request = {
		origin : start,
		destination : end,
		travelMode : google.maps.DirectionsTravelMode.DRIVING
	};
	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			directionsDisplay.setDirections(response);
		}
	});
}

function uniqueArr(ar) {
	var f = {}, i = 0, l = ar.length, r = [];
	while (i < l) {
		!f[ar[i]] && r.push(ar[i]);
		f[ar[i++]] = 1;
	}
	return r;
};

function resetMap() {
	closestJob = null;
	$('#closest-church').text('Searching...');
	clearOverlays();
	map.setCenter(here.pos);
}

function clearOverlays() {
	if (parishMarkers) {
		for (i in parishMarkers) {
			parishMarkers[i].setMap(null);
		}
	}
}

function initialize() {
	debug.log("init search");
	directionsDisplay = new google.maps.DirectionsRenderer();

	var myOptions = {
		zoom : 6,
		mapTypeId : google.maps.MapTypeId.ROADMAP,
		scrollwheel : false
	};
	map = new google.maps.Map(document.getElementById('mapContainer'),
			myOptions);
	directionsDisplay.setMap(map);
	directionsDisplay.setPanel(document.getElementById('directions-panel'));
	
	// Try HTML5 geolocation
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			var pos = new google.maps.LatLng(position.coords.latitude,
					position.coords.longitude);
			here.pos = pos;
			map.setCenter(pos);
			archden.findNearbyParishes(pos);
		}, function() {
			handleNoGeolocation(true);
		});
	} else {
		// Browser doesn't support Geolocation
		handleNoGeolocation(false);
	}
}

function handleNoGeolocation(errorFlag) {
	archden.getGeo("Denver, CO", 500);
}

function doQuery(el, inputFieldEl, withinEl) {
	if (el.attributes['data-previous'].value == el.textContent) {
		return;
	} else if (el.textContent == '') {
		el.textContent = el.attributes['data-previous'].value
		return;
	}
	el.attributes['data-previous'].value = el.textContent;
	resetMap();

	queryCassandraHq(inputFieldEl.textContent, here.address,
			withinEl.textContent);
}

function generateInfoWindowHTML(parish) {
	var link = parish.website;
	if (!link) {
		link = "";
	}
	var coords = parish.latlng.lat() + "," + parish.latlng.lng();
	return [ '<h4>', parish.nombre, '</h4>', '<label>', parish.physicaladdress,
			', ', parish.physicalzip, '</label><ul><li>Pastor: ',
			parish.pastor, '</li>', '<li>Sunday Masstimes: ', parish.sunday,
			'</li>', '<li>Website: ', link.link(parish.website), '</li></ul>',
			'<a onclick="archden.showDirections(', coords, ')">',
			'Show Directions </a>' ].join('');
}

function search() {
	var tod = $("#tod").val();
	var dow = $("#dow").val();
	queryCassandraHq('', '', 500, dow, tod);
}

function get(k) {
	return church[k];
}

google.maps.event.addDomListener(window, 'load', initialize);

/**
 * ArchDen
 * 
 * @returns {ArchDen}
 */
function ArchDen() {

	this.query = "";
	this.confession = false;
	this.topic = null;
	this.location = null;
	this.radius = null;
	this.name = null;
	this.dow = null;
	this.tod = null;
	this.tos = null;
	this.lang = null;
	this.here = {};
	this.parishNames = [];
	this.parishData = [];

	this.getGeo = function() {
		debug.log("Geocoding: " + archden.location + " radius: "
				+ archden.radius);
		geocoder.geocode({
			'address' : archden.location
		}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				resetMap();
				map.setCenter(results[0].geometry.location);
				here.pos = results[0].geometry.location;
				archden.findNearbyParishes(here.pos);
			} else {
				debug.log("Unable to geocode.")
				// alert("Geocode was not successful for the following reason: "
				// + status);
			}
		});
	};

	this.findNearbyParishes = function(pos) {
		geocoder.geocode({
			'latLng' : pos
		}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				if (results[1]) {
					map.setZoom(13);

					archden.here.address = results[1].formatted_address;
					archden.address = here.address;
					if (!archden.radius) {
						archden.radius = 3;
					}

					$('input#location').val(archden.here.address);

					var marker = new google.maps.Marker({
						position : pos,
						map : map
					});
					// Default query
					archden.queryCassandraHq();
				}
			} else {
				// alert("Geocoder failed due to: " + status);
			}
		});
	}

	this.queryCassandraHq = function() {
		$('#closest-church').text('Searching...');
		debug.log("Address: " + archden.address);
		debug.log("Radius: " + archden.radius);
		if (archden.parishData) {
			debug.log("emptying array");
			archden.parishData = [];
		}
		var churches = 0;
		var q;
		var nameQuery = false;
		if (!archden.name) {
			q = [ '/plotall' ];
		} else {
			q = [ '/plotname?name=' + archden.name ];
			nameQuery = true;
		}
		if (archden.tod) {
			var req = '/plotbytime?dayofweek=' + archden.dow + '&timeofday='
					+ archden.tod + '&name=' + archden.name
			if (archden.confession) {
				req = req + '&confession=true';
			}
			q = [ req ];
		}

		if (archden.topic) {
			q = [ '/search?topic=' + archden.topic ];
		}

		debug.log("Query: " + q);

		clearOverlays();
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function(e) {
			if (this.readyState == 4 && this.status == 200) {
				var resp = jQuery.parseJSON(this.responseText);
				if (!resp.members) {
					$('#closest-church').text('No Results Found.');
					return;
				}

				var newBounds = new google.maps.LatLngBounds();
				//debug.log(resp.members);
				$.each(
						resp.members,
						function(key, value) {
							var coords = {};
							var job = {};
							var church = {};
							$.each(value.members, function(innerkey, innerval) {
								church = archden.buildDataset(church, innerkey,
										innerval.value);

							});

							if (church.latlng) {
								var dist = google.maps.geometry.spherical
										.computeDistanceBetween(church.latlng,
												here.pos);
								if (dist < (archden.radius * 1609)) {
									var marker = new google.maps.Marker({
										position : church.latlng,
										map : map,
										icon : image
									});
									churches++;
									church.distance = Math
											.round((dist / 1609) * 100) / 100;
									;
									// debug.log("Adding parish: "+
									// church.nombre);
									parishMarkers.push(marker);
									archden.parishData.push(church);
								
									
									var infowindow = new google.maps.InfoWindow(
											{
												content : generateInfoWindowHTML(church)
											});
									
									infowindows.push(infowindow);
						
									archden.listenMarker(marker, infowindow);
									newBounds.extend(church.latlng);
								}
							}

							$('#closest-church').text(
									'Found ' + churches + ' parishes.');

						});

				if ((churches == 0) && (archden.radius < 200)) {
					var rad = parseInt(archden.radius);
					if (rad < 30) {
						rad++;
					}
					if (rad < 100) {
						rad = rad + 10;
					}
					if (rad > 100) {
						rad = rad + 50;
					}
					archden.radius = rad;
					$('input#radius').val(rad);
					archden.queryCassandraHq();
					$('#closest-church').text('Expanding Search Radius.');
				}

				if (churches == 0) {
					$('#closest-church').text('No results found.');
				}

				archden.parishNames = uniqueArr(archden.parishNames);

				$('#name').autocomplete({
					source : archden.parishNames
				});

				if (nameQuery) {
					map.setCenter(newBounds.getCenter());
				}

				$('ol#selectable').html('');

				archden.buildResultList();

			}
		};
		xhr.open('GET', q);
		xhr.send();
	};

	this.listenMarker = function(marker, infowindow){
		google.maps.event.addListener(marker, 'click', function() {
            infowindow.open(map, marker);
        });
	}
	
	this.buildDataset = function(church, key, value) {
		key = key.replace(/ /g, "_");
		switch (key) {

		case 'coordinates':
			coords = value.split(',');
			church.latlng = new google.maps.LatLng(coords[1], coords[0]);
			break;
		}

		if (church.nombre) {
			archden.parishNames.push(jQuery.trim(church.nombre));
		}
		church[key] = value;
		return church;
	}

	this.buildResultList = function() {
		debug.log("building result list");
		archden.parishData = archden.parishData.sort(archden.compare);
		$.each(archden.parishData,
				function(index, parish) {
					if (index == 0) {
						map.setCenter(parish.latlng);
					}
					var link = parish.website;
					var school = parish.school_website;
					if (!link) {
						link = "";
					}
					if (!school) {
						school = "";
					}

					var topic = '<li><b>Sunday Masstimes: </b> ';
					topic += parish.sunday;
					topic += '</li>';
					if (archden.dow) {
						if (archden.dow == 'saturdayanticipatory') {
							topic = '<li><b>Anticipatory Masstimes: </b> ';
							topic += parish.saturday_anticipatory;
							topic += '</li>';
						}
						if (archden.dow == 'Saturday') {
							topic = '<li><b>Saturday Masstimes: </b> ';
							topic += parish.saturday;
							topic += '</li>';
						}
						if (archden.dow == 'holydays') {
							topic = '<li><b>Holy Day Masstimes: </b> ';
							topic += parish.holy_days;
							topic += '</li>';
						}
						if (archden.dow == 'Weekday') {
							topic = '<li><b>Monday Masses:</b> '
									+ parish.monday + '</li>';
							topic += '<li><b>Tuesday Masses:</b> '
									+ parish.tuesday + '</li>';
							topic += '<li><b>Wednesday Masses:</b> '
									+ parish.wednesday + '</li>';
							topic += '<li><b>Thursday Masses:</b> '
									+ parish.thursday + '</li>';
							topic += '<li><b>Friday Masses:</b> '
									+ parish.friday + '</li>';
							topic += '<li><b>Saturday Masses:</b> '
									+ parish.saturday + '</li>';
						}
					}
					if (archden.topic) {
						if (archden.topic == 'adoration') {
							topic = '<li><b>Adoration: </b> ';
							topic += parish.adoration;
							topic += '</li>';
						}
						if (archden.topic == 'life teen/youth mass') {
							topic = '<li><b>Life Teen: </b> ';
							topic += '';
							topic += '</li>';
							debug.log(parish);
						}
						if (archden.topic == 'spanish sunday') {
							topic = '<li><b>Spanish Masstimes: </b> ';
							topic += parish.spanish_sunday;
							topic += '</li>';
						}
						if (archden.topic == 'novo order latin') {
							topic = '<li><b>Latin Masstimes: </b> ';
							topic += parish.novo_order_latin;
							topic += '</li>';
						}
						if (archden.topic == 'korean') {
							topic = '<li><b>Korean Masstimes: </b> ';
							topic += parish.korean;
							topic += '</li>';
						}
						if (archden.topic == 'vietnamese') {
							topic = '<li><b>Vietnamese Masstimes: </b> ';
							topic += parish.vietnamese;
							topic += '</li>';
						}
						if (archden.topic == 'asl') {
							topic = '<li><b>ASL Masstimes: </b> ';
							topic += parish.asl;
							topic += '</li>';
						}
					}

					var html = [
							'<ul id="' + index + '"><h2>',
							parish.nombre,
							'</h2>',
							'<li><b>Address:</b> ',
							parish.physicaladdress,
							', ',
							parish.physicalzip,
							'</li>',
							'<li><b>Distance:</b> ',
							parish.distance,
							' mi </li>',
							topic,

							'<div id="details-' + index
									+ '" style="display: none">',
							'<li><b>Pastor:</b> ', parish.pastor, '</li>',
							'<li><b>Sunday Masstimes:</b> ', parish.sunday,
							'</li>', '<li><b>Anticipatory Masstimes:</b> ',
							parish.saturday_anticipatory, '</li>',
							'<li><b>Adoration:</b> ', parish.adoration,
							'</li>', '<li><b>Website:</b> ',
							link.link(parish.website), '</li>',
							'<li><b>School:</b> ', parish.grades, '</li>',
							'<li><b>School Website:</b> ',
							school.link(parish.school_website), '</li>',
							'<br/>', '<li><b>Monday Masses:</b> ',
							parish.monday, '</li>',
							'<li><b>Tuesday Masses:</b> ', parish.tuesday,
							'</li>', '<li><b>Wednesday Masses:</b> ',
							parish.wednesday, '</li>',
							'<li><b>Thursday Masses:</b> ', parish.thursday,
							'</li>', '<li><b>Friday Masses:</b> ',
							parish.friday, '</li>',
							'<li><b>Saturday Masses:</b> ', parish.saturday,
							'</li>', '<br/>',
							'<li><b>Saturday Confession:</b> ',
							parish.saturday_confessions, '</li>',
							'<li><b>Monday Confession:</b> ',
							parish.monday_confessions, '</li>',
							'<li><b>Tuesday Confession:</b> ',
							parish.tuesday_confessions, '</li>',
							'<li><b>Wednesday Confession:</b> ',
							parish.wednesday_confessions, '</li>',
							'<li><b>Thursday Confession:</b> ',
							parish.thursday_confessions, '</li>',
							'<li><b>Friday Confession:</b> ',
							parish.friday_confessions, '</li>', '<br/>',
							'<li><b>Phone:</b> ', parish.phone1, '</li>',
							'<li><b>Fax:</b> ', parish.fax, '</li>', '</div>',
							'</ul>' ].join('');

					$('#selectable').append(html);

				});

		this.showDirections = function(lat, lng) {
			var start = here.pos;
			var end = new google.maps.LatLng(lat, lng);

			$.each(infowindows, function(idx, iwin){
				iwin.close();
			});
			
			calcRoute(start, end);
			archden.slideOpen();
			event.preventDefault();
		}

		this.slideOpen = function() {
			$('.feedback-panel').animate({
				left : '0'
			}, feedbackTab.speed).addClass('open');
		}

		this.slideClose = function() {
			$('.feedback-panel').animate({
				left : '-' + feedbackTab.containerWidth
			}, feedbackTab.speed).removeClass('open');
		}

	}

	this.compare = function(a, b) {
		if (a.distance < b.distance)
			return -1;
		if (a.distance > b.distance)
			return 1;
		return 0;
	}
}

var archden = new ArchDen();
