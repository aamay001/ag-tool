'use strict';

const STAG_GOOGLE_GEOCODING_APIKEY = 'AIzaSyDla3BIb5aFs5g6x1TrQi_MmluJOwD6c6I';
const STAG_GOOGLE_GEOCODING_APIURL = 'https://maps.googleapis.com/maps/api/geocode/json';
const STAG_UC_INSTITUTIONSEARCH_APIURL = 'https://hs-articulation.ucop.edu/api/search/public/institution';
const STAG_UC_COURSESEARCH_APIURL = 'https://hs-articulation.ucop.edu/api/course/institution/****/list/'

const STAG_DEBUG_MODAL_TOGGLE = '#stag-debug-modal-toggle';
const STAG_MAIN_MODAL = '#stag-main-modal';
const STAG_MODAL_BUTTON = 'button[data-dismiss=modal]';
const STAG_MODAL_AUX_BUTTON = 'button[data-aux=modal]';
const STAG_MODAL_BODY = '.js-stag-modal-body';
const STAG_MODAL_TITLE = STAG_MAIN_MODAL + ' .modal-header h4.modal-title';
const STAG_SCHOOL_SELECT = '#js-stag-school-select';
const STAG_SCHOOL_FINDER_TEXT = '#js-stag-school-finder-text';
const STAG_SCHOOL_FINDER_PROGRESS_BAR = '.js-stag-school-finder-progress-bar';
const STAG_SCHOOL_FINDER_FORM_GROUP = '.js-stag-school-finder-input-group'

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

var stagAppModalAuxButtonAction = function(){};
var stagAppState = STAG_APP_STATES.Initial;
var stagAppNextState = 0;
var stagUserLocationLongitute;
var stagUserLocationLatitude;
var stagUserLocationAvailable = false;
var stagUserLocationCities;
var stagUserSchoolSelection;
var stagUserLocalSchools;
var stagUserSchoolFinderSearchText;
var stagSchoolFinderSearchResults;
var stagUserGrade;
var stagSchoolCourseList;

$(onReady);

function onReady() {
    getUserLocation();    
    mapRenderFunctions();
    bindUserInput();
    setAppState(stagAppState);    
}

function mapRenderFunctions() {
    STAG_APP_STATE_RENDER_FUNCTIONS[STAG_APP_STATES.Initial] = renderInitialState;
    STAG_APP_STATE_RENDER_FUNCTIONS[STAG_APP_STATES.SchoolSelection] = renderSchoolSelectionState;
    STAG_APP_STATE_RENDER_FUNCTIONS[STAG_APP_STATES.SchoolFinder] = renderSchoolFinderState;
    STAG_APP_STATE_RENDER_FUNCTIONS[STAG_APP_STATES.SchoolFinderResults] = renderSchoolFinderResultsState;
    STAG_APP_STATE_RENDER_FUNCTIONS[STAG_APP_STATES.GradeSelection] = renderGradeSelectionState;
    STAG_APP_STATE_RENDER_FUNCTIONS[STAG_APP_STATES.InstructionsDialog] = renderInstructionsState;
    STAG_APP_STATE_RENDER_FUNCTIONS[STAG_APP_STATES.CourseSelection] = renderCourseSelectionState;
}

function bindUserInput() {
    $(STAG_MODAL_AUX_BUTTON).on('click', function() { stagAppModalAuxButtonAction(); });
    $(STAG_MODAL_BUTTON).on('click', nextState);
}

function nextState() {
    ++stagAppNextState;

    // If the user's location is not available, skip 
    // school selection state.
    if ( stagAppNextState === STAG_APP_STATES.SchoolSelection && !stagUserLocationAvailable ) {
        console.log('User location not available.');
        stagAppNextState = STAG_APP_STATES.SchoolFinder;
    }

    // If the next state is the school finder and the user 
    // has made a school selection, go to grade selection
    else if ( stagAppNextState === STAG_APP_STATES.SchoolFinder && stagUserSchoolSelection ) {
        stagAppNextState = STAG_APP_STATES.GradeSelection;
    } 
 
    else if ( stagAppNextState === STAG_APP_STATES.SchoolFinderResults && validSchoolSearchInput() ) {
        findSchool();
    }


    if ( stagAppNextState  == STAG_APP_STATES.InstructionsDialog)
        getSchoolCourses();

    console.log(STAG_APP_STATE_RENDER_FUNCTIONS[stagAppNextState].name);

    if ( stagAppNextState != stagAppState )
    {
        $(STAG_MAIN_MODAL).hide();
        setAppState(stagAppNextState);
    }
}

function setAppState(state) {   
    clearRenderableAreas();
    stagAppState = state;    
    STAG_APP_STATE_RENDER_FUNCTIONS[stagAppState]();
}

function clearRenderableAreas() {
    $(STAG_MODAL_AUX_BUTTON).hide();
    $(STAG_MODAL_TITLE).text('');
    $(STAG_MODAL_BODY).text('');
    $(STAG_MODAL_BUTTON).removeAttr('disabled');
}

function showModal()
{
    $(STAG_MAIN_MODAL).fadeIn('fast');
    $(STAG_MAIN_MODAL).focus();
}

function showModalAuxButton(options) {
    $(STAG_MODAL_AUX_BUTTON).text(options.text);
    stagAppModalAuxButtonAction = options.action ;                         
    $(STAG_MODAL_AUX_BUTTON).show();
}

function findSchool() {
    let searchResults = STAG_APP_SCHOOL_DATA.results.filter(
        function(item) {
            let school = item.name.toLowerCase();
            if ( item.details.address && item.details.closedAsOf === null ) {
                if ( school === stagUserSchoolFinderSearchText ||
                     school.startsWith(stagUserSchoolFinderSearchText) ||
                     school.includes(stagUserSchoolFinderSearchText)  ) {
                    return item;
                }
            }
        });

    stagSchoolFinderSearchResults = searchResults;
    console.log(stagSchoolFinderSearchResults);    
}

function validSchoolSearchInput()
{
    if ( $(STAG_SCHOOL_FINDER_TEXT).val().trim() ) {
        $(STAG_SCHOOL_FINDER_FORM_GROUP).hide();
        $(STAG_MODAL_BUTTON).prop('disabled', 'true');
        $(STAG_SCHOOL_FINDER_PROGRESS_BAR).show();
        stagUserSchoolFinderSearchText = $(STAG_SCHOOL_FINDER_TEXT).val().toLowerCase().trim();
        return true;
    } 
    
    else {        
        alert('You must enter a school\s name to search!');
        $(STAG_SCHOOL_FINDER_TEXT).val('');
        --stagAppNextState;
        if ( !$(STAG_SCHOOL_FINDER_FORM_GROUP).hasClass('has-error') )
            $(STAG_SCHOOL_FINDER_FORM_GROUP).toggleClass('has-error');
        $(STAG_SCHOOL_FINDER_TEXT).focus();
        return false;
    }    
}

///////////////////////////////////////////////////////////////////////////////
// Reder Functions
///////////////////////////////////////////////////////////////////////////////
function renderInitialState() {    
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
    showModalAuxButton( {
                    text : 'Nevermind',
                    action : function() { window.location.href = 'https://google.com'; }
                });
    showModal();
}

function renderSchoolSelectionState() {
    $(STAG_MODAL_TITLE).text('School Selection');
    showModalAuxButton( 
                    {
                        text : 'Find My School',
                        action : function(){ stagUserSchoolSelection = null; nextState(); }
                    });

    
    $(STAG_MODAL_BODY).append( 
            "<p>We found some high schools that are near your city (" + 
            stagUserLocationCities[0].replace(', USA', '') + "). \
            Select your school from the drop down below. If you \
            you don't see your school, click on the Find My School button \
            to search for your school.</p> \
            <form class=\"form-horizontal\"> \
                <label for=\"js-stag-school-select\" >Select School</label> \
                <select name=\"stag-school-select\" id=\"js-stag-school-select\" \
                class=\"form-control\" required>\
                </select>\
            </form>");

    $(STAG_SCHOOL_SELECT).append('<option value="">No Selection</option>');
    stagUserLocalSchools.map(
        function(item) {
            $(STAG_SCHOOL_SELECT).append('<option value="' + item.id + '">' + item.name + '</option>');
        }
    )

    $(STAG_SCHOOL_SELECT).on('change', 
        function() { 
            stagUserSchoolSelection = $(this).prop('value');
            console.log(`school selection changed: ${stagUserSchoolSelection}` );
        });

    showModal();
}

function renderSchoolFinderState() {
    $(STAG_MODAL_TITLE).text('School Finder');

    $(STAG_MODAL_BODY).append( 
            `<p>You can search for any high school in California by name. 
                Enter your school's name and hit enter or click OK to search for 
                your school.</p>
            <form class="form-horizontal">
                <div class="form-group js-stag-school-finder-input-group">             
                    <label for="js-stag-school-finder-text" >School Name</label> 
                    <input class="form-control" type="text" 
                    name="stag-school-finder-text" id="js-stag-school-finder-text" required />
                </div>
            </form>
            <div class="progress progress-striped active js-stag-school-finder-progress-bar"> 
                <div class="progress-bar" style="width: 100%"></div>
            </div>`);

    $(STAG_SCHOOL_FINDER_TEXT).keydown(
        function(event) {
            if ( event.which == 13 ) {
                event.preventDefault();
                nextState();
            }
        });

    showModal();
}

function renderSchoolFinderResultsState() {
    $(STAG_MODAL_TITLE).text('School Finder Results');

    $(STAG_MODAL_BODY).append( 
            `<p>Here are the results for your search. 
                Select your school from the list. If you don't see 
                your school, you can click Search Again to find a new 
                school. </p> 
            <form class="form-horizontal"> 
                <label for="js-stag-school-select" >Select School</label> 
                <select name="stag-school-select" id="js-stag-school-select" class="form-control" required>
                </select>
            </form>`);

    $(STAG_SCHOOL_SELECT).append('<option value="">No Selection</option>');

    if ( stagSchoolFinderSearchResults) {
        stagSchoolFinderSearchResults.map(
            function(item) {
                let displayText = item.name + ' (' + item.details.address.city + ', ' + item.details.address.state + ')';
                $(STAG_SCHOOL_SELECT).append('<option value="' + item.id + '">' + displayText + '</option>');
            }
        );
    }

    $(STAG_SCHOOL_SELECT).on('change', 
        function() { 
            stagUserSchoolSelection = $(this).prop('value');
            console.log(`school selection changed: ${stagUserSchoolSelection}` );

            if (!stagUserSchoolSelection)
                $(STAG_MODAL_BUTTON).prop('disabled', 'true');
            else
                $(STAG_MODAL_BUTTON).removeAttr('disabled');
        });

    showModalAuxButton( 
                    {
                        text : 'Search Again',
                        action : function(){ 
                                    stagSchoolFinderSearchResults = null; 
                                    stagUserSchoolSelection = null;
                                    stagAppNextState = STAG_APP_STATES.SchoolSelection;
                                    nextState(); 
                                }
                    });
    $(STAG_MODAL_BUTTON).prop('disabled', 'true');
    showModal();
}

function renderGradeSelectionState() {
    $(STAG_MODAL_TITLE).text('Grade Selection');

    $(STAG_MODAL_BODY).append( 
            `<p>What grade are you in?</p> 
            <form class="form-horizontal"> 
                <label for="js-stag-school-select" >Select Grade</label> 
                <select name="stag-school-select" id="js-stag-school-select" class="form-control" required>
                </select>
            </form>`);

    $(STAG_SCHOOL_SELECT).append('<option value="">No Selection</option>');


    [ 9, 10, 11, 12 ].map(
        function(item) {
            $(STAG_SCHOOL_SELECT).append('<option value="' + item + '">' + item + 'th</option>');
        }
    );

    $(STAG_SCHOOL_SELECT).on('change', 
        function() { 
            stagUserGrade = $(this).prop('value');
            console.log(`grade selection changed: ${stagUserGrade}` );

            if (!stagUserGrade)
                $(STAG_MODAL_BUTTON).prop('disabled', 'true');
            else
                $(STAG_MODAL_BUTTON).removeAttr('disabled');
        });

    $(STAG_MODAL_BUTTON).prop('disabled', 'true');
    showModal();
}

function renderInstructionsState(){
    $(STAG_MODAL_TITLE).text('Instructions');
    showModal();
}

function renderCourseSelectionState() {

}

///////////////////////////////////////////////////////////////////////////////
// Geo Location
///////////////////////////////////////////////////////////////////////////////
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(setUserLocationLongLat);        
    }
}

function setUserLocationLongLat(position) {
    stagUserLocationLongitute = position.coords.longitude;
    stagUserLocationLatitude = position.coords.latitude;    
    console.log( 'Longitude: ' + stagUserLocationLongitute);
    console.log( 'Latitude: ' + stagUserLocationLatitude);
    getUserLocality();
}

function getUserLocality() {
    let params = {
                    latlng : stagUserLocationLatitude + ',' + stagUserLocationLongitute,
                    key : STAG_GOOGLE_GEOCODING_APIKEY
                 }
    $.getJSON(STAG_GOOGLE_GEOCODING_APIURL, params, parseLocality); 
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
    getLocalHighSchools();
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

    stagUserLocalSchools = schools.sort(function(item1, item2){ return item1 > item2; });
    console.log(stagUserLocalSchools);

    if (stagUserLocalSchools && stagUserLocalSchools.length > 0)
        stagUserLocationAvailable = true;
}

///////////////////////////////////////////////////////////////////////////////
// Course Lookup
///////////////////////////////////////////////////////////////////////////////
function getSchoolCourses()
{
    $.get(STAG_UC_COURSESEARCH_APIURL.replace('****', stagUserSchoolSelection), parseCourseList);
}

function parseCourseList(results)
{
    stagSchoolCourseList = results.courses.map(
        function(course) {
            return {
                title : coouse.title,
                subjectName : course.disciplineName,
                subjectArea : course.subjectAreaCode,
                isHonors : course.isHonors,
                isOnline : course.isOnline,
                isClassroomBased : course.isClassroomBased,
                length : course.courseLengthId,
                transcriptAbbreviations : course.transcriptAbbreviations
            }
        });

    console.log(stagSchoolCourseList);    
}