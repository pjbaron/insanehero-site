// Input.js - Keyboard/mouse/touch abstraction

export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    // Key states
    this.keys = new Map();
    this.keysJustPressed = new Set();
    this.keysJustReleased = new Set();

    // Mouse/touch state
    this.mouse = { x: 0, y: 0 };
    this.mouseDown = false;
    this.mouseJustPressed = false;
    this.mouseJustReleased = false;

    this.setupListeners();
  }

  setupListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Mouse
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Touch (map to mouse)
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));

    // Prevent context menu on canvas
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onKeyDown(e) {
    const key = e.key.toLowerCase();
    if (!this.keys.get(key)) {
      this.keysJustPressed.add(key);
    }
    this.keys.set(key, true);

    // Prevent default for game keys
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) {
      e.preventDefault();
    }
  }

  onKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keys.set(key, false);
    this.keysJustReleased.add(key);
  }

  onMouseDown(e) {
    this.updateMousePosition(e);
    this.mouseDown = true;
    this.mouseJustPressed = true;
  }

  onMouseUp(e) {
    this.updateMousePosition(e);
    this.mouseDown = false;
    this.mouseJustReleased = true;
  }

  onMouseMove(e) {
    this.updateMousePosition(e);
  }

  updateMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  }

  onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      this.updateTouchPosition(e.touches[0]);
      this.mouseDown = true;
      this.mouseJustPressed = true;
    }
  }

  onTouchEnd(e) {
    e.preventDefault();
    this.mouseDown = false;
    this.mouseJustReleased = true;
  }

  onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      this.updateTouchPosition(e.touches[0]);
    }
  }

  updateTouchPosition(touch) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = touch.clientX - rect.left;
    this.mouse.y = touch.clientY - rect.top;
  }

  // Query methods
  isKeyDown(key) {
    return this.keys.get(key.toLowerCase()) === true;
  }

  isKeyJustPressed(key) {
    return this.keysJustPressed.has(key.toLowerCase());
  }

  isKeyJustReleased(key) {
    return this.keysJustReleased.has(key.toLowerCase());
  }

  isLeft() {
    return this.isKeyDown('arrowleft') || this.isKeyDown('a');
  }

  isRight() {
    return this.isKeyDown('arrowright') || this.isKeyDown('d');
  }

  isAction() {
    return this.isKeyJustPressed(' ') || this.isKeyJustPressed('enter') || this.mouseJustPressed;
  }

  // Call at end of update to clear just-pressed states
  endFrame() {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.mouseJustPressed = false;
    this.mouseJustReleased = false;
  }
}
