import Phaser from 'phaser';

class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, laneIndex, health = 30) {
    super(scene, x, y, 'enemy');
    
    this.scene = scene;
    this.laneIndex = laneIndex;
    this.health = health;
    this.maxHealth = health;
    this.speed = 50;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setScale(1);
    
    this.body.velocity.y = this.speed;
    
    this.healthBar = scene.add.graphics();
    this.updateHealthBar();
  }
  
  update() {
    this.updateHealthBar();
  }
  
  updateHealthBar() {
    this.healthBar.clear();
    
    this.healthBar.fillStyle(0xff0000);
    this.healthBar.fillRect(this.x - 15, this.y - 20, 30, 5);
    
    const healthPercentage = this.health / this.maxHealth;
    this.healthBar.fillStyle(0x00ff00);
    this.healthBar.fillRect(this.x - 15, this.y - 20, 30 * healthPercentage, 5);
  }
  
  takeDamage(amount) {
    this.health -= amount;
    
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 100,
      yoyo: true
    });
  }
  
  isDead() {
    return this.health <= 0;
  }
  
  destroy() {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    super.destroy();
  }
  
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
  }
}

export default Enemy; 