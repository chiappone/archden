var map;
var here = {};
var geocoder = new google.maps.Geocoder();
var bounds = new google.maps.LatLngBounds();

var inputFieldEl = document.getElementById('position');
var withinEl = document.getElementById('within');

var parishMarkers = [];
var infowindows = [];
var openInfoWindow;
var youMarker;

var image = 'public/images/church2.png';
var you = 'public/images/you.gif';

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
		scrollwheel : true
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
	archden.getGeo("1530 Logan Street  Denver, 80203", 500);
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
	return [ '<h4>', parish.name, '</h4>', '<label>', parish.physicaladdress,
			', ', parish.physicalzip, '</label><ul><li>Pastor: ',
			parish.pastor, '</li>', '<li>Sunday Masstimes: ', archden.findAndConvertTime(parish.sunday),
			'</li>', '<li>Website: ', link.link(parish.website), '</li></ul>',
			'<a onclick="archden.showDirections(', coords, ')">',
			'Show Directions </a>' ].join('');
}

function generateYouWindowHTML() {
	var html = '<h4> Your Location </h4>'; 
		html += '<label>'+ archden.here.address +'</label>';
	return html;
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
	this.names = {};

	$('#location').click(function(){
		$(this).focus();
		$(this).select();
	});
	
	$('#name').click(function(){
		$(this).focus();
		$(this).select();
	});
	
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

					//$('input#location').val(archden.here.address);
					
					if(youMarker){
						youMarker.setMap(null);
					}

					youMarker = new google.maps.Marker({
						position : pos,
						map : map,
						icon: you
					});
					
					var infowindow = new google.maps.InfoWindow(
							{
								content : generateYouWindowHTML()
							});
					
					infowindows.push(infowindow);
					archden.listenMarker(youMarker, infowindow);
					
					bounds = new google.maps.LatLngBounds();
					bounds.extend(pos);	
					map.setCenter(pos);
					// Default query
					archden.queryCassandraHq();
				}
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
									
									
									parishMarkers.push(marker);
									archden.parishData.push(church);
								
									
									var infowindow = new google.maps.InfoWindow(
											{
												content : generateInfoWindowHTML(church)
											});
									
									infowindows.push(infowindow);
						
									archden.listenMarker(marker, infowindow);
									bounds.extend(church.latlng);
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

				//archden.parishNames = uniqueArr(archden.parishNames).sort();
				//archden.parishNames = archden.parishNames.sort(archden.compareName);
				archden.convertObjectToArray(archden.names);
				archden.parishNames = archden.parishNames.sort();
				
				$("#name").keyup(function() {
					if($('#name').val().toUpperCase() == 'ST' ||
							$('#name').val().toUpperCase() == 'ST.'){
						$('#name').val('Saint');
					}
				});
				
				$('#name').autocomplete({
					minLength: 1,
					source : archden.parishNames,
					focus: function( event, ui ) {
						$( "#name" ).val( ui.item.label );
						return false;					
					},
					select: function( event, ui ) {
						$( "#name" ).val( ui.item.value);
						$( "#searchname" ).val( ui.item.value );
						searchByTime();
						return false;
					}
				});

				if (nameQuery) {
					map.setCenter(bounds.getCenter());
				}
				
				map.fitBounds(bounds);
				$('#mapresults').html('');
				map.setCenter(here.pos);
				map.setZoom(map.getZoom() - 1);

				archden.buildResultList();

			}
		};
		xhr.open('GET', q);
		xhr.send();
	};

	this.convertObjectToArray = function(map){
		$.each(map, function(key, val){
			var name = {};
			name.label = key;
			name.value = val;
			archden.parishNames.push(name);
		});
	}
	
	this.listenMarker = function(marker, infowindow){
		google.maps.event.addListener(marker, 'mouseover', function() {
			if(openInfoWindow){
				openInfoWindow.close();
			}
            infowindow.open(map, marker);
            openInfoWindow = infowindow;
        });
	}
	
	this.buildDataset = function(church, key, value) {
		key = key.replace(/ /g, "_");
		key = key.replace(/\//g, "_");
		switch (key) {

		case 'coordinates':
			coords = value.split(',');
			church.latlng = new google.maps.LatLng(coords[1], coords[0]);
			break;
		
		case 'name':
			var n = jQuery.trim(value);
			archden.names[n] = n;
			if(church.alternatename1){
				var alt = jQuery.trim(church.alternatename1);
				archden.names[alt] = n;
			}
			if(church.alternatename2){
				var alt = jQuery.trim(church.alternatename2);
				archden.names[alt] = n;
			}
			if(church.alternatename3){
				var alt = jQuery.trim(church.alternatename3);
				archden.names[alt] = n;
			}
			if(church.alternatename4){
				var alt = jQuery.trim(church.alternatename4);
				archden.names[alt] = n;
			}
			break;
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
						//map.setCenter(parish.latlng);
					}
					
					var results = archden.resultListHTML(parish, index);
					$('#mapresults').append(results);

		});

		this.showDirections = function(lat, lng) {
			var start = here.pos;
			var end = new google.maps.LatLng(lat, lng);

			$.each(infowindows, function(idx, iwin){
				iwin.close();
			});
			
			directionsDisplay.setMap(map);
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
			directionsDisplay.setMap(null);
			map.fitBounds(bounds);
			//map.setZoom(13);
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
	
	this.compareName = function(a, b) {
		if(a.value == b.value){
			return 0;
		}
	}
	
	this.resultListHTML = function(parish, index){
		var coords = parish.latlng.lat() + "," + parish.latlng.lng();
		var topic = "";
		var link = parish.website;
		var school = parish.school_website;
		if (!link) {
			link = "";
		}
		if (!school) {
			school = "";
		}
		
		if (archden.dow) {
			if (archden.dow == 'Sunday') {
				topic += '<b>Sunday Masstimes: </b> ';
				topic += parish.sunday;
			}
			if (archden.dow == 'saturdayanticipatory') {
				topic += '<b>Anticipatory Masstimes: </b> ';
				topic += parish.saturday_anticipatory;
			}
			if (archden.dow == 'Saturday') {
				topic += '<b>Saturday Masstimes: </b> ';
				topic += parish.saturday;
			}
			if (archden.dow == 'holydays') {
				topic += '<b>Holy Day Masstimes: </b> ';
				topic += parish.holy_days;
			}
			if (archden.dow == 'Weekday') {
				topic += '<b>Monday Masses:</b> '
						+ parish.monday + '</br>';
				topic += '<b>Tuesday Masses:</b> '
						+ parish.tuesday + '</br>';
				topic += '<b>Wednesday Masses:</b> '
						+ parish.wednesday + '</br>';
				topic += '<b>Thursday Masses:</b> '
						+ parish.thursday + '</br>';
				topic += '<b>Friday Masses:</b> '
						+ parish.friday + '</br>';
				topic += '<b>Saturday Masses:</b> '
						+ parish.saturday;
			}
		}
		if (archden.topic) {
			if (archden.topic == 'adoration') {
				topic = '<b>Adoration: </b> ';
				topic += parish.adoration;
			}
			if (archden.topic == 'life teen/youth mass') {
				topic = '<b>Life Teen: </b> ';
				topic += parish.life_teen_youth_mass;
			}
			if (archden.topic == 'spanish sunday') {
				topic = '<b>Spanish Masstimes: </b> ';
				topic += parish.spanish_sunday;
			}
			if (archden.topic == 'novo order latin') {
				topic = '<b>Latin Masstimes: </b> ';
				topic += parish.novo_order_latin;
			}
			if (archden.topic == 'korean') {
				topic = '<b>Korean Masstimes: </b> ';
				topic += parish.korean;
			}
			if (archden.topic == 'vietnamese') {
				topic = '<b>Vietnamese Masstimes: </b> ';
				topic += parish.vietnamese;
			}
			if (archden.topic == 'asl') {
				topic = '<b>ASL Masstimes: </b> ';
				topic += parish.asl;
			}
		}
		
		if(archden.confession) {
			topic = '<b>Saturday Confession:</b> ';
			topic += parish.saturday_confessions+ ' <br/>';
			topic += '<b>Sunday Confession:</b> ';
			topic += parish.sunday_confessions+ ' <br/>';
			topic += '<b>Monday Confession:</b> ';
			topic += parish.monday_confessions+ ' <br/>';
			topic += '<b>Tuesday Confession:</b> ';
			topic += parish.tuesday_confessions+ ' <br/>';
			topic += '<b>Wednesday Confession:</b> ';
			topic += parish.wednesday_confessions+ ' <br/>';
			topic += '<b>Thursday Confession:</b> ';
			topic += parish.thursday_confessions+ ' <br/>';
			topic += '<b>Friday Confession:</b> ';
			topic += parish.friday_confessions + ' <br/><br/>';
		}
		
		if(topic)
			topic = archden.findAndConvertTime(topic);
		
		var	detailsLeft = '<b>Pastor:</b> '+ parish.pastor+ '<br/>';
			detailsLeft += '<b>Sunday Masstimes:</b> '+parish.sunday;
			detailsLeft += '<br/>'+ '<b>Anticipatory Masstimes:</b> ';
			detailsLeft += parish.saturday_anticipatory+ '<br/>';
			detailsLeft += '<b>Adoration:</b> '+ parish.adoration;
			detailsLeft += '<br/>'+ '<b>Website:</b> ';
			detailsLeft += link.link(parish.website)+ '<br/>';
			detailsLeft += '<b>School:</b> '+ parish.grades+ '<br/>';
			detailsLeft += '<b>School Website:</b> ';
			detailsLeft += school.link(parish.school_website)+ '<br/>';
			detailsLeft += '<br/>'+ '<b>Monday Masses:</b> ';
			detailsLeft += parish.monday+ '</br>';
			detailsLeft += '<b>Tuesday Masses:</b> '+ parish.tuesday;
			detailsLeft += '<br/>'+ '<b>Wednesday Masses:</b> ';
			detailsLeft += parish.wednesday + '<br/>';
			detailsLeft += '<b>Thursday Masses:</b> '+ parish.thursday;
			detailsLeft += '<br/>'+ '<b>Friday Masses:</b> ';
			detailsLeft += parish.friday+ '<br/>';
			detailsLeft += '<b>Saturday Masses:</b> '+ parish.saturday;
			detailsLeft += '<br/>';
			
		detailsLeft =  archden.findAndConvertTime(detailsLeft);
				
		var detailsRight = '<b>Saturday Confession:</b> ';
			detailsRight += parish.saturday_confessions+ ' <br/>';
			detailsRight += '<b>Sunday Confession:</b> ';
			detailsRight += parish.sunday_confessions+ ' <br/>';
			detailsRight += '<b>Monday Confession:</b> ';
			detailsRight += parish.monday_confessions+ ' <br/>';
			detailsRight += '<b>Tuesday Confession:</b> ';
			detailsRight += parish.tuesday_confessions+ ' <br/>';
			detailsRight += '<b>Wednesday Confession:</b> ';
			detailsRight += parish.wednesday_confessions+ ' <br/>';
			detailsRight += '<b>Thursday Confession:</b> ';
			detailsRight += parish.thursday_confessions+ ' <br/>';
			detailsRight += '<b>Friday Confession:</b> ';
			detailsRight += parish.friday_confessions + ' <br/><br/>';
			
			
		detailsRight = archden.findAndConvertTime(detailsRight);
		
		detailsRight += '<b>Phone:</b> '+ parish.phone1+ '<br/>';
		detailsRight += '<b>Fax:</b> '+ parish.fax+ '<br/>'+ '</div>';
			
		var	html = '<div class="churchpopup churchaddressblock1">';
			// html += '<a id="churchaddressblockpointer1"
			// class="churchaddressblockpointer" href="javascript:void(0);"
			// rel="nofollow">';
			// html += '<img id="resultImage1" class="marker_result"
			// alt="Result1"
			// src="https://shared.via.infonow.net/images/mapicons/blue1.png">';
			// html += '</a>';
			html += '<div class="fr wdth135 padtp15">';
	        html += '</div>';
	        html += '<div class="mapresulttop">';
			html += '<h2>';
			html += '<span onclick="expandDetails('+ index +')" >' + parish.name +'</span>';
			html += '</h2>';
	        html += '</div>';
	        html += '<div class="parishinfo">';
	        html += parish.physicaladdress +' '+ parish.physicalzip +'<br/>'+  parish.phone1 +'<br/>'; 
			html += parish.distance +' miles | ';
			html += '<a href="javascript:void(0);" rel="nofollow" class="lnkblu" onclick="archden.showDirections('+ coords +')">Driving Directions</a>';
			html += '<br/><span class="topic">'+ topic + '</span>';
			html += '<br/>';
			html += '</div>';
	        
	        html += '<div id="details-' + index +'" style="display: none">';
	        html += '<div class="mapresultleft">';
	        html += detailsLeft;
            html += '</div>';

            html += '<div class="mapresultright">';
			html += detailsRight;
			html +=	'</div>';
			html += '</div>';
			html += '<div class="clearBoth"></div>';
			html += '</div>';
			
		html = html.replace(/undefined/g, '');
		
		return html;
	}
	
	this.findAndConvertTime = function(string) {
		if(!string){ return null; }
		var newString = string;
		var pattern = /\d{4}/g;
		var matches = string.match(pattern);
		if(!matches){ return string; }
		$.each(matches, function(idx, time) {
			var conv = archden.convertTime(time);
			newString = newString.replace(time, conv);
		});
		return newString;
	}
	
	this.convertTime = function(time) {
		var sAve = 0
		var ez1 = ""
		var ml3 = "00"
		var pw3 = parseFloat(archden.cleanBad(time));
		var pm4 = archden.cleanBad(time);
		var pm5 = archden.cleanBad(time);
		var len = pm4.length
		var ret;
		if (len != 4) {
			ret = "???"
		}
		else if (pw3>2401) {
			ret = "???"
		}
		else if (pw3>1259) {
			pw3 = pw3 - 1200

		var pm4 = String(pw3)

		var len = pm4.length
		if (len < 4) {
			pm4 = "0"+ pm4
		}

		if (pm4.substring(0, 1) == "0") {
			var hours = pm4.substring(1, 2)
		}
		else {	
			var hours = pm4.substring(0, 2)
		}
		var mins = pm4.substring(2, 4)
		ez1 = " PM"
		if (hours == "12") ez1 = " AM"
		if (mins > "59") mins = "???"	
			ret = hours + ":" + mins + ez1
		}
		else {
			if (pm4.substring(0, 1) == "0") {
				var hours = pm4.substring(1, 2)
			}
			else {	
				var hours = pm4.substring(0, 2)
			}
			var mins = pm4.substring(2, 4)
			ez1 = " AM"
			if (hours == "12") ez1 = " PM"
					if (pm5.substring(0, 2) == "00") hours = "12"
						if (mins > "59") mins = "???"	
							ret = hours + ":" + mins + ez1
		}
		
		return ret;
	}

	this.cleanBad = function(string) {
	    for (var i=0, output='', valid="eE-0123456789."; i<string.length; i++)
	       if (valid.indexOf(string.charAt(i)) != -1)
	          output += string.charAt(i)
	    return output;
	} 

}

var archden = new ArchDen();
