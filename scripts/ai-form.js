function getDefaultHeaders() {
    return {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'your-value-here' // Replace with your actual header value
    };
}

document.getElementById('generatorForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Disable the button and change its text
    const generateButton = document.getElementById('generateButton');
    generateButton.disabled = true;
    generateButton.textContent = 'Generating Image';
    generateButton.classList.add('generating'); // Add the 'generating' class when the process starts
    
    const API_BASE = 'https://neversfw.ngrok.dev'; // Set the base URL to the specified IP address

    const formData = new FormData(event.target);

    console.log(formData)

    let targetSteps = formData.get('steps')
    let targetModel = formData.get('model')

    let targetWidth = 512
    let targetHeight = 512

    if(formData.get('aspectRatio') == "Portrait") {
        console.log("Portrait")
        targetWidth = 512
        targetHeight = 768
    } else if (formData.get('aspectRatio') == "Landscape") {
        console.log("Landscape")
        targetWidth = 768
        targetHeight = 512
    }


    targetQuantity = formData.get('quantity')

    if(targetQuantity > 6 || targetQuantity < 0) {
        if(targetSteps > 100) {
            targetQuantity = 1
        }
    }

    if(targetSteps > 150 || targetSteps < 0) {
        if(targetQuantity > 3) {
            targetSteps = 20
        }
        
    }

    targetQuantity = Number(targetQuantity)
    targetSteps = Number(targetSteps)

    let savedloras = {
        style: $('#style-lora').val(),
        effect: $('#effect-lora').val(),
        concept: $('#concept-lora').val(),
        clothing: $('#clothing-lora').val(),
        character: $('#character-lora').val()
    };



    console.log(`H${targetHeight} W${targetWidth} S${targetSteps} Q${targetQuantity} M${targetModel}`)

    // Get the image file from the file input
    const imageInput = document.getElementById('uploadedImage');
    if (imageInput.files && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    const styleLoraSelect = document.getElementById('style-lora');
    const selectedStyleLoraOptions = Array.from(styleLoraSelect.options)
        .filter(option => option.selected)
        .map(option => option.value);

    const effectLoraSelect = document.getElementById('effect-lora');
    const selectedEffectLoraOptions = Array.from(effectLoraSelect.options)
        .filter(option => option.selected)
        .map(option => option.value);

    const conceptLoraSelect = document.getElementById('concept-lora');
    const selectedConceptLoraOptions = Array.from(conceptLoraSelect.options)
        .filter(option => option.selected)
        .map(option => option.value);

    const clothingLoraSelect = document.getElementById('clothing-lora');
    const selectedClothingLoraOptions = Array.from(clothingLoraSelect.options)
        .filter(option => option.selected)
        .map(option => option.value);

    const characterLoraSelect = document.getElementById('character-lora');
    const selectedCharacterLoraOptions = Array.from(characterLoraSelect.options)
        .filter(option => option.selected)
        .map(option => option.value);

    let combinedLora = []

    combinedLora = combinedLora.concat(selectedStyleLoraOptions)
    combinedLora = combinedLora.concat(selectedEffectLoraOptions)
    combinedLora = combinedLora.concat(selectedConceptLoraOptions)
    combinedLora = combinedLora.concat(selectedClothingLoraOptions)
    combinedLora = combinedLora.concat(selectedCharacterLoraOptions)

    function getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
    
    checkbox = document.getElementById('img2imgCheckbox')
    // Usage
    console.log(checkbox.checked)

    let imageBase64

    if(checkbox.checked) {
        console.log("AAAAAAAAAAAAAAAAAAAAa")
        let file = document.getElementById('uploadedImage').files[0];
        imageBase64 = await getBase64(file)
    } else {

    }
    
    
    const data = {
        prompt: formData.get('prompt'),
        negativeprompt: formData.get('negativeprompt'),
        width: targetWidth,
        height: targetHeight,
        steps: targetSteps,
        model: targetModel,
        quantity: targetQuantity,
        lora: combinedLora,
        image: imageBase64,
        strength: formData.get('img2imgStrength'),
        guidance: formData.get('cfguidance'),
        savedloras: savedloras
    };

    try {
        document.getElementById('response').innerText = "Requesting Image, please wait...";

        // POSTs to the autosaving thingy, uses mongodb
        fetch('/ai-generate', {
            method: 'POST',
            headers: getDefaultHeaders(), // Set the headers for the POST request
            body: JSON.stringify(data)
        })

        const response = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: getDefaultHeaders(), // Set the headers for the POST request
            body: JSON.stringify(data)
        });

        const jsonResponse = await response.json();


        if (jsonResponse.status === "queued") {
            // Display initial queue position to the user
            document.getElementById('queuePosition').style.display = 'block';
            document.getElementById('positionNumber').innerText = jsonResponse.position;
            document.getElementById('response').innerText = "Your image is being generated, please wait...";
            

            // Replace setInterval with a while loop
            let isCompleted = false;
            while (!isCompleted) {
                try {
                    const positionResponse = await fetch(`${API_BASE}/queue_position/${jsonResponse.request_id}`, {
                        method: 'GET',
                        headers: getDefaultHeaders() // Set the headers for the GET request
                    });
                    const positionData = await positionResponse.json();
                
                    if(positionData.status == "not found") {
                        document.getElementById('response').innerText = "An error occurred: " + positionData.message;
                        generateButton.disabled = false;
                        generateButton.classList.remove('generating'); // Remove the class when there's an error
                        break; // Exit the loop if there's an error
                    }
                    
                    if (positionData.status === "waiting") {
                        document.getElementById('positionNumber').innerText = positionData.position;
                        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 1 second before the next check
                    } else if (positionData.status === "completed") {
                        document.getElementById('response').innerText = "Your image is ready and will be displayed shortly...";
                        isCompleted = true; // Set the flag to exit the loop
                        document.getElementById('queuePosition').style.display = 'none';
                        const resultResponse = await fetch(`${API_BASE}/result/${positionData.request_id}`, {
                            method: 'GET',
                            headers: getDefaultHeaders()
                        });
                
                        if (resultResponse.ok) {
                            const base64Images = await resultResponse.json();

                            document.getElementById('imagesContainer').innerHTML = ''
                
                            // Assuming the server responds with an array of Base64 encoded images
                            base64Images.forEach(image => {
                                const imageElement = document.createElement('img');
                                imageElement.src = 'data:image/png;base64,' + image.base64
                                imageElement.style.display = 'inline'
                                imageElement.style.width = 'auto'
                                imageElement.style.height = 'auto'
                                document.getElementById('imagesContainer').appendChild(imageElement);
                            });
                        } else {
                            // Handle errors or different response types
                            console.error('Failed to get images:', await resultResponse.text());
                        }
                        generateButton.disabled = false;
                    }
                } catch (error) {
                    console.error('An error occurred during position check:', error);
                    document.getElementById('response').innerText = "An error occurred: " + error.message;
                    generateButton.disabled = false;
                    generateButton.textContent = 'Generate Image';
                    generateButton.classList.remove('generating');
                    break; // Exit the loop if there's a fetch error
                }
            }
            // After the loop, you can re-enable the button if needed
            generateButton.disabled = false;
            generateButton.textContent = 'Generate Image';
            generateButton.classList.remove('generating');
            document.getElementById('response').innerText = ''
            populateImagesSrcList();
        }
    } catch (error) {
        console.error('An error occurred:', error);
        document.getElementById('response').innerText = "An error occurred: " + error.message;
        generateButton.disabled = false;
        generateButton.textContent = 'Generate Image';
        generateButton.classList.remove('generating');
    }
})