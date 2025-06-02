import Phaser from "phaser";
import Tower from "../entities/Tower";
import Enemy from "../entities/Enemy";

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.lanes = 6;
    this.laneWidth = 0;
    this.towers = [];
    this.enemies = [];
    this.barrier = null;
    this.barrierHealth = 100;
    this.score = 0;
    this.money = 100;
    this.nextEnemyTime = 0;
    this.gameTime = 0;
    this.enemyHealthMultiplier = 1;
    this.towerPositions = [];
    this.availablePositions = [];
    this.userId = localStorage.getItem("userId");
    this.username = localStorage.getItem("username");
  }

  preload() {
    this.load.image("background", "assets/Background.jpg");
    this.load.image("tower", "assets/tower.png");
    this.load.image("enemy", "assets/enemy.png");
    this.load.image("barrier", "assets/barrier.png");
    this.load.image("bullet", "assets/bullet.png");
    this.createTowerSpotTexture();
  }

  createTowerSpotTexture() {
    const size = 64;
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Draw a circle with a border
    graphics.lineStyle(2, 0xffffff, 0.8);
    graphics.fillStyle(0xffffff, 0.2);
    graphics.fillCircle(size / 2, size / 2, size / 2 - 2);
    graphics.strokeCircle(size / 2, size / 2, size / 2 - 2);

    graphics.generateTexture("towerSpot", size, size);
    graphics.destroy();
  }

  create() {
    this.background = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      "background"
    );
    this.background.setDisplaySize(
      this.cameras.main.width,
      this.cameras.main.height
    );

    this.createLanes();
    this.createTowerPositions();
    this.createBarrier();
    this.createUI();

    this.time.addEvent({
      delay: 2000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    this.input.on("pointerdown", this.handleTowerPlacement, this);
  }

  createLanes() {
    this.laneWidth = this.cameras.main.width / this.lanes;

    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xffffff, 0.8);

    for (let i = 0; i <= this.lanes; i++) {
      const x = i * this.laneWidth;
      graphics.moveTo(x, 0);
      graphics.lineTo(x, this.cameras.main.height);
    }

    graphics.strokePath();
  }

  createTowerPositions() {
    const barrierY = this.cameras.main.height - 50;
    const towerRowY = barrierY - 100; // Position towers 100 pixels above the barrier

    for (let lane = 0; lane < this.lanes; lane++) {
      const x = lane * this.laneWidth + this.laneWidth / 2;
      const y = towerRowY;

      const spot = this.add.image(x, y, "towerSpot");
      spot.setDisplaySize(this.laneWidth - 10, this.laneWidth - 10);
      spot.setAlpha(0.5);

      this.towerPositions.push({
        x: x,
        y: y,
        laneIndex: lane,
        occupied: false,
        spot: spot,
      });
    }
  }

  createBarrier() {
    this.barrier = this.physics.add.group();
    const barrierY = this.cameras.main.height - 50;

    for (let i = 0; i < this.lanes; i++) {
      const x = i * this.laneWidth + this.laneWidth / 2;
      const barrierSegment = this.barrier.create(x, barrierY, "barrier");
      barrierSegment.setImmovable(true);
      barrierSegment.setDisplaySize(this.laneWidth - 4, 20);
      barrierSegment.laneIndex = i;
    }
  }

  createUI() {
    const textStyle = {
      color: "#ffffff",
      fontSize: "18px",
      fontWeight: "bold",
      stroke: "#000000",
      strokeThickness: 3,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: "#000000",
        blur: 2,
        stroke: true,
        fill: true,
      },
    };

    this.scoreText = this.add.text(10, 10, `Pontos: ${this.score}`, textStyle);
    this.moneyText = this.add.text(10, 40, `Moedas: ${this.money}`, textStyle);
    this.healthText = this.add.text(
      10,
      70,
      `Barreira: ${this.barrierHealth}%`,
      textStyle
    );
  }

  updateUI() {
    this.scoreText.setText(`Pontos: ${this.score}`);
    this.moneyText.setText(`Moedas: ${this.money}`);
    this.healthText.setText(`Barreira: ${this.barrierHealth}%`);
  }

  spawnEnemy() {
    const laneIndex = Phaser.Math.Between(0, this.lanes - 1);
    const x = laneIndex * this.laneWidth + this.laneWidth / 2;

    const baseHealth = 30;
    const scaledHealth = Math.floor(baseHealth * this.enemyHealthMultiplier);

    const enemy = new Enemy(this, x, 0, laneIndex, scaledHealth);
    this.enemies.push(enemy);

    this.physics.add.collider(
      enemy,
      this.barrier,
      this.enemyHitBarrier,
      null,
      this
    );
  }

  handleTowerPlacement(pointer) {
    if (pointer.y > this.cameras.main.height - 100) return;

    const towerCost = 50;
    if (this.money < towerCost) return;

    // Find the closest available tower position
    let closestPosition = null;
    let minDistance = Infinity;

    for (const position of this.towerPositions) {
      if (position.occupied) continue;

      const distance = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        position.x,
        position.y
      );

      if (distance < minDistance && distance < 50) {
        minDistance = distance;
        closestPosition = position;
      }
    }

    if (!closestPosition) return;

    const tower = new Tower(
      this,
      closestPosition.x,
      closestPosition.y,
      closestPosition.laneIndex
    );
    this.towers.push(tower);

    closestPosition.occupied = true;
    closestPosition.spot.setAlpha(0.2);

    this.money -= towerCost;
    this.updateUI();
  }

  updateTowers(time, delta) {
    for (const tower of this.towers) {
      tower.update(time, delta, this.enemies);
    }
  }

  updateEnemies(time, delta) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update();

      if (enemy.isDead()) {
        this.score += 10;
        this.money += 15;
        this.updateUI();
        this.enemies.splice(i, 1);
        enemy.destroy();
      }
    }
  }

  enemyHitBarrier(enemy, barrier) {
    this.barrierHealth = Math.max(0, this.barrierHealth - 10);
    this.updateUI();

    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }
    enemy.destroy();

    if (this.barrierHealth <= 0) {
      this.gameOver();
    }
  }

  async gameOver() {
    // Submit score to the server
    try {
      const response = await fetch("http://localhost:3000/api/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: this.userId,
          score: this.score,
          username: this.username,
        }),
      });

      if (!response.ok) {
        console.error("Failed to submit score");
      }
    } catch (error) {
      console.error("Error submitting score:", error);
    }

    // Create game over screen
    const gameOverText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 50,
        "Game Over!",
        { color: "#ffffff", fontSize: "32px" }
      )
      .setOrigin(0.5);

    const scoreText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        `Pontuação: ${this.score}`,
        { color: "#ffffff", fontSize: "24px" }
      )
      .setOrigin(0.5);

    const restartButton = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      200,
      50,
      0x00ff00,
      0.5
    );
    const restartText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 50,
        "Jogar Novamente",
        { color: "#ffffff", fontSize: "20px" }
      )
      .setOrigin(0.5);

    restartButton.setInteractive();
    restartButton.on("pointerdown", () => {
      this.scene.start("GameScene");
    });

    this.scene.pause();
  }
}

export default GameScene;
