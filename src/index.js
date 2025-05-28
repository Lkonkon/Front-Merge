import Phaser from 'phaser';
import GameScene from './scenes/GameScene';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 390,
  height: 844,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [GameScene]
};

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
}); 