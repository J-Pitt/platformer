import * as Phaser from 'phaser';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, npcType, dialogue) {
    const texture = `npc_${npcType}`;
    super(scene, x, y, scene.textures.exists(texture) ? texture : 'npc_hermit');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.allowGravity = true;
    this.body.setImmovable(true);
    this.body.setSize(20, 28);
    this.body.setOffset(6, 8);
    this.setDepth(5);

    if (npcType === 'hermit') {
      this.setScale(1.18);
      this.refreshBody();
      this.setDepth(6);
    }
    if (npcType === 'merchant') {
      this.setScale(1.12);
      this.setAlpha(1);
      this.clearTint();
      this.refreshBody();
      this.setDepth(6);
    }

    this.npcType = npcType;
    this.dialogue = dialogue || [];
    this.dialogueIndex = 0;
    this.isTalking = false;
    this.promptIcon = null;
    this.playerNearby = false;

    this.createPrompt();
    if (npcType !== 'hermit' && npcType !== 'merchant') this.addIdleAnimation();
  }

  createPrompt() {
    this.promptIcon = this.scene.add.text(this.x, this.y - 30, '[E]', {
      fontSize: '12px', fontFamily: 'monospace', color: '#66ff88',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.scene.tweens.add({
      targets: this.promptIcon,
      y: this.y - 34, alpha: 0.3,
      duration: 800, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  addIdleAnimation() {
    this.scene.tweens.add({
      targets: this,
      y: this.y - 2,
      duration: 1500 + Math.random() * 500,
      yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setPlayerNearby(nearby) {
    if (nearby === this.playerNearby) return;
    this.playerNearby = nearby;
    if (this.promptIcon) {
      this.scene.tweens.killTweensOf(this.promptIcon);
      if (nearby && !this.isTalking) {
        this.promptIcon.setAlpha(1);
        this.scene.tweens.add({
          targets: this.promptIcon,
          y: this.y - 36, duration: 600,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      } else {
        this.promptIcon.setAlpha(0);
      }
    }
  }

  interact(onClose) {
    if (this.isTalking) return;
    if (this.dialogue.length === 0) return;
    this.isTalking = true;
    if (this.promptIcon) this.promptIcon.setAlpha(0);

    const player = this.scene.player;
    if (player && player.body) {
      player.body.setVelocity(0, 0);
    }

    this.showDialogue(onClose);
  }

  showDialogue(onClose) {
    const line = this.dialogue[this.dialogueIndex];
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const by = cam.height - 20;

    const elements = [];

    const panelW = Math.min(cam.width - 40, 500);
    const panelH = 100;
    const panelY = by - panelH / 2;

    const panel = this.scene.add.rectangle(cx, panelY, panelW, panelH, 0x1a1008, 0.92)
      .setScrollFactor(0).setDepth(200);
    elements.push(panel);

    const borderTop = this.scene.add.rectangle(cx, panelY - panelH / 2, panelW, 2, 0x44ff66, 0.5)
      .setScrollFactor(0).setDepth(201);
    elements.push(borderTop);

    const borderBot = this.scene.add.rectangle(cx, panelY + panelH / 2, panelW, 2, 0x44ff66, 0.3)
      .setScrollFactor(0).setDepth(201);
    elements.push(borderBot);

    const nameColors = {
      hermit: '#88ccaa',
      knight: '#aabbcc',
      spirit: '#aa88ff',
      merchant: '#ffcc66',
    };
    const nameLabels = {
      hermit: 'Old Hermit',
      knight: 'Fallen Knight',
      spirit: 'Wandering Spirit',
      merchant: 'Bone Merchant',
    };

    const nameText = this.scene.add.text(
      cx - panelW / 2 + 14, panelY - panelH / 2 + 10,
      nameLabels[this.npcType] || 'Stranger', {
        fontSize: '12px', fontFamily: 'monospace',
        color: nameColors[this.npcType] || '#88aacc',
        stroke: '#000', strokeThickness: 3,
      }).setScrollFactor(0).setDepth(202);
    elements.push(nameText);

    const bodyText = this.scene.add.text(
      cx - panelW / 2 + 14, panelY - panelH / 2 + 28,
      '', {
        fontSize: '11px', fontFamily: 'monospace', color: '#d4c8a8',
        stroke: '#000', strokeThickness: 2,
        wordWrap: { width: panelW - 28 },
        lineSpacing: 4,
      }).setScrollFactor(0).setDepth(202);
    elements.push(bodyText);

    let charIdx = 0;
    const typeSpeed = 25;
    const typeTimer = this.scene.time.addEvent({
      delay: typeSpeed,
      repeat: line.length - 1,
      callback: () => {
        charIdx++;
        bodyText.setText(line.substring(0, charIdx));
      },
    });

    const isMobile = 'ontouchstart' in window && navigator.maxTouchPoints > 1;
    const hasMore = this.dialogueIndex < this.dialogue.length - 1;
    const promptStr = hasMore
      ? (isMobile ? '[ TAP FOR MORE ▶ ]' : '[ SPACE OR E ▶ ]')
      : (isMobile ? '[ TAP TO CLOSE ]' : '[ SPACE OR E TO CLOSE ]');
    const prompt = this.scene.add.text(
      cx + panelW / 2 - 14, panelY + panelH / 2 - 12, promptStr, {
        fontSize: '9px', fontFamily: 'monospace', color: '#6a5838',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(202).setAlpha(0);
    elements.push(prompt);

    this.scene.time.delayedCall(400, () => {
      prompt.setAlpha(0.8);
    });

    let dismissed = false;
    const advance = () => {
      if (dismissed) return;

      if (charIdx < line.length) {
        typeTimer.remove();
        charIdx = line.length;
        bodyText.setText(line);
        return;
      }

      dismissed = true;
      this.scene.input.keyboard.off('keydown-SPACE', advance);
      this.scene.input.keyboard.off('keydown-E', advance);
      this.scene.input.off('pointerdown', advance);

      for (const el of elements) {
        if (el.destroy) el.destroy();
      }

      this.dialogueIndex++;
      if (this.dialogueIndex < this.dialogue.length) {
        this.showDialogue(onClose);
      } else {
        this.dialogueIndex = 0;
        this.isTalking = false;
        if (this.playerNearby && this.promptIcon) {
          this.promptIcon.setAlpha(1);
        }
        if (onClose) onClose();
      }
    };

    this.scene.time.delayedCall(200, () => {
      this.scene.input.keyboard.on('keydown-SPACE', advance);
      this.scene.input.keyboard.on('keydown-E', advance);
      this.scene.input.on('pointerdown', advance);
    });
  }

  destroy() {
    if (this.promptIcon) this.promptIcon.destroy();
    super.destroy();
  }
}
