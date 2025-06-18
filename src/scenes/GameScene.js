import Phaser from "phaser";
import Tower from "../entities/Tower";
import Enemy from "../entities/Enemy";
import io from "socket.io-client";

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
    this.draggedTower = null;
    this.selectedTowerType = "BASIC";
    this.socket = null;
    this.gameId = localStorage.getItem("currentGameId");
    this.lastDifficultyIncrease = 0;
    this.difficultyInterval = 60000;
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
    this.socket = io("http://localhost:3000", {
      transports: ["polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 45000,
      path: "/socket.io/",
    });

    this.socket.on("connect", () => {
      console.log("Connected to server");
      this.socket.emit("join-game", this.gameId);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
    });

    this.socket.on("game-state", (state) => {
      this.gameState = state;
      this.gameTime = state.gameTime;
      this.enemyHealthMultiplier = state.difficultyMultiplier;
      this.updateUI();
    });

    this.socket.on("difficulty-increase", (multiplier) => {
      this.enemyHealthMultiplier = multiplier;
      console.log("Difficulty increased to:", multiplier);
      this.updateUI();
    });

    this.socket.on("game-time-update", ({ gameTime, difficultyMultiplier }) => {
      this.gameTime = gameTime;
      this.enemyHealthMultiplier = difficultyMultiplier;
      this.updateUI();
    });

    setInterval(() => {
      this.socket.emit("debug-time", this.gameId);
    }, 5000);

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
    this.createTowerSelection();

    this.time.addEvent({
      delay: 2000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    // Separar o evento de clique para criação de torre
    this.input.on("pointerdown", (pointer) => {
      // Verifica se clicou em uma torre existente
      const clickedTower = this.towers.find(
        (tower) =>
          Phaser.Math.Distance.Between(pointer.x, pointer.y, tower.x, tower.y) <
          30
      );

      if (!clickedTower) {
        // Se não clicou em uma torre, tenta criar uma nova
        this.handleTowerPlacement(pointer);
      }
    });

    // Função para criar uma torre
    this.createTower = (x, y, type) => {
      const tower = this.add.sprite(x, y, "tower");
      tower.setInteractive({ draggable: true }); // Torna a torre arrastável
      tower.type = type;
      tower.id = Date.now(); // ID temporário até receber do servidor

      // Eventos de drag
      this.input.setDraggable(tower);

      tower.on("dragstart", (pointer) => {
        tower.originalX = tower.x;
        tower.originalY = tower.y;
      });

      tower.on("drag", (pointer, dragX, dragY) => {
        tower.x = dragX;
        tower.y = dragY;
      });

      tower.on("dragend", async (pointer) => {
        try {
          const gameId = localStorage.getItem("currentGameId");
          const response = await fetch(
            `http://localhost:3000/api/games/${gameId}/towers/${tower.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                x: tower.x,
                y: tower.y,
              }),
            }
          );

          if (!response.ok) {
            // Se houver erro, volta para a posição original
            tower.x = tower.originalX;
            tower.y = tower.originalY;
            throw new Error("Erro ao realocar torre");
          }

          const updatedTower = await response.json();
          tower.id = updatedTower.id; // Atualiza o ID se for uma nova torre
        } catch (error) {
          console.error("Erro ao realocar torre:", error);
          // Mostra mensagem de erro para o jogador
          this.showError("Erro ao realocar torre");
        }
      });

      return tower;
    };

    // Função para mostrar erro
    this.showError = (message) => {
      const errorText = this.add
        .text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2,
          message,
          {
            fontSize: "24px",
            fill: "#ff0000",
            backgroundColor: "#000000",
            padding: { x: 10, y: 5 },
          }
        )
        .setOrigin(0.5);

      this.time.delayedCall(2000, () => {
        errorText.destroy();
      });
    };

    // Função para carregar torres do servidor
    this.loadTowers = async () => {
      try {
        const gameId = localStorage.getItem("currentGameId");
        const response = await fetch(
          `http://localhost:3000/api/games/${gameId}/towers`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Erro ao carregar torres");
        }

        const towers = await response.json();
        towers.forEach((towerData) => {
          const tower = this.createTower(
            towerData.x,
            towerData.y,
            towerData.type
          );
          tower.id = towerData.id; // Atualiza o ID com o valor do servidor
        });
      } catch (error) {
        console.error("Erro ao carregar torres:", error);
        this.showError("Erro ao carregar torres");
      }
    };

    // Inicializar o multiplicador de dificuldade
    this.enemyHealthMultiplier = 1;

    // Adicionar texto para mostrar a dificuldade atual
    this.difficultyText = this.add.text(
      10,
      100,
      `Dificuldade: ${this.enemyHealthMultiplier.toFixed(1)}x`,
      {
        color: "#ffffff",
        fontSize: "18px",
        fontWeight: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      }
    );
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
    this.timeText = this.add.text(
      10,
      100,
      `Tempo: ${Math.floor(this.gameTime / 60)}:${(this.gameTime % 60)
        .toString()
        .padStart(2, "0")}`,
      textStyle
    );
  }

  updateUI() {
    this.scoreText.setText(`Pontos: ${this.score}`);
    this.moneyText.setText(`Moedas: ${this.money}`);
    this.healthText.setText(`Barreira: ${this.barrierHealth}%`);
    this.difficultyText.setText(
      `Dificuldade: ${this.enemyHealthMultiplier.toFixed(1)}x`
    );
    this.timeText.setText(
      `Tempo: ${Math.floor(this.gameTime / 60)}:${(this.gameTime % 60)
        .toString()
        .padStart(2, "0")}`
    );
  }

  spawnEnemy() {
    const laneIndex = Phaser.Math.Between(0, this.lanes - 1);
    const x = laneIndex * this.laneWidth + this.laneWidth / 2;

    const baseHealth = 30;
    const scaledHealth = Math.floor(baseHealth * this.enemyHealthMultiplier);

    console.log(
      `Spawning enemy with health: ${scaledHealth} (${this.enemyHealthMultiplier.toFixed(
        1
      )}x) at time ${this.gameTime}s`
    );

    const enemy = new Enemy(this, x, 0, laneIndex, scaledHealth);
    this.enemies.push(enemy);

    // Emit enemy spawn to server
    this.socket.emit("spawn-enemy", {
      gameId: this.gameId,
      enemy: {
        id: enemy.id,
        x: enemy.x,
        y: enemy.y,
        laneIndex: enemy.laneIndex,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
      },
    });

    this.physics.add.collider(
      enemy,
      this.barrier,
      this.enemyHitBarrier,
      null,
      this
    );
  }

  createTowerSelection() {
    const towerTypes = Object.entries(Tower.TOWER_TYPES);
    const buttonWidth = 100;
    const buttonHeight = 90;
    const padding = 20;
    const marginBottom = 12;
    const barPadding = 16;
    // Largura total real dos botões
    const totalWidth =
      buttonWidth * towerTypes.length + padding * (towerTypes.length - 1);
    // Posição inicial do fundo
    const startXBar =
      (this.cameras.main.width - totalWidth - 2 * barPadding) / 2;
    const startY = this.cameras.main.height - buttonHeight - marginBottom;
    // Posição inicial dos botões
    const startX = startXBar;

    // Fundo da barra de seleção
    const selectionBar = this.add.rectangle(
      startXBar + (totalWidth + 2 * barPadding) / 2,
      startY + buttonHeight / 2,
      totalWidth + 2 * barPadding,
      buttonHeight + barPadding,
      0x22232a,
      0.7
    );
    selectionBar.setStrokeStyle(0, 0xffffff, 0);

    towerTypes.forEach(([type, config], index) => {
      const x = (buttonWidth + padding) * index + 75;
      const y = startY + 45;

      // Container do botão
      const container = this.add.container(x, y);

      // Botão de fundo arredondado
      const button = this.add.rectangle(
        0,
        0,
        buttonWidth,
        buttonHeight,
        0x18191f,
        0.95
      );
      button.setStrokeStyle(
        3,
        this.selectedTowerType === type ? 0xffff00 : config.color
      );
      button.setOrigin(0.5);

      // Ícone da torre
      const towerIcon = this.add.sprite(0, -22, "tower");
      towerIcon.setScale(0.6);
      towerIcon.setTint(config.color);

      // Nome da torre
      const nameText = this.add
        .text(0, 8, config.name, {
          color: "#fff",
          fontSize: "15px",
          fontStyle: "bold",
          fontFamily: "Arial",
          align: "center",
          shadow: {
            offsetX: 1,
            offsetY: 1,
            color: "#000",
            blur: 2,
            fill: true,
          },
        })
        .setOrigin(0.5);

      // Custo da torre
      const costText = this.add
        .text(0, 28, `$${config.cost}`, {
          color: "#ffe066",
          fontSize: "13px",
          fontFamily: "Arial",
          fontStyle: "bold",
          align: "center",
          shadow: {
            offsetX: 1,
            offsetY: 1,
            color: "#000",
            blur: 2,
            fill: true,
          },
        })
        .setOrigin(0.5);

      container.add([button, towerIcon, nameText, costText]);

      // Torna o botão interativo
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => {
        this.selectedTowerType = type;
        // Destaca o botão selecionado
        towerTypes.forEach(([t, c], i) => {
          const btn = this.children.list.find(
            (child) =>
              child instanceof Phaser.GameObjects.Container &&
              child.x === startX + (buttonWidth + padding) * i
          );
          if (btn) {
            const rect = btn.getAt(0);
            rect.setStrokeStyle(3, t === type ? 0xffff00 : c.color);
          }
        });
      });

      // Tooltip flutuante
      button.on("pointerover", () => {
        button.setFillStyle(0x23242b, 1);
        this.showTowerTooltip(
          container.x + this.cameras.main.width / 2,
          container.y,
          config,
          container.y
        );
      });
      button.on("pointerout", () => {
        button.setFillStyle(0x18191f, 0.95);
        this.hideTowerTooltip();
      });
    });

    this.selectedTowerType = "BASIC";
  }

  showTowerTooltip(x, y, config, buttonY = 0) {
    this.hideTowerTooltip();
    const width = 160;
    const height = 70;
    // Centraliza acima do botão, com deslocamento para cima
    x = x - width / 2;
    y = buttonY - height - 10;
    // Ajusta para não sair da tela
    if (x + width > this.cameras.main.width)
      x = this.cameras.main.width - width - 8;
    if (x < 0) x = 8;
    if (y < 0) y = 8;

    this.tooltipElements = [];
    const bg = this.add
      .rectangle(x, y, width, height, 0x18191f, 0.97)
      .setOrigin(0, 0);
    bg.setStrokeStyle(2, config.color);
    this.tooltipElements.push(bg);
    const stats = [
      `Dano: ${config.damage}`,
      `Alcance: ${config.range}`,
      `Tiro: ${config.fireRate}ms`,
      `Velocidade: ${config.bulletSpeed}`,
    ];
    stats.forEach((stat, i) => {
      const t = this.add.text(x + 12, y + 10 + i * 15, stat, {
        color: "#fff",
        fontSize: "12px",
        fontFamily: "Arial",
        shadow: { offsetX: 1, offsetY: 1, color: "#000", blur: 2, fill: true },
      });
      this.tooltipElements.push(t);
    });
  }

  hideTowerTooltip() {
    if (this.tooltipElements) {
      this.tooltipElements.forEach((e) => e.destroy());
      this.tooltipElements = null;
    }
  }

  handleTowerPlacement(pointer) {
    if (pointer.y > this.cameras.main.height - 100) return;

    const towerConfig = Tower.TOWER_TYPES[this.selectedTowerType];
    if (this.money < towerConfig.cost) return;

    // Find the closest available tower position
    let closestPosition = null;
    let minDistance = Infinity;

    for (const position of this.towerPositions) {
      // Verifica se a posição está ocupada por alguma torre
      const isOccupied = this.towers.some(
        (tower) =>
          Math.abs(tower.x - position.x) < 1 &&
          Math.abs(tower.y - position.y) < 1
      );

      if (isOccupied) continue;

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

    if (!closestPosition) {
      this.showError("Posição ocupada!");
      return;
    }

    const tower = new Tower(
      this,
      closestPosition.x,
      closestPosition.y,
      closestPosition.laneIndex,
      this.selectedTowerType
    );

    // Configurar a torre para ser arrastável
    tower.setInteractive({ draggable: true });
    this.input.setDraggable(tower);

    // Eventos de drag
    tower.on("dragstart", (pointer) => {
      tower.originalX = tower.x;
      tower.originalY = tower.y;
      tower.originalLaneIndex = tower.laneIndex;
      tower.isDragging = true;
    });

    tower.on("drag", (pointer, dragX, dragY) => {
      tower.x = dragX;
      tower.y = dragY;
    });

    tower.on("dragend", (pointer) => {
      // Encontrar a posição mais próxima disponível
      let newPosition = null;
      let minDistance = Infinity;
      let targetTower = null;

      for (const position of this.towerPositions) {
        // Ignora a posição atual da torre
        if (position.x === tower.originalX && position.y === tower.originalY)
          continue;

        const distance = Phaser.Math.Distance.Between(
          tower.x,
          tower.y,
          position.x,
          position.y
        );

        if (distance < minDistance && distance < 50) {
          minDistance = distance;
          newPosition = position;

          // Verifica se há uma torre na posição
          const towerAtPosition = this.towers.find(
            (t) => t !== tower && t.x === position.x && t.y === position.y
          );

          if (towerAtPosition) {
            targetTower = towerAtPosition;
          }
        }
      }

      if (newPosition) {
        if (
          targetTower &&
          targetTower.type === tower.type &&
          targetTower.level === tower.level
        ) {
          // Merge das torres do mesmo tipo e nível
          targetTower.upgrade();

          // Remover a torre que foi arrastada
          const index = this.towers.indexOf(tower);
          if (index !== -1) {
            this.towers.splice(index, 1);
          }
          tower.destroy();

          // Atualizar no servidor apenas se estiver autenticado
          const gameId = localStorage.getItem("currentGameId");
          const token = localStorage.getItem("token");
          if (gameId && token) {
            this.updateTowerPosition(targetTower);
          }
        } else if (!targetTower) {
          // Mover para posição vazia
          tower.x = newPosition.x;
          tower.y = newPosition.y;
          tower.laneIndex = newPosition.laneIndex;
          tower.levelText.setPosition(tower.x, tower.y + 20);

          // Atualizar no servidor apenas se estiver autenticado
          const gameId = localStorage.getItem("currentGameId");
          const token = localStorage.getItem("token");
          if (gameId && token) {
            this.updateTowerPosition(tower);
          }
        } else {
          // Se a torre de destino tem tipo ou nível diferente, volta para posição original
          tower.x = tower.originalX;
          tower.y = tower.originalY;
          tower.laneIndex = tower.originalLaneIndex;
          tower.levelText.setPosition(tower.x, tower.y + 20);
        }
      } else {
        // Se não encontrou uma nova posição válida, volta para a posição original
        tower.x = tower.originalX;
        tower.y = tower.originalY;
        tower.laneIndex = tower.originalLaneIndex;
        tower.levelText.setPosition(tower.x, tower.y + 20);
      }

      tower.isDragging = false;
    });

    this.towers.push(tower);

    this.money -= towerConfig.cost;
    this.updateUI();
  }

  // Atualizar o método updateTowerPosition para ser mais robusto
  async updateTowerPosition(tower) {
    try {
      const gameId = localStorage.getItem("currentGameId");
      const token = localStorage.getItem("token");

      if (!gameId || !token) {
        console.log("Usuário não autenticado ou sem gameId");
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/games/${gameId}/towers/${tower.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            x: tower.x,
            y: tower.y,
            laneIndex: tower.laneIndex,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao atualizar posição da torre");
      }

      const updatedTower = await response.json();
      tower.id = updatedTower.id;
    } catch (error) {
      console.error("Erro ao atualizar posição da torre:", error);
      // Não mostra erro para o usuário durante o desenvolvimento
      // this.showError("Erro ao atualizar posição da torre");
    }
  }

  // Adicionar método para verificar se uma posição está ocupada
  isPositionOccupied(position) {
    return this.towers.some(
      (tower) =>
        tower.x === position.x &&
        tower.y === position.y &&
        tower !== this.draggedTower
    );
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
      // Disconnect socket before restarting
      if (this.socket) {
        this.socket.disconnect();
      }

      // Reset game state
      this.scene.restart();

      // Reset game variables
      this.score = 0;
      this.money = 100;
      this.barrierHealth = 100;
      this.gameTime = 0;
      this.enemyHealthMultiplier = 1;
      this.enemies = [];
      this.towers = [];
    });

    this.scene.pause();
  }

  update(time, delta) {
    this.updateTowers(time, delta);
    this.updateEnemies(time, delta);

    // Update all bullets
    for (const tower of this.towers) {
      for (const bullet of tower.bullets) {
        bullet.update();
      }
    }
  }
}

export default GameScene;
