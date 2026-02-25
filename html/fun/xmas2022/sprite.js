

class Sprite {

  static popupRange = 160;

  constructor(type, name, picture, x, y, imageLoader) {
    this.type = type;
    this.name = name;
    this.picture = picture;
    this.imageLoader = imageLoader;

    // Obtain the image
    this.image = this.imageLoader.images[this.picture];

    this.currentFrame = 0;

    this.visible = false;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.pivot = { x: 0.5, y: 0.5 };
    this.anchor = { x: 0, y: 0 };
    this.scale = { x: 1, y: 1 };
    this.state = "init";
  }

  // Method to draw the sprite on the canvas
  draw() {

    if (!this.visible)
      return;

    // Calculate the current frame based on the frame rate and elapsed time
    this.currentFrame = (this.image.frameRate == 0) ? 0 : Math.floor(Date.now() / (1000 / this.image.frameRate)) % this.image.frameCount;

    ctx.save();

    // Translate the canvas origin to the centre of the Sprite
    ctx.translate(this.x, this.y);

    // Rotate the canvas around the origin
    ctx.rotate(this.angle);

    if (this.pivot)
      ctx.translate(-this.pivot.x * this.scale.x * this.image.frameWidth, -this.pivot.y * this.scale.y * this.image.frameHeight);

    // Draw the current frame of the sprite sheet on the canvas
    ctx.drawImage(
      this.image,
      this.currentFrame * this.image.frameWidth, // x position of the frame on the sprite sheet
      0, // y position of the frame on the sprite sheet
      this.image.frameWidth, // width of the frame
      this.image.frameHeight, // height of the frame
      0,
      0,
      this.image.frameWidth * this.scale.x, // width of the frame on the canvas
      this.image.frameHeight * this.scale.y // height of the frame on the canvas
    );

    // Restore the canvas state
    ctx.restore();

    // Draw the collision boxes for debug only
    // if (this.rect)
    // {
    //   var p = new Path2D();
    //   p.rect(this.rect.x, this.rect.y, this.rect.wide, this.rect.high);
    //   ctx.stroke(p);
    // }
  }

  // Method to update the sprite every frame
  update() {
    switch(this.type)
    {
      case "static":
        break;
      case "bopper":
        this.hammerUpdate();
        break;
      case "bopped":
        this.boppedUpdate();
        break;
      default:
        return;
    }
    this.draw();
  }

  // Set the pivot point x,y as a percentage (0..1) of the sprite dimensions
  setPivot(x, y) {
    this.pivot = { x:x, y:y };
  }
  setAnchor(x, y) {
    this.anchor = { x:x, y:y };
  }
  setVisible(visible) {
    this.visible = visible;
  }
  setScale(x, y) {
    this.scale = { x:x, y:y };
  }

  intersects(rect1, rect2) {
    return !(rect1.x + rect1.wide < rect2.x || rect1.x > rect2.x + rect2.wide ||
            rect1.y + rect1.high < rect2.y || rect1.y > rect2.y + rect2.high);
  }


  hammerUpdate() {
    var newState = this.state != this.lastState;
    this.lastState = this.state;

    switch(this.state)
    {
      case "init":
        this.state = "wait";
        this.angle = 45 * Math.PI / 180;
        break;
      case "wait":
        this.x = mouseX - this.anchor.x * this.image.frameWidth;
        this.y = mouseY - this.anchor.y * this.image.frameHeight;
        if (mouseDown)
        {
          this.state = "bop";
          mouseDown = false;
        }
        break;
      case "bop":
        if (newState)
        {
          this.x = mouseX - this.anchor.x * this.image.frameWidth;
          this.y = mouseY - this.anchor.y * this.image.frameHeight;
        }
        this.angle -= deltaTime * this.image.frameRate;
        if (this.angle < 0)
        {
          this.rect = { x: mouseX - 20, y: mouseY - 90, wide: 40, high: 180 };
          forEachSprite(this, function(_this, sprite) {
            if (!sprite || sprite.name == _this.name) return;
            if (!sprite.visible) return;
            if (sprite.state != "appear") return;
            if (!sprite.rect) return;
            if (_this.intersects(_this.rect, sprite.rect))
              sprite.state = "bopped";
            return;
          });
        }
        if (this.angle < -45 * Math.PI / 180)
        {
          this.angle = 45 * Math.PI / 180;
          this.state = "wait";
        }
        break;
    }
  }


  boppedUpdate() {
    var newState = this.state != this.lastState;
    this.lastState = this.state;

    switch(this.state)
    {
      case "init":
        this.visible = false;
        this.startY = this.y;
        this.state = "wait";
        this.delay = 2 + Math.random() * 4;
        this.picture = "target" + Math.floor(Math.random() * 9).toString();
        this.image = this.imageLoader.images[this.picture];
        if (this.picture == "target7")
          this.speed = 5;
        else
          this.speed = 1 + Math.random() * 2;
        break;

      case "wait":
        this.delay -= deltaTime;
        if (this.delay <= 0)
        {
          this.state = "appear";
        }
        break;

      case "appear":
        if (newState)
        {
          this.visible = true;
          this.count = 0;
        }
        this.count += deltaTime;
        this.offsetY = Math.sin(this.count * this.speed) * Sprite.popupRange;
        this.y = this.startY - this.offsetY;

        this.rect = { x: this.x - this.image.frameWidth * this.pivot.x * this.scale.x, y: this.y - this.image.frameHeight * this.pivot.y * this.scale.y, wide: this.image.frameWidth * this.scale.x, high: this.image.frameHeight * this.scale.y };

        if (this.offsetY < 0)
        {
          this.y = this.startY;
          this.visible = false;
          this.delay = 1 + Math.random() * 5;
          this.state = "init";
        }
        break;

      case "bopped":
        if (newState)
        {
          if (this.picture == "target7" && Math.random() < 0.5)
            sfx["xmas_pete"].play();
          else if (this.picture == "target8" && Math.random() < 0.5)
            sfx["xmas_julie"].play();
          else
            sfx[this.picture].play();
        }
        this.offsetY *= 0.9;
        this.y = this.startY - this.offsetY;
        if (this.offsetY < 1.0)
        {
          scoreUp(1);
          this.y = this.startY;
          this.visible = false;
          this.state = "init";
        }
        break;
    }
  }
}
