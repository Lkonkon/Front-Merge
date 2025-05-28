import Phaser from 'phaser';
import Tower from '../entities/Tower';
import Enemy from '../entities/Enemy';

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
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
  }

  preload() {
    this.load.image('background', 'assets/Background.jpg');
    this.load.image('tower', 'assets/tower.png');
    this.load.image('enemy', 'assets/enemy.png');
    this.load.image('barrier', 'assets/barrier.png');
    this.load.image('bullet', 'assets/bullet.png');
  }

  create() {
    this.background = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'background');
    
    this.background.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
    
    this.createLanes();
    this.createBarrier();
    this.createUI();
    
    this.time.addEvent({
      delay: 2000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    this.input.on('pointerdown', this.handleTowerPlacement, this);
  }

  update(time, delta) {
    this.updateTowers(time, delta);
    this.updateEnemies(time, delta);
    this.gameTime += delta;
    this.enemyHealthMultiplier = 1 + (this.gameTime / 60000);
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

  createBarrier() {
    this.barrier = this.physics.add.group();
    const barrierY = this.cameras.main.height - 50;
    
    for (let i = 0; i < this.lanes; i++) {
      const x = i * this.laneWidth + this.laneWidth / 2;
      const barrierSegment = this.barrier.create(x, barrierY, 'barrier');
      barrierSegment.setImmovable(true);
      barrierSegment.setDisplaySize(this.laneWidth - 4, 20);
      barrierSegment.laneIndex = i;
    }
  }

  createUI() {
    const textStyle = {
      color: '#ffffff',
      fontSize: '18px',
      fontWeight: 'bold', 
      stroke: '#000000',
      strokeThickness: 3,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 2,
        stroke: true,
        fill: true
      }
    };
    
    this.scoreText = this.add.text(10, 10, `Pontos: ${this.score}`, textStyle);
    this.moneyText = this.add.text(10, 40, `Moedas: ${this.money}`, textStyle);
    this.healthText = this.add.text(10, 70, `Barreira: ${this.barrierHealth}%`, textStyle);
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
    
    this.physics.add.collider(enemy, this.barrier, this.enemyHitBarrier, null, this);
  }

  handleTowerPlacement(pointer) {
    if (pointer.y > this.cameras.main.height - 100) return;
    
    const laneIndex = Math.floor(pointer.x / this.laneWidth);
    const x = laneIndex * this.laneWidth + this.laneWidth / 2;
    const y = pointer.y;
    
    for (const tower of this.towers) {
      const minDistanceX = 50;
      const minDistanceY = 60;
      
      const distanceX = Math.abs(x - tower.x);
      const distanceY = Math.abs(y - tower.y);
      
      if (distanceX < minDistanceX && distanceY < minDistanceY) {
        return;
      }
    }
    
    const lanesWithTowers = this.towers.filter(tower => tower.laneIndex === laneIndex);
    if (lanesWithTowers.length >= 2) return;
    
    const towerCost = 50;
    if (this.money < towerCost) return;
    
    const tower = new Tower(this, x, y, laneIndex);
    this.towers.push(tower);
    
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

  gameOver() {
    this.add.text(
      this.cameras.main.centerX, 
      this.cameras.main.centerY,
      'Game Over!',
      { color: '#ffffff', fontSize: '32px' }
    ).setOrigin(0.5);
    
    this.scene.pause();
  }
}

export default GameScene; 