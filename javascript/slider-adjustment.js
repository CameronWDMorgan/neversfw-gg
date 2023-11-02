// Function to update the display of the slider value
function updateSliderDisplay(slider, outputElementId) {
    let outputElement = document.getElementById(outputElementId);
    outputElement.innerText = slider.value;

    // Add an event listener to update the value as the slider is moved
    slider.oninput = function() {
        outputElement.innerText = this.value;
    };
}

// Initialize the slider displays on page load
window.onload = function() {
    updateSliderDisplay(document.getElementById('width'), 'widthValue');
    updateSliderDisplay(document.getElementById('height'), 'heightValue');
    updateSliderDisplay(document.getElementById('steps'), 'stepsValue');
};
