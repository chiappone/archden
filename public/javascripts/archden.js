var map;
var here = {};
var geocoder = new google.maps.Geocoder();

var inputFieldEl = document.getElementById('position');
var withinEl = document.getElementById('within');

var parishMarkers = [];



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
	document.getElementById('closest-church').textContent = 'Searching...';
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
	console.log("init search");
	var myOptions = {
		zoom : 6,
		mapTypeId : google.maps.MapTypeId.ROADMAP,
		scrollwheel: false
	};
	map = new google.maps.Map(document.getElementById('mapContainer'),
			myOptions);

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
	getGeo("Denver, CO", 500);
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
	return [ '<h4>', parish.nombre, '</h4>', '<ul><li>Address: ',
			parish.physicaladdress, ', ', parish.physicalzip, '<li>Pastor: ',
			parish.pastor, '</li>', '<li>Sunday Masstimes: ', parish.sunday, '</li>',
			'<li>Website: ', link.link(parish.website), '</li></ul>' ].join('');
}


function search(){
	var tod = $("#tod").val();
	var dow = $("#dow").val();
	queryCassandraHq('','', 500, dow, tod);
}

// Need to integrate these into main archden class

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
	this.here = {};
	this.parishNames = [];
	this.parishData = [];
	
	this.getGeo = function() {
		console.log("Geocoding: " + archden.location + " radius: " + archden.radius);
		geocoder.geocode({
			'address' : archden.location
		}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				resetMap();
				map.setCenter(results[0].geometry.location);
				here.pos = results[0].geometry.location;
				archden.findNearbyParishes(here.pos);
			} else {
				console.log("Unable to geocode.")
				alert("Geocode was not successful for the following reason: "
						+ status);
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
					// Default query
					archden.queryCassandraHq();
				}
			} else {
				alert("Geocoder failed due to: " + status);
			}
		});
	}
	
	this.queryCassandraHq = function() {
		
		console.log("Address: " + archden.address);
		console.log("Radius: " + archden.radius);
		if(archden.parishData){
			console.log("emptying array");
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
		if(archden.tod){
			var req = '/plotbytime?dayofweek='+ archden.dow +'&timeofday='+ archden.tod + '&name='+ archden.name
			if(archden.confession){
				req = req + '&confession=true';
			}
			q = [ req ];
		}
		
		if(archden.topic){
			q = [ '/search?topic='+ archden.topic ];
		}
		
		console.log("Query: "+ q);
		
		clearOverlays();
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function(e) {
			if (this.readyState == 4 && this.status == 200) {
				var resp = jQuery.parseJSON(this.responseText);
				if (!resp.members) {
					document.getElementById('closest-church').textContent = 'Nothing found, try searching.';
					return;
				}

				var newBounds = new google.maps.LatLngBounds();
				console.log(resp.members);
				$
						.each(
								resp.members,
								function(key, value) {
									var coords = {};
									var job = {};
									var church = {};
									$.each(value.members, function(innerkey,
											innerval) {
										church = archden.buildDataset(church, innerkey,
												innerval.value);

									});

									if (church.latlng) {
										var dist = google.maps.geometry.spherical
												.computeDistanceBetween(
														church.latlng, here.pos);
										if (dist < (archden.radius * 1609)) {
											var marker = new google.maps.Marker({
												position : church.latlng,
												map : map
											});
											churches++;
											church.distance = dist;
											// console.log("Adding parish: "+
											// church.nombre);
											parishMarkers.push(marker);
											archden.parishData.push(church);

											var infowindow = new google.maps.InfoWindow(
													{
														content : generateInfoWindowHTML(church)
													});

											google.maps.event
													.addListener(
															marker,
															'click',
															function() {
																infowindow
																		.open(map,
																				marker);
																$(
																		'table#mass-times')
																		.show();
																document
																		.getElementById('closest-church').textContent = 'Found '
																		+ churches
																		+ ' churches. - '
																		+ church.nombre;
															});

											newBounds.extend(church.latlng);
										}
									}
									
									document.getElementById('closest-church').textContent = 'Found '
											+ churches + ' churches.';

								});
				
				if((churches == 0) && (archden.radius < 30)){
					var rad = parseInt(archden.radius);
					rad++;
					archden.radius = rad;
					$('input#radius').val(rad);
					archden.queryCassandraHq();
				}
				
				
				archden.parishNames = uniqueArr(archden.parishNames);
				
				$('#name').autocomplete({
					source : archden.parishNames
				});
				
				if(nameQuery){
					map.setCenter(newBounds.getCenter());
				}
				
				$('ol#selectable').html('');
				
				archden.buildResultList();

				// .getBoundsZoomLevel(newBounds));
				/*
				 * document.getElementById('num-results').textContent =
				 * resp.feed.entry.length;
				 * document.getElementById('closest-church').textContent = [ Math
				 * .round(closestJob.latlng.distanceFrom(here.pos) / 1609), ' miles
				 * away - ', closestJob.title ].join('');
				 */
			}else{
				document.getElementById('closest-church').textContent = 'No Results Found.';
			}
		};
		xhr.open('GET', q);
		xhr.send();
	};
	
	this.buildDataset = function(church, key, value) {
		key = key.replace(/ /g,"_");
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
	
	this.buildResultList = function(){
		console.log("building result list");
		archden.parishData = archden.parishData.sort(archden.compare);
		$.each(archden.parishData, function (index, parish){
			var link = parish.website;
			if (!link) {
				link = "";
			}
			var html = ['<ul id="'+ index +'"><h2>', parish.nombre, '</h2>', 
			            '<li>Address: ', parish.physicaladdress, ', ', parish.physicalzip, '</li>',
			            '<li>Distance: ', parish.distance, '</li>',
			            '<li>Pastor: ',parish.pastor, '</li>', 
			            '<li>Sunday Masstimes: ', parish.sunday, '</li>',
			            '<li>Anticipitory Masstimes: ', parish.saturday_anticipatory, '</li>',
			            '<li>Website: ', link.link(parish.website), '</li>',
			            '<div id="details-' + index +'" style="display: none">',
			            '<li>School: ', parish.grades, '</li>',
			            '<li>Monday: ', parish.monday, '</li>',
			            '<li>Tuesday: ', parish.tuesday, '</li>',
			            '<li>Wednesday: ', parish.wednesday, '</li>',
			            '<li>Thursday: ', parish.thursday, '</li>',
			            '<li>Friday: ', parish.friday, '</li>',
			            '<li>Saturday: ', parish.saturday, '</li>',
			            '</div>',
			            '</ul>' ].join('');
			
			$('#selectable').append(html);
			
		});

	}
	
	this.compare = function(a,b) {
		  if (a.distance < b.distance)
		     return -1;
		  if (a.distance > b.distance)
		    return 1;
		  return 0;
	}
}

var archden = new ArchDen();
