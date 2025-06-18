import Phaser from "phaser";

class Bullet extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, target, damage, speed, size = 1) {
    super(scene, x, y, "bullet");

    this.scene = scene;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.size = size;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(0.3 * size);
    this.setTint(0xffff00);

    this.body.setImmovable(true);
    this.body.setSize(10, 10);

    this.active = true;
    this.velocity = new Phaser.Math.Vector2();
  }

  update() {
    if (!this.active || !this.target || !this.target.active) {
      this.destroy();
      return;
    }

    // Calculate direction to target
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 10) {
      this.target.takeDamage(this.damage);
      this.destroy();
      return;
    }

    // Normalize direction and apply speed
    this.velocity.x = (dx / distance) * this.speed;
    this.velocity.y = (dy / distance) * this.speed;

    // Update position
    this.x += this.velocity.x * 0.016; // 0.016 is roughly 1/60 for 60fps
    this.y += this.velocity.y * 0.016;

    // Update rotation to face target
    this.rotation = Math.atan2(dy, dx) + Math.PI / 2;
  }

  destroy() {
    this.active = false;
    super.destroy();
  }
}

export default Bullet;
