import Phaser from "phaser";

class RankingScene extends Phaser.Scene {
  constructor() {
    super("RankingScene");
  }

  preload() {}

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add
      .text(width / 2, 60, "Ranking - Top 10", {
        fontSize: "36px",
        fill: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Carregar ranking do backend
    let ranking = [];
    try {
      const res = await fetch("http://localhost:3000/api/ranking");
      ranking = await res.json();
    } catch (e) {
      this.add
        .text(width / 2, height / 2, "Erro ao carregar ranking", {
          fontSize: "24px",
          fill: "#ff0000",
        })
        .setOrigin(0.5);
      return;
    }

    // Cabeçalho
    this.add.text(width / 2 - 80, 120, "Nome", {
      fontSize: "22px",
      fill: "#ffe066",
    });
    this.add.text(width / 2 + 60, 120, "Score", {
      fontSize: "22px",
      fill: "#ffe066",
    });

    // Listar ranking
    ranking.forEach((item, i) => {
      this.add.text(
        width / 2 - 80,
        160 + i * 36,
        `${i + 1}. ${item.username}`,
        {
          fontSize: "20px",
          fill: "#fff",
        }
      );
      this.add.text(width / 2 + 60, 160 + i * 36, `${item.score}`, {
        fontSize: "20px",
        fill: "#fff",
      });
    });

    // Botão voltar
    const btn = this.add.rectangle(
      width / 2,
      height - 80,
      200,
      50,
      0x00ff00,
      0.5
    );
    const txt = this.add
      .text(width / 2, height - 80, "Voltar ao Menu", {
        fontSize: "22px",
        fill: "#fff",
      })
      .setOrigin(0.5);
    btn.setInteractive();
    btn.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}

export default RankingScene;
