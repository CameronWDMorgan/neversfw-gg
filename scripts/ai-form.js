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

    let accountId = document.getElementById('user-session').value
    
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

    targetQuantity = Number(targetQuantity)
    targetSteps = Number(targetSteps)

    let savedloras = {
        style: $('#style-lora').val(),
        effect: $('#effect-lora').val(),
        concept: $('#concept-lora').val(),
        clothing: $('#clothing-lora').val(),
        character: $('#character-lora').val(),
        pose: $('#pose-lora').val(),
        background: $('#background-lora').val()
    };

    let targetGuidance = formData.get('cfguidance')


    let imageBase64


    console.log(`H${targetHeight} W${targetWidth} S${targetSteps} Q${targetQuantity} M${targetModel}`)

    // Get the image file from the file input
    const imageInput = document.getElementById('uploadedImage');
    if (imageInput.files && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    let combinedLora = []

    let advancedToggle = "on"

    // let advancedToggle = formData.get('advancedToggle')
    
    let enhance_prompt = formData.get('enhance_prompt')

    let inpainting_toggle = formData.get('inpaintingCheckbox')

    let inpaintingToggle = false

    if(inpainting_toggle == "on") {
        inpaintingToggle = true;
        
        // Get the mask with a black background
        const maskDataUrl = getMaskWithBlackBackground();
    
        // Append the mask image to the FormData
        formData.append('mask', maskDataUrl);

        originalImage = document.getElementById('imageLoader').files[0];
        
    }

    if(enhance_prompt == "on") {
        enhance_prompt = true
    }

    if(advancedToggle == "on") {
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

        const poseLoraSelect = document.getElementById('pose-lora');
        const selectedPoseLoraOptions = Array.from(poseLoraSelect.options)
            .filter(option => option.selected)
            .map(option => option.value);

        const backgroundLoraSelect = document.getElementById('background-lora');
        const selectedBackgroundLoraOptions = Array.from(backgroundLoraSelect.options)
            .filter(option => option.selected)
            .map(option => option.value);

        combinedLora = combinedLora.concat(selectedStyleLoraOptions)
        combinedLora = combinedLora.concat(selectedEffectLoraOptions)
        combinedLora = combinedLora.concat(selectedConceptLoraOptions)
        combinedLora = combinedLora.concat(selectedClothingLoraOptions)
        combinedLora = combinedLora.concat(selectedCharacterLoraOptions)
        combinedLora = combinedLora.concat(selectedPoseLoraOptions)
        combinedLora = combinedLora.concat(selectedBackgroundLoraOptions)

        console.log(combinedLora.length)

    } else {
        targetSteps = 20
        targetQuantity = 4
        targetGuidance = 5
    }

    function getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    if(document.getElementById('img2imgCheckbox').checked) {
        let file = document.getElementById('uploadedImage').files[0];
        imageBase64 = await getBase64(file)
    }
    if(document.getElementById('inpaintingCheckbox').checked) {
        let file = originalImage
        imageBase64 = await getBase64(file)
    }

    if(document.getElementById('controlNetImg2ImgCheckbox').checked) {
        let file = document.getElementById('controlNetImage').files[0];
        imageBase64 = await getBase64(file)
        controlNetCheckboxImg2ImgChecked = true
    } else {
        controlNetCheckboxImg2ImgChecked = false
    }

    if(document.getElementById('openposeCheckbox').checked) {
        imageBase64 = getOpenPoseCanvasDataUrl();
    }

    if(document.getElementById('inpaintingOriginalCheckbox').checked) {
        inpainting_original_option = true
    } else {
        inpainting_original_option = false
    }

    if(document.getElementById('img2imgCheckbox').checked) {
        reqType = "img2img"
    } else if(document.getElementById('inpaintingCheckbox').checked) {
        reqType = "inpainting"
    } else if(document.getElementById('controlNetImg2ImgCheckbox').checked) {
        reqType = "controlnet_img2img"
    } else if(document.getElementById('openposeCheckbox').checked) {
        reqType = "openpose"
    } else {
        reqType = "txt2img"
    }

     
    const data = {
        prompt: formData.get('prompt'),
        negativeprompt: formData.get('negativeprompt'),
        width: targetWidth,
        height: targetHeight,
        steps: targetSteps,
        seed: formData.get('seed'),
        model: targetModel,
        quantity: targetQuantity,
        lora: combinedLora,
        image: imageBase64,
        strength: formData.get('img2imgStrength'),
        guidance: targetGuidance,
        savedloras: savedloras,
        enhance_prompt: enhance_prompt,
        request_type: reqType,
        advancedMode: advancedToggle,
        inpainting: inpaintingToggle,
        inpaintingMask: formData.get('mask'),
        accountId: accountId,
        inpainting_original_option: inpainting_original_option,
    };

    try {
        document.getElementById('response').innerText = "Requesting Image, please wait...";

        // POSTs to the autosaving thingy, uses mongodb
        // fetch('/ai-generate', {
        //     method: 'POST',
        //     headers: getDefaultHeaders(), // Set the headers for the POST request
        //     body: JSON.stringify(data)
        // })

        const response = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: getDefaultHeaders(), // Set the headers for the POST request
            body: JSON.stringify(data)
        });

        const jsonResponse = await response.json();

        console.log(jsonResponse)

        if (jsonResponse.status === "error") {
            document.getElementById('response').innerText = "An error occurred: " + jsonResponse.message;
            generateButton.disabled = false;
            generateButton.textContent = 'Generate Image';
            generateButton.classList.remove('generating');
        }        


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

                    console.log(positionData)

                    if(positionData.status == "error") {
                        document.getElementById('response').innerText = "An error occurred: " + positionData.message;
                        generateButton.disabled = false;
                        generateButton.classList.remove('generating'); // Remove the class when there's an error
                        break; // Exit the loop if there's an error
                    }
                
                    if(positionData.status == "not found") {
                        document.getElementById('response').innerText = "An error occurred: " + positionData.message;
                        generateButton.disabled = false;
                        generateButton.classList.remove('generating'); // Remove the class when there's an error
                        break; // Exit the loop if there's an error
                    }
                    
                    if (positionData.status == "waiting") {
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
                            const results = await resultResponse.json();

                            base64Images = results.images

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

                            additionalInfo = results.additionalInfo

                            console.log(results)
                            
                            executionshort = additionalInfo.executiontime.toFixed(2)

                            let infoElement = document.getElementById('additionalInfo').innerHTML = 
                                `<p>Seed: ${additionalInfo.seed}<br>` +
                                `Execution Time: ${executionshort}s</p>`;

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