import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene";
import GameScene from "./scenes/GameScene";
import InputScene from "./scenes/InputScene";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 390,
  height: 844,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [MenuScene, GameScene, InputScene],
};

window.addEventListener("load", () => {
  const game = new Phaser.Game(config);
});
