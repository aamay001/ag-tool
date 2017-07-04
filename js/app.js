'use strict';

const STAG_GOOGLE_GEOCODING_APIKEY = 'AIzaSyDla3BIb5aFs5g6x1TrQi_MmluJOwD6c6I';
const STAG_GOOGLE_GEOCODING_APIURL = 'https://maps.googleapis.com/maps/api/geocode/json';
const STAG_UC_INSTITUTIONSEARCH_APIURL = 'https://hs-articulation.ucop.edu/api/search/public/institution';

const STAG_DEBUG_MODAL_TOGGLE = '#stag-debug-modal-toggle';
const STAG_MAIN_MODAL = '#stag-main-modal';
const STAG_MODAL_BUTTON = 'button[data-dismiss=modal]';
const STAG_MODAL_BODY = '.js-stag-modal-body';
const STAG_MODAL_TITLE = STAG_MAIN_MODAL + ' .modal-header h4.modal-title';

const STAG_APP_STATES = {
                            Initial : 0,
                            SchoolSelection : 1,
                            SchoolFinder : 2,
                            SchoolFinderResults: 3,
                            GradeSelection : 4,
                            InstructionsDialog : 5,
                            CourseSelection : 6
                          };
var STAG_APP_STATE_RENDER_FUNCTIONS = [ function(){}, function(){}, function(){},
                                        function(){}, function(){}, function(){},
                                        function(){} ];

var stagAppState = STAG_APP_STATES.Initial;
var stagAppNextState = 0;
var stagUserLocationLongitute;
var stagUserLocationLatitude;
var stagUserLocationAvailable;
var stagUserLocationCities;

$(onReady);

function onReady() {
    stagUserLocationAvailable = getUserLocation();
    mapRenderFunctions();
    bindUserInput();
    setAppState(STAG_APP_STATES.Initial);
}

function mapRenderFunctions() {
    STAG_APP_STATE_RENDER_FUNCTIONS[STAG_APP_STATES.Initial] = renderInitialState;
    STAG_APP_STATE_RENDER_FUNCTIONS[STAG_APP_STATES.SchoolSelection] = renderSchoolSelectionState;
    STAG_APP_STATE_RENDER_FUNCTIONS[STAG_APP_STATES.SchoolFinder] = renderSchoolFinderState;
}

function bindUserInput() {
    $(STAG_DEBUG_MODAL_TOGGLE).on('click', onToggleModalClick);
    $(STAG_MODAL_BUTTON).on('click', nextState);
}

function onToggleModalClick() {
    var modalVisibility = $(STAG_MAIN_MODAL).css('display');

    if ( modalVisibility === 'none' || modalVisibility === undefined ) {
        $(STAG_MAIN_MODAL).fadeIn('fast');        
    }

    else {
        $(STAG_MAIN_MODAL).fadeOut('fast');
    }
}

function setAppState(state) {
    stagAppState = state;
    clearRenderableAreas();
    STAG_APP_STATE_RENDER_FUNCTIONS[stagAppState]();
}

function clearRenderableAreas() {
    $(STAG_MODAL_TITLE).text('');
    $(STAG_MODAL_BODY).text('');
}

function renderInitialState() {
    stagAppNextState = ++stagAppState;    
    $(STAG_MODAL_TITLE).text('Disclaimer');
    $(STAG_MODAL_BODY).text('This tool was designed to help California high school \
                             students estimate their current A-G requirements status. \
                             A-G requirements are complex and continually changing. \
                             The results of this tool are to be taken as an estimation \
                             and should not be received as an authoratative source for \
                             your actual status on A-G requirements. You should consult \
                             your high school counselor to determine your absolute status. \
                             While this tool may show accurate results for some students, \
                             it is guaranteed that not all results will be accurate due to \
                             a number of requirements that are not taken into account. \
                             If you understand the above, click the OK button to continue \
                             using this tool.');    
    $(STAG_MAIN_MODAL).fadeIn('fast');
}

function renderSchoolSelectionState() {
    getUserLocality();
    $(STAG_MODAL_TITLE).text('School Selection');
    $(STAG_MAIN_MODAL).fadeIn('fast');
}

function renderSchoolFinderState() {
    
}

function nextState() {
    setAppState(stagAppNextState);
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(setUserLocationLongLat);
        return true;
    }
    return false;
}

function setUserLocationLongLat(position) {
    stagUserLocationLongitute = position.coords.longitude;
    stagUserLocationLatitude = position.coords.latitude;

    console.log( 'Longitude: ' + stagUserLocationLongitute);
    console.log( 'Latitude: ' + stagUserLocationLatitude);
}

function getUserLocality() {
    let params = {
                    latlng : stagUserLocationLatitude + ',' + stagUserLocationLongitute,
                    key : STAG_GOOGLE_GEOCODING_APIKEY
                 }
    $.getJSON(STAG_GOOGLE_GEOCODING_APIURL, params)
    .then(parseLocality)
    .done(getLocalHighSchools);
}

function parseLocality(data) {
    let cities = data.results.map(
        function(item) {
            if ( item.formatted_address && "locality" === item.types[0] )
                return item.formatted_address;
        }).filter(
        function(item) { 
            if ( item ) return item;
        });
    
    stagUserLocationCities = cities;
    console.log(stagUserLocationCities);  
}

function getLocalHighSchools() {
    /*
    let params =  
                { 
                    query:"*",
                    filters:[],
                    page:1,
                    pageSize:4000
                };       

    $.getJSON(STAG_UC_INSTITUTIONSEARCH_APIURL, params, parseLocalHighSchools);
    */

    parseLocalHighSchools(STAG_APP_SCHOOL_DATA);
}

function parseLocalHighSchools(data) {    
    let schools = data.results.filter(
        function(item) {
            if ( item.details.address && item.details.closedAsOf === null ) {
                let localityName = item.details.address.city + ', CA, USA';
                if ( stagUserLocationCities.includes(localityName) ) {
                    return item;
                }
            }
        });

    console.log(schools);
}