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
    
    const API_BASE = 'https://major-mangos-smash.loca.lt'; // Set the base URL to the specified IP address

    const formData = new FormData(event.target);
    const data = {
        prompt: formData.get('prompt'),
        negativeprompt: formData.get('negativeprompt'),
        width: formData.get('width'),
        height: formData.get('height'),
        steps: formData.get('steps'),
        model: "furry"
    };

    try {
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

            let checkPositionInterval = setInterval(async () => {
                const positionResponse = await fetch(`${API_BASE}/queue_position/${jsonResponse.request_id}`, {
                    method: 'GET',
                    headers: getDefaultHeaders() // Set the headers for the GET request
                });
                const positionData = await positionResponse.json();
                
                if (positionData.status === "waiting") {
                    document.getElementById('positionNumber').innerText = positionData.position;
                } else if (positionData.status === "completed") {
                    clearInterval(checkPositionInterval);
                    document.getElementById('queuePosition').style.display = 'none';
                    const resultResponse = await fetch(`${API_BASE}/result/${positionData.request_id}`, {
                        method: 'GET',
                        headers: getDefaultHeaders() // Set the headers for the GET request
                    });
                    // Assuming the server responds with an image directly and not a JSON object
                    if (resultResponse.ok && resultResponse.headers.get('Content-Type').includes('image')) {
                        generateButton.disabled = false;
                        generateButton.textContent = 'Generate Image';
                        generateButton.classList.remove('generating'); // Also remove the 'generating' class here
                        // The response is an image
                        const imageUrl = URL.createObjectURL(await resultResponse.blob());
                        document.getElementById('generatedImage').src = imageUrl;
                        document.getElementById('generatedImage').style.display = 'inline';
                    } else {
                        // Handle any other type of response
                        const textResponse = await resultResponse.text(); // Fallback to text to see the response
                        console.error('Failed to get image:', textResponse);
                        // You might want to display an error to the user or retry the request
                    }
                    // Re-enable the submit button
                    generateButton.disabled = false;
                }
            }, 1000);
        } else {
            document.getElementById('response').innerText = "Failed to generate image. Please try again.";
            // Re-enable the submit button
            generateButton.disabled = false;
        }

    } catch (error) {
        document.getElementById('response').innerText = "An error occurred: " + error.message;
        // Re-enable the submit button in case of an error
        document.getElementById('response').innerText = "An error occurred: " + error.message;
        generateButton.disabled = false;
        generateButton.classList.remove('generating'); // Remove the class when there's an error
    }

});
