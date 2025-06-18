import Phaser from "phaser";

class Enemy extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, laneIndex, health = 30) {
    super(scene, x, y, "enemy");

    this.scene = scene;
    this.laneIndex = laneIndex;
    this.health = health;
    this.maxHealth = health;
    this.speed = 50;
    this.id = Date.now();

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(0.6);
    this.setTint(0xff0000);

    this.healthBar = scene.add.rectangle(x, y - 20, 40, 5, 0x00ff00);
    this.healthBar.setOrigin(0, 0.5);

    this.body.setImmovable(true);
    this.body.setSize(40, 40);
  }

  update() {
    this.y += this.speed * (this.scene.gameTime / 60 + 1) * 0.016;
    this.healthBar.setPosition(this.x - 20, this.y - 20);
    this.healthBar.setScale(this.health / this.maxHealth, 1);
    this.healthBar.setFillStyle(
      this.health > this.maxHealth * 0.5
        ? 0x00ff00
        : this.health > this.maxHealth * 0.25
        ? 0xffff00
        : 0xff0000
    );
  }

  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    this.scene.socket.emit("enemy-damage", {
      gameId: this.scene.gameId,
      enemyId: this.id,
      damage: damage,
      health: this.health,
    });
  }

  isDead() {
    return this.health <= 0;
  }

  destroy() {
    this.healthBar.destroy();
    super.destroy();
  }
}

export default Enemy;
