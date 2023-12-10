function updateSliderDisplay() {
    // Update the displayed value for steps and quantity
    stepsValue = document.getElementById('steps').value
    stepsMax = document.getElementById('steps').max
    quantityValue = document.getElementById('quantity').value
    quantityMax = document.getElementById('quantity').max
    document.getElementById('stepsValue').innerText = `${stepsValue}/${stepsMax}`
    document.getElementById('quantityValue').innerText = `${quantityValue}/${quantityMax}`
}

function adjustImageQuantity() {
    const steps = document.getElementById('steps').value;
    const stepsProportion = (steps - 10) / (maxStepsCountWanted - 10);
    
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
    const maxSteps = Math.round(maxStepsCountWanted - imageProportion * (maxStepsCountWanted - 10));
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