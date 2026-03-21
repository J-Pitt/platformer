export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.healthOrbs = [];
    this.dashBarBg = null;
    this.dashBarFill = null;
    this.create();
  }

  create() {
    const player = this.scene.player;

    for (let i = 0; i < player.maxHp; i++) {
      const full = this.scene.add.image(30 + i * 28, 30, 'health_orb')
        .setScrollFactor(0).setDepth(100);
      const empty = this.scene.add.image(30 + i * 28, 30, 'health_orb_empty')
        .setScrollFactor(0).setDepth(99);
      this.healthOrbs.push({ full, empty });
    }

    this.dashBarBg = this.scene.add.image(30, 56, 'dash_bar_empty')
      .setScrollFactor(0).setDepth(100).setOrigin(0, 0.5).setVisible(false);

    this.dashBarFill = this.scene.add.image(30, 56, 'dash_bar_full')
      .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5).setVisible(false);
  }

  update() {
    const player = this.scene.player;

    for (let i = 0; i < this.healthOrbs.length; i++) {
      this.healthOrbs[i].full.setVisible(i < player.hp);
    }

    if (player.hasAbility('dash')) {
      this.dashBarBg.setVisible(true);
      this.dashBarFill.setVisible(true);
      const pct = player.movement.dashCooldownPercent;
      this.dashBarFill.setScale(pct, 1);
      this.dashBarFill.setAlpha(pct >= 1 ? 1 : 0.5);
    }
  }

  refresh() {
    this.update();
  }
}
