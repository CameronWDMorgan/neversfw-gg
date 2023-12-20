document.addEventListener('DOMContentLoaded', function() {
    var displayCanvas = document.getElementById('displayCanvas');
    var displayCtx = displayCanvas.getContext('2d');
    var maskCanvas = document.getElementById('maskCanvas'); // Changed to 'maskCanvas'
    var maskCtx = maskCanvas.getContext('2d');
    var imageLoader = document.getElementById('imageLoader');
    var img = new Image();
    var drawing = false;

    function handleImage(e) {
        var reader = new FileReader();
        reader.onload = function(event) {
            img.onload = function() {
                // Set up the canvases
                displayCanvas.width = maskCanvas.width = img.width;
                displayCanvas.height = maskCanvas.height = img.height;

                // Draw the image on the display canvas
                displayCtx.drawImage(img, 0, 0);

                // Clear the mask canvas
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(e.target.files[0]);
    }

    function draw(e) {
        if (!drawing) return;
    
        // Get the bounding rectangle of the canvas
        var rect = displayCanvas.getBoundingClientRect();
    
        // Calculate the mouse position relative to the canvas
        var scaleX = displayCanvas.width / rect.width;    // relationship bitmap vs. element for X
        var scaleY = displayCanvas.height / rect.height;  // relationship bitmap vs. element for Y
    
        var x = (e.clientX - rect.left) * scaleX; // scale mouse coordinates after they have
        var y = (e.clientY - rect.top) * scaleY;  // been adjusted to be relative to element
    
        maskCtx.lineWidth = 20;
        maskCtx.lineCap = 'round';
        maskCtx.strokeStyle = 'white';
    
        maskCtx.lineTo(x, y);
        maskCtx.stroke();
        maskCtx.beginPath();
        maskCtx.moveTo(x, y);

        // Update display canvas
        displayCtx.drawImage(img, 0, 0); // Redraw image
        displayCtx.drawImage(maskCanvas, 0, 0); // Draw mask on top
    }

    function startDrawing(e) {
        drawing = true;
        draw(e);
    }

    function endDrawing() {
        drawing = false;
        maskCtx.beginPath();
    }

    window.getMaskWithBlackBackground = function() {
        var finalCanvas = document.createElement('canvas');
        var finalCtx = finalCanvas.getContext('2d');

        finalCanvas.width = maskCanvas.width;
        finalCanvas.height = maskCanvas.height;

        finalCtx.fillStyle = 'black';
        finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        finalCtx.drawImage(maskCanvas, 0, 0);

        return finalCanvas.toDataURL(); // Return the final mask as a data URL
    };

    maskCanvas.addEventListener('mousedown', startDrawing);
    maskCanvas.addEventListener('mouseup', endDrawing);
    maskCanvas.addEventListener('mousemove', draw);
    imageLoader.addEventListener('change', handleImage);
});
