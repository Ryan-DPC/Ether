import { NetworkManager } from './network.js';

const network = new NetworkManager();
const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: 1600,
    height: 900,
  },
  backgroundColor: "#1a1a1a",
  physics: { default: "arcade", arcade: { gravity: { y: 1400 }, debug: false } },
  scene: {
    preload,
    create,
    update,
  },
};

let player;
let keys;
let isDashing = false;
const MAX_DASHES = 2;
let dashCount = MAX_DASHES;
let dashDuration = 120;
let BASE_DASH_SPEED = 900;
let dashSpeed = BASE_DASH_SPEED;
let dashTrailEvent = null;

const BASE_JUMP_SPEED = 520;
let jumpSpeed = BASE_JUMP_SPEED;
const COYOTE_TIME = 100;
const JUMP_BUFFER = 120;
let lastGroundTime = 0;
let lastJumpPressTime = 0;

// Network optimization variables
let lastNetworkUpdate = 0;
const NETWORK_UPDATE_RATE = 50; // Send updates every 50ms (20Hz)

// Remote players
const remotePlayers = new Map();

function preload() {
  this.load.image("player", "https://labs.phaser.io/assets/sprites/phaser-dude.png");
}

function create() {
  const worldW = this.scale.width;
  const worldH = this.scale.height;
  this.physics.world.setBounds(0, 0, worldW, worldH);
  const s = worldW / 1600;

  dashSpeed = Math.max(400, Math.floor(BASE_DASH_SPEED * s));
  jumpSpeed = Math.max(300, Math.floor(BASE_JUMP_SPEED * s));

  // Ground
  const groundWidth = Math.floor(worldW * 0.96);
  const groundHeight = Math.max(32, Math.floor(worldH * 0.04));
  const ground = this.add.rectangle(worldW / 2, worldH - groundHeight / 2, groundWidth, groundHeight, 0x228B22).setOrigin(0.5);
  this.physics.add.existing(ground, true);

  // Platforms
  const p1 = this.add.rectangle(worldW * 0.18, worldH * 0.56, worldW * 0.25, Math.max(18, worldH * 0.02), 0x8B4513).setOrigin(0.5);
  const p2 = this.add.rectangle(worldW * 0.72, worldH * 0.34, worldW * 0.25, Math.max(18, worldH * 0.02), 0x8B4513).setOrigin(0.5);
  this.physics.add.existing(p1, true);
  this.physics.add.existing(p2, true);

  this.platforms = [ground, p1, p2]; // Store for collision with remote players

  // HUD
  const hudFontSize = Math.max(12, Math.floor(18 * s));
  this.hud = this.add.text(Math.round(10 * s), Math.round(10 * s), 'WASD: move  Shift: dash F: attack', { font: `${hudFontSize}px Arial`, fill: '#ffffff' }).setScrollFactor(0);
  this.dashText = this.add.text(Math.round(10 * s), Math.round(12 + 10 * s), 'Dash: Ready', { font: `${hudFontSize}px Arial`, fill: '#ffff00' });
  this.statusText = this.add.text(worldW / 2, worldH / 2, 'Connecting...', { font: `${hudFontSize * 2}px Arial`, fill: '#ffffff' }).setOrigin(0.5);

  // Player setup (initially hidden until match starts)
  player = this.physics.add.sprite(worldW * 0.08, worldH * 0.45, "player");
  player.setVisible(false);
  player.body.enable = false;

  const playerDisplayW = Math.max(40, Math.floor(96 * s));
  const aspect = player.height / player.width;
  player.setDisplaySize(playerDisplayW, Math.floor(playerDisplayW * aspect));
  player.setCollideWorldBounds(true);

  const bodyW = Math.floor(player.displayWidth * 0.6);
  const bodyH = Math.floor(player.displayHeight * 0.9);
  player.body.setSize(bodyW, bodyH);
  const offsetX = Math.floor((player.displayWidth - bodyW) / 2);
  const offsetY = Math.floor(player.displayHeight - bodyH);
  player.body.setOffset(offsetX, offsetY);

  player.setMaxVelocity(Math.max(250, Math.floor(350 * (worldW / 1200))), Math.max(800, Math.floor(1000 * (worldH / 1000))));
  player.setDragX(Math.max(800, Math.floor(1200 * (worldW / 1200))));

  // Collisions
  this.physics.add.collider(player, ground);
  this.physics.add.collider(player, p1);
  this.physics.add.collider(player, p2);

  // Input
  keys = this.input.keyboard.addKeys({
    up: 'W',
    left: 'A',
    down: 'S',
    right: 'D',
    shift: 'SHIFT'
  });

  this.input.keyboard.on('keydown', (event) => {
    if (event.key === 'f' || event.key === 'F') {
      doAttack(this, player);
    }
  });

  // Network Setup
  setupNetwork(this);
}

function setupNetwork(scene) {
  // Generate a random username for now or prompt
  const username = 'Player_' + Math.floor(Math.random() * 1000);

  network.onMatchFound = (data) => {
    scene.statusText.setText('Match Found!');
    scene.time.delayedCall(1000, () => scene.statusText.setVisible(false));

    player.setVisible(true);
    player.body.enable = true;
    player.setPosition(100, 100); // Reset position
  };

  network.onGameState = (data) => {
    updateRemotePlayer(scene, data.username, data.state);
  };

  network.onPlayerJoined = (data) => {
    console.log('Player joined:', data.username);
  };

  network.onPlayerLeft = (data) => {
    removeRemotePlayer(data.username);
  };

  // Connect to main server
  network.connectMain(username, 'password123')
    .then(() => {
      scene.statusText.setText('Searching for match...');
      network.startMatchmaking();
    })
    .catch(err => {
      scene.statusText.setText('Connection Failed: ' + err);
    });
}

function updateRemotePlayer(scene, username, state) {
  if (username === network.username) return;

  let remote = remotePlayers.get(username);
  if (!remote) {
    remote = scene.add.sprite(state.x, state.y, "player");
    remote.setTint(0xff0000); // Enemy is red
    remote.setDisplaySize(player.displayWidth, player.displayHeight);
    remotePlayers.set(username, remote);
  }

  // Simple interpolation could be added here, for now direct position update
  // Using tween for smoother movement
  scene.tweens.add({
    targets: remote,
    x: state.x,
    y: state.y,
    duration: NETWORK_UPDATE_RATE,
    ease: 'Linear'
  });

  remote.flipX = state.flipX;
}

function removeRemotePlayer(username) {
  const remote = remotePlayers.get(username);
  if (remote) {
    remote.destroy();
    remotePlayers.delete(username);
  }
}

function doAttack(scene, player) {
  const dir = player.flipX ? -1 : 1;
  const hit = scene.add.rectangle(player.x + dir * 30, player.y, 40, 30, 0xff0000, 0.8);
  scene.physics.add.existing(hit);
  hit.body.setAllowGravity(false);

  scene.tweens.add({
    targets: hit,
    scaleX: 1.6,
    scaleY: 1.2,
    alpha: 0,
    duration: 140,
    ease: 'Cubic.easeOut',
    onComplete: () => hit.destroy()
  });

  player.setTint(0xffcccc);
  scene.time.delayedCall(140, () => player.clearTint());
}

function doDash(scene) {
  if (dashCount <= 0 || isDashing) return;
  dashCount--;
  isDashing = true;
  scene.dashText.setText('Dash: ' + dashCount);

  let dx = 0, dy = 0;
  if (keys.left.isDown) dx = -1;
  if (keys.right.isDown) dx = 1;
  if (keys.up.isDown) dy = -1;
  if (keys.down.isDown) dy = 1;
  if (dx === 0 && dy === 0) dx = player.flipX ? -1 : 1;

  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;

  const prevAllowGravity = player.body.allowGravity;
  player.body.setAllowGravity(false);
  player.setVelocity(dx * dashSpeed, dy * dashSpeed);

  dashTrailEvent = scene.time.addEvent({ delay: 30, callback: () => spawnDashTrail(scene), loop: true });

  scene.time.delayedCall(dashDuration, () => {
    isDashing = false;
    player.body.setAllowGravity(prevAllowGravity);
    player.setVelocity(player.body.velocity.x * 0.18, Math.max(player.body.velocity.y, 0));
    scene.dashText.setText('Dash: ' + dashCount);
    if (dashTrailEvent) {
      dashTrailEvent.remove();
      dashTrailEvent = null;
    }
  });
}

function spawnDashTrail(scene) {
  if (!player) return;
  const trail = scene.add.rectangle(player.x, player.y, 20, 10, 0x88ccff, 0.9);
  trail.setDepth(-1);
  trail.rotation = Math.atan2(player.body.velocity.y, player.body.velocity.x);
  scene.tweens.add({
    targets: trail,
    alpha: 0,
    scaleX: 0.1,
    scaleY: 0.1,
    duration: 220,
    ease: 'Cubic.easeOut',
    onComplete: () => trail.destroy()
  });
}

function update() {
  if (!player || !keys || !player.body) return;
  const now = this.time.now;

  if (player.body.blocked.down) {
    lastGroundTime = now;
    dashCount = MAX_DASHES;
    this.dashText.setText('Dash: ' + dashCount);
  }

  if (Phaser.Input.Keyboard.JustDown(keys.up)) {
    lastJumpPressTime = now;
  }

  if ((now - lastJumpPressTime) <= JUMP_BUFFER) {
    if (player.body.blocked.down || (now - lastGroundTime) <= COYOTE_TIME) {
      player.setVelocityY(-jumpSpeed);
      lastJumpPressTime = 0;
    }
  }

  if (Phaser.Input.Keyboard.JustUp(keys.up) && player.body.velocity.y < 0) {
    player.setVelocityY(player.body.velocity.y * 0.45);
  }

  if (Phaser.Input.Keyboard.JustDown(keys.shift)) {
    doDash(this);
  }

  if (isDashing) return;

  const GROUND_SPEED = 220;
  const AIR_SPEED = 160;

  if (player.body.blocked.down) {
    if (keys.left.isDown) {
      player.setVelocityX(-GROUND_SPEED);
      player.flipX = true;
    } else if (keys.right.isDown) {
      player.setVelocityX(GROUND_SPEED);
      player.flipX = false;
    } else {
      player.setVelocityX(0);
    }
  } else {
    if (keys.left.isDown) {
      player.setVelocityX(Phaser.Math.Clamp(player.body.velocity.x - 10, -AIR_SPEED, AIR_SPEED));
      player.flipX = true;
    } else if (keys.right.isDown) {
      player.setVelocityX(Phaser.Math.Clamp(player.body.velocity.x + 10, -AIR_SPEED, AIR_SPEED));
      player.flipX = false;
    }
    player.setDragX(60);
  }

  // Network Update Throttling
  if (now - lastNetworkUpdate > NETWORK_UPDATE_RATE) {
    network.sendState({
      x: Math.round(player.x),
      y: Math.round(player.y),
      flipX: player.flipX
    });
    lastNetworkUpdate = now;
  }
}

new Phaser.Game(config);
