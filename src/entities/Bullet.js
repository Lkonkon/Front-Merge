import Phaser from 'phaser';

class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, target, damage) {
    super(scene, x, y, 'bullet');
    
    this.scene = scene;
    this.target = target;
    this.damage = damage;
    this.speed = 300;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setScale(1.5);
    this.body.setSize(4, 4);
    
    scene.physics.add.overlap(this, target, this.hitEnemy, null, this);
  }
  
  update() {
    if (!this.target || !this.target.active) {
      this.destroy();
      return;
    }
    
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const angle = Math.atan2(dy, dx);
    
    this.body.velocity.x = Math.cos(angle) * this.speed;
    this.body.velocity.y = Math.sin(angle) * this.speed;
    
    this.setRotation(angle);
  }
  
  hitEnemy(bullet, enemy) {
    enemy.takeDamage(this.damage);
    this.destroy();
  }
  
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.update();
  }
}

export default Bullet; 