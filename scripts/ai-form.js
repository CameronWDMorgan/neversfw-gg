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
    const data = {
        prompt: formData.get('prompt'),
        negativeprompt: formData.get('negativeprompt'),
        width: formData.get('width'),
        height: formData.get('height'),
        steps: formData.get('steps'),
        model: "furry",
        quantity: 4
    };

    try {
        document.getElementById('response').innerText = "Requesting Image, please wait...";
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
        
                    console.log(positionData)
        
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
                                console.log(image)
                                const imageElement = document.createElement('img');
                                imageElement.src = 'data:image/png;base64,' + image.base64
                                imageElement.style.display = 'inline'
                                imageElement.style.width = '256px'
                                imageElement.style.height = '256px'
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
        }
    } catch (error) {
        console.error('An error occurred:', error);
        document.getElementById('response').innerText = "An error occurred: " + error.message;
        generateButton.disabled = false;
        generateButton.textContent = 'Generate Image';
        generateButton.classList.remove('generating');
    }
})