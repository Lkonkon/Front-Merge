import Phaser from "phaser";

class InputScene extends Phaser.Scene {
  constructor() {
    super("InputScene");
  }

  init(data) {
    this.callback = data.callback;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create input element
    const element = document.createElement("input");
    element.type = "text";
    element.style = `
      position: absolute;
      left: ${width / 2 - 150}px;
      top: ${height / 2 - 25}px;
      width: 300px;
      height: 50px;
      font-size: 24px;
      text-align: center;
      background: rgba(255, 255, 255, 0.8);
      border: none;
      border-radius: 5px;
    `;

    document.body.appendChild(element);
    element.focus();

    // Handle input
    element.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const text = element.value.trim();
        if (text) {
          this.callback(text);
          element.remove();
          this.scene.stop();
        }
      }
    });

    // Handle click outside
    this.input.on("pointerdown", (pointer) => {
      if (
        pointer.y < height / 2 - 25 ||
        pointer.y > height / 2 + 25 ||
        pointer.x < width / 2 - 150 ||
        pointer.x > width / 2 + 150
      ) {
        element.remove();
        this.scene.stop();
      }
    });
  }
}

export default InputScene;
