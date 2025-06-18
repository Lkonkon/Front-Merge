import Phaser from "phaser";
import Bullet from "./Bullet";

class Tower extends Phaser.GameObjects.Sprite {
  static TOWER_TYPES = {
    BASIC: {
      name: "Básica",
      damage: 10,
      range: 300,
      fireRate: 800,
      cost: 50,
      color: 0xffffff,
      bulletSpeed: 400,
      bulletSize: 1,
    },
    RAPID: {
      name: "Rápida",
      damage: 5,
      range: 250,
      fireRate: 300,
      cost: 75,
      color: 0x00ff00,
      bulletSpeed: 600,
      bulletSize: 0.8,
    },
    SNIPER: {
      name: "Sniper",
      damage: 30,
      range: 500,
      fireRate: 1500,
      cost: 100,
      color: 0xff0000,
      bulletSpeed: 800,
      bulletSize: 1.2,
    },
  };

  constructor(scene, x, y, laneIndex, type = "BASIC") {
    super(scene, x, y, "tower");

    this.scene = scene;
    this.laneIndex = laneIndex;
    this.type = type;
    this.towerConfig = Tower.TOWER_TYPES[type];

    this.level = 1;
    this.damage = this.towerConfig.damage;
    this.range = this.towerConfig.range;
    this.fireRate = this.towerConfig.fireRate;
    this.lastFired = 0;
    this.bullets = [];
    this.target = null;
    this.upgradePrice = Math.floor(this.towerConfig.cost * 1.5);
    this.isDragging = false;
    this.lastShotTime = 0;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(0.6);
    this.setTint(this.towerConfig.color);

    this.rangeCircle = scene.add.circle(x, y, this.range, 0xffffff, 0.1);
    this.rangeCircle.setVisible(false);

    this.levelText = scene.add
      .text(x, y + 20, `Lvl ${this.level}`, {
        color: "#000000",
        fontSize: "16px",
        fontStyle: "bold",
        stroke: "#ffffff",
        strokeThickness: 3,
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: "#000000",
          blur: 2,
          fill: true,
        },
      })
      .setOrigin(0.5);

    this.body.setImmovable(true);
    this.body.setSize(40, 40);

    this.setInteractive();
    this.on("pointerover", this.showRange, this);
    this.on("pointerout", this.hideRange, this);
  }

  showRange() {
    this.rangeCircle.setVisible(true);
  }

  hideRange() {
    this.rangeCircle.setVisible(false);
  }

  upgrade() {
    this.level++;
    this.damage = Math.floor(this.damage * 1.5);
    this.fireRate = Math.max(300, this.fireRate * 0.8);
    this.levelText.setText(`Lvl ${this.level}`);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
    });
  }

  update(time, delta, enemies) {
    if (this.isDragging) return;

    this.lastShotTime += delta;
    this.rangeCircle.setPosition(this.x, this.y);

    const enemiesInLane = enemies.filter(
      (enemy) => enemy.laneIndex === this.laneIndex
    );

    if (enemiesInLane.length > 0) {
      let closestEnemy = null;
      let minDistance = Infinity;

      for (const enemy of enemiesInLane) {
        const distance = Phaser.Math.Distance.Between(
          this.x,
          this.y,
          enemy.x,
          enemy.y
        );

        if (distance < minDistance && distance <= this.range) {
          minDistance = distance;
          closestEnemy = enemy;
        }
      }

      if (closestEnemy && this.lastShotTime >= this.fireRate) {
        this.fire(closestEnemy);
        this.lastShotTime = 0;
      }
    }

    this.levelText.setPosition(this.x, this.y + 20);

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      if (bullet.active === false) {
        this.bullets.splice(i, 1);
      }
    }
  }

  fire(enemy) {
    const bullet = new Bullet(
      this.scene,
      this.x,
      this.y,
      enemy,
      this.damage,
      this.towerConfig.bulletSpeed,
      this.towerConfig.bulletSize
    );
    this.bullets.push(bullet);

    this.scene.tweens.add({
      targets: this,
      y: this.y - 5,
      duration: 50,
      yoyo: true,
    });
  }

  destroy() {
    this.levelText.destroy();
    this.rangeCircle.destroy();
    super.destroy();
  }
}

export default Tower;
