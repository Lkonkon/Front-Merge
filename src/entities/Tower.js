import Phaser from 'phaser';
import Bullet from './Bullet';

class Tower extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, laneIndex) {
    super(scene, x, y, 'tower');
    
    this.scene = scene;
    this.laneIndex = laneIndex;
    this.level = 1;
    this.damage = 10;
    this.range = 300;
    this.fireRate = 800; 
    this.lastFired = 0;
    this.bullets = [];
    this.target = null;
    this.upgradePrice = 100;
    
    scene.add.existing(this);
    this.setScale(1);
    
    this.levelText = scene.add.text(x, y + 20, `Nv ${this.level}`, {
      color: '#ffffff',
      fontSize: '12px'
    }).setOrigin(0.5);
    
    this.setInteractive();
    this.on('pointerdown', this.onTowerClick, this);
  }
  
  onTowerClick(pointer) {
    if (this.scene.money >= this.upgradePrice) {
      this.upgrade();
      this.scene.money -= this.upgradePrice;
      this.upgradePrice = Math.floor(this.upgradePrice * 1.5);
      this.scene.updateUI();
    }
  }
  
  upgrade() {
    this.level++;
    this.damage = Math.floor(this.damage * 1.5);
    this.fireRate = Math.max(300, this.fireRate * 0.8);
    this.levelText.setText(`Nv ${this.level}`);
    
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true
    });
  }
  
  update(time, delta, enemies) {
    let closestEnemy = null;
    let closestDistance = Infinity;
    
    for (const enemy of enemies) {
      if (enemy.laneIndex === this.laneIndex) {
        const distance = Math.abs(enemy.y - this.y);
        
        if (distance < this.range && distance < closestDistance) {
          closestEnemy = enemy;
          closestDistance = distance;
        }
      }
    }
    
    if (closestEnemy && time > this.lastFired + this.fireRate) {
      this.fire(closestEnemy);
      this.lastFired = time;
    }
    
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      if (bullet.active === false) {
        this.bullets.splice(i, 1);
      }
    }
  }
  
  fire(enemy) {
    const bullet = new Bullet(this.scene, this.x, this.y, enemy, this.damage);
    this.bullets.push(bullet);
    
    this.scene.tweens.add({
      targets: this,
      y: this.y - 5,
      duration: 50,
      yoyo: true
    });
  }
  
  destroy() {
    this.levelText.destroy();
    super.destroy();
  }
}

export default Tower; 