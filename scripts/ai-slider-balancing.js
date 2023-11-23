function updateSliderDisplay() {
    // Update the displayed value for steps and quantity
    document.getElementById('stepsValue').innerText = document.getElementById('steps').value;
    document.getElementById('quantityValue').innerText = document.getElementById('quantity').value;
}

function adjustImageQuantity() {
    const steps = document.getElementById('steps').value;
    const stepsProportion = (steps - 20) / (maxStepsCountWanted - 20);
    
    // Adjust max image quantity based on steps proportion
    const maxImageQuantity = Math.round(maxImageQuantityWanted - stepsProportion * (maxImageQuantityWanted - 1));
    const imageQuantityInput = document.getElementById('quantity');
    imageQuantityInput.max = maxImageQuantity;
    
    if (imageQuantityInput.value > maxImageQuantity) {
        imageQuantityInput.value = maxImageQuantity;
    }
}

function adjustSteps() {
    const imageQuantity = document.getElementById('quantity').value;
    const imageProportion = (imageQuantity - 1) / (maxImageQuantityWanted - 1);
    
    // Adjust max steps based on image quantity proportion
    const maxSteps = Math.round(maxStepsCountWanted - imageProportion * (maxStepsCountWanted - 20));
    const stepsInput = document.getElementById('steps');
    stepsInput.max = maxSteps;
    
    if (stepsInput.value > maxSteps) {
        stepsInput.value = maxSteps;
    }
}

// Add event listeners to the sliders
document.getElementById('steps').addEventListener('input', function() {
    adjustImageQuantity();
    updateSliderDisplay();
});

document.getElementById('quantity').addEventListener('input', function() {
    adjustSteps();
    updateSliderDisplay();
});

// Initialize the sliders
window.onload = function() {
    adjustImageQuantity();
    adjustSteps();
    updateSliderDisplay();
};