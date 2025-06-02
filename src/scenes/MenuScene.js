import Phaser from "phaser";

class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
    this.username = "";
    this.errorText = null;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    this.add
      .text(width / 2, height / 4, "Merge Towers", {
        fontSize: "48px",
        fill: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Username input
    const inputBox = this.add.rectangle(
      width / 2,
      height / 2,
      300,
      50,
      0xffffff,
      0.2
    );
    const inputText = this.add
      .text(width / 2, height / 2, "Digite seu nome:", {
        fontSize: "24px",
        fill: "#fff",
      })
      .setOrigin(0.5);

    // Play button
    const playButton = this.add.rectangle(
      width / 2,
      height * 0.7,
      200,
      50,
      0x00ff00,
      0.5
    );
    const playText = this.add
      .text(width / 2, height * 0.7, "Jogar", {
        fontSize: "24px",
        fill: "#fff",
      })
      .setOrigin(0.5);

    // Make elements interactive
    inputBox.setInteractive();
    playButton.setInteractive();

    // Input handling
    inputBox.on("pointerdown", () => {
      this.scene.launch("InputScene", {
        callback: (text) => {
          this.username = text;
          inputText.setText(text || "Digite seu nome:");
        },
      });
    });

    // Play button handling
    playButton.on("pointerdown", async () => {
      if (!this.username || this.username.trim().length === 0) {
        this.showError("Por favor, digite seu nome!");
        return;
      }

      try {
        console.log("Sending request with username:", this.username); // Debug log
        const response = await fetch("http://localhost:3000/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: this.username.trim() }),
        });

        const data = await response.json();
        console.log("Server response:", data); // Debug log

        if (response.ok) {
          localStorage.setItem("userId", data.user.id);
          localStorage.setItem("username", this.username);
          this.scene.start("GameScene");
        } else {
          this.showError(data.error || "Erro ao criar usuário");
        }
      } catch (error) {
        console.error("Full error:", error); // More detailed error logging
        this.showError("Erro de conexão com o servidor");
      }
    });
  }

  showError(message) {
    if (this.errorText) {
      this.errorText.destroy();
    }

    this.errorText = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height * 0.8,
        message,
        {
          fontSize: "20px",
          fill: "#ff0000",
        }
      )
      .setOrigin(0.5);
  }
}

export default MenuScene;
