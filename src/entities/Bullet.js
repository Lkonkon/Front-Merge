import Phaser from "phaser";

class Bullet extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, target, damage, speed = 400, size = 1) {
    super(scene, x, y, "bullet");

    this.scene = scene;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.size = size;

    scene.add.existing(this);
    this.setScale(size);

    // Adiciona física ao projétil
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);

    scene.physics.add.overlap(this, target, this.hitEnemy, null, this);
  }

  update() {
    if (!this.target || !this.target.active) {
      this.destroy();
      return;
    }

    // Calcula a direção para o alvo
    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y
    );

    // Move o projétil na direção do alvo
    this.scene.physics.velocityFromRotation(
      angle,
      this.speed,
      this.body.velocity
    );

    // Verifica colisão com o alvo
    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y
    );

    if (distance < 20) {
      this.target.takeDamage(this.damage);
      this.destroy();
    }

    // Destrói o projétil se sair da tela
    if (
      this.x < 0 ||
      this.x > this.scene.cameras.main.width ||
      this.y < 0 ||
      this.y > this.scene.cameras.main.height
    ) {
      this.destroy();
    }
  }

  hitEnemy(bullet, enemy) {
    if (enemy && enemy.active) {
      enemy.takeDamage(this.damage);
    }
    this.destroy();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.update();
  }
}

export default Bullet;
