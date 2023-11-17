showMoreCount = 0

// Global variable to store the active tab
var activeTab = '';

// Function to update the active tab
function updateActiveTab(tabName) {
activeTab = tabName;
}

var formSubmitted = false; // Variable to track if the form has been submitted
var cooldownDuration = 1000; // Cooldown duration in milliseconds (adjust as needed)
var cooldownTimeout = null; // Variable to store the cooldown timeout ID
var intervalDuration = 1000; // Interval duration in milliseconds (adjust as needed)
var intervalID = null; // Variable to store the interval ID

if(showMoreCount >= 1){
    cooldownDuration = 10
    intervalDuration = 10
}

intervalID = setInterval(function() {

    var offset = 5000; // Adjust the offset value as needed

    // Check if the user has scrolled close to the bottom of the page
    if ($(window).scrollTop() + $(window).height() >= $(document).height() - offset) {
    // Trigger form submission if not in cooldown period
    if (!formSubmitted && !isLoadingContent) {
        var pageTypeObject = pageTypes.find(pt => pt.name === tabToPageType[activeTab]);

        if (pageTypeObject && pageTypeObject.valid) {
            $('#showMoreForm' + pageTypeObject.name).submit();
            formSubmitted = true;
            isLoadingContent = true;
            showMoreCount++;
        } else {
            formSubmitted = false;
        }
    }
        cooldownTimeout = setTimeout(function() {
            formSubmitted = false;
        }, cooldownDuration);
    }
}, intervalDuration);


// Rest of your existing code for tab switching...

function openTab(evt, tabName) {
var i, tabcontent, tablinks;
tabcontent = document.getElementsByClassName("tabcontent");
for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
}
tablinks = document.getElementsByClassName("tablinks");
for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
}
document.getElementById(tabName).style.display = "block";
evt.currentTarget.className += " active";

// Update the active tab
updateActiveTab(tabName);
}

function openSubtab(evt, subtabName) {
var i, subtabcontent, subtablinks;
subtabcontent = document.getElementsByClassName("subtabcontent");
for (i = 0; i < subtabcontent.length; i++) {
    subtabcontent[i].style.display = "none";
}
subtablinks = document.getElementsByClassName("subtablinks");
for (i = 0; i < subtablinks.length; i++) {
    subtablinks[i].className = subtablinks[i].className.replace(" active", "");
}
document.getElementById(subtabName).style.display = "block";
evt.currentTarget.className += " active";

// Update the active tab
updateActiveTab(subtabName);
}

if(activeTab == '') {
    activeTab = activeTabToSet
}