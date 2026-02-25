

class ImageLoader {
  constructor() {
    this.images = {}; // Create an empty dictionary to store the images
  }

  // Method to load an image
  loadImage(name, src, frameWidth, frameHeight, frameRate) {
    return new Promise((resolve, reject) => {
      // Create an image object
      var image = new Image();

      // Set the source of the image
      image.src = src;

      // Handle the image load event
      image.onload = function() {

        image.frameWidth = frameWidth;
        image.frameHeight = frameHeight;
        image.frameRate = frameRate ? frameRate : 0;
        image.frameCount = Math.floor(image.width / image.frameWidth) * Math.floor(image.height / image.frameHeight);

        // Add the image to the dictionary
        this.images[name] = image;
        resolve(image);
      }.bind(this);

      // Handle the image error event
      image.onerror = function() {
        reject(new Error("Failed to load image: " + src));
      };
    });
  }
}

