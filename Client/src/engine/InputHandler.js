/**
 * InputHandler - Manages keyboard and mouse input for the game
 * Provides direction, aim, and action states
 */
export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.mvtSpeed = 3;

    // Input state
    this.direction = { x: 0, y: 0 };
    this.aim = { x: 0, y: 0 };
    this.click = false;
    this.plant = false;
    this.escapePressed = false;

    // Scale for coordinate conversion
    this.scale = 1;

    // Bind handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);

    this._setupListeners();
  }

  _setupListeners() {
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("click", this._onClick);
  }

  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("click", this._onClick);
  }

  setScale(scale) {
    this.scale = scale;
  }

  _onKeyDown(event) {
    switch (event.code) {
      case "KeyD":
      case "ArrowRight":
        this.direction.x = this.mvtSpeed;
        break;
      case "KeyQ":
      case "KeyA":
      case "ArrowLeft":
        this.direction.x = -this.mvtSpeed;
        break;
      case "KeyZ":
      case "KeyW":
      case "ArrowUp":
        this.direction.y = -this.mvtSpeed;
        break;
      case "ArrowDown":
      case "KeyS":
        this.direction.y = this.mvtSpeed;
        break;
      case "Space":
        this.plant = true;
        break;
      case "Escape":
        this.escapePressed = true;
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.code) {
      case "KeyD":
      case "ArrowRight":
        if (this.direction.x > 0) this.direction.x = 0;
        break;
      case "KeyQ":
      case "KeyA":
      case "ArrowLeft":
        if (this.direction.x < 0) this.direction.x = 0;
        break;
      case "KeyZ":
      case "ArrowUp":
      case "KeyW":
        if (this.direction.y < 0) this.direction.y = 0;
        break;
      case "KeyS":
      case "ArrowDown":
        if (this.direction.y > 0) this.direction.y = 0;
        break;
    }
  }

  _onMouseMove(event) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    this.aim = { x: mouseX / this.scale, y: mouseY / this.scale };
  }

  _onClick(event) {
    this.click = true;
  }

  // Get current input state and reset one-shot actions
  getInputState() {
    const state = {
      direction: { ...this.direction },
      aim: { ...this.aim },
      click: this.click,
      plant: this.plant,
      escapePressed: this.escapePressed,
    };

    // Reset one-shot actions
    this.click = false;
    this.plant = false;
    this.escapePressed = false;

    return state;
  }
}
