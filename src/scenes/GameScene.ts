import Phaser from 'phaser';
import { findPath, type Point } from '../utils/pathfinding';
import { TurnManager, type TurnState } from '../game/TurnManager';

interface Character {
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  ap: number;
  maxAp: number;
  avatar: string;
  isEnemy: boolean;
  gameObject: Phaser.GameObjects.Container;
  moveRange: number;
  minAttackRange: number;
  maxAttackRange: number;
  hasMovedThisTurn: boolean;
  hasAttackedThisTurn: boolean;
  bodyText: Phaser.GameObjects.Text;
  bodyEmblem: Phaser.GameObjects.Arc;
  bodySprite: Phaser.GameObjects.Image;
  bodyParts: Phaser.GameObjects.GameObject[];
  direction: 'NE' | 'SE' | 'SW' | 'NW';
  dirGraphics: Phaser.GameObjects.Graphics;
  hudBarGraphics?: Phaser.GameObjects.Graphics;
  skinType: string;
}



export class GameScene extends Phaser.Scene {
  private turnManager!: TurnManager;
  private showHeadAvatar = true;

  // Grid configuration
  private gridWidth = 10;
  private gridHeight = 10;
  private halfTileWidth = 64;
  private halfTileHeight = 32;

  // Map offset to center it on screen
  private mapOriginX = 0;
  private mapOriginY = 0;

  // Obstacle grid (All flat tiles now as requested)
  private obstacleGrid: boolean[][] = [];

  // Rendering layers
  private tileMapGraphics!: Phaser.GameObjects.Graphics;
  private interactiveGraphics!: Phaser.GameObjects.Graphics;
  private selectionRingGraphics!: Phaser.GameObjects.Graphics;

  // Game state (Multi-character)
  private characters: Character[] = [];
  private selectedCharacter: Character | null = null;
  private hoveredCharacter: Character | null = null;
  private selectionIndicator: Phaser.GameObjects.Triangle | null = null;
  private hoverTile: Point | null = null;
  private isMovementMode = false;
  private isAttackMode = false;
  private isGameOver = false;

  // Direction Selection Mode
  private isDirectionSelectMode = false;
  private isPostMoveDirectionSelect = false; // true if triggered automatically after moving

  // Pre-move Undo backups
  private preMoveX = -1;
  private preMoveY = -1;
  private preMoveDirection: 'NE' | 'SE' | 'SW' | 'NW' = 'SE';

  // Turn Timer State
  private turnTimeLimit = 0; // 0 = Unlimited (default)
  private turnTimerEvent: Phaser.Time.TimerEvent | null = null;
  private currentTimeLeft = 0;

  // Temporary state container for restoring turn state after animations
  private previousState: TurnState = 'PLAYER_TURN';

  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('char_warrior', 'char_warrior.png');
    this.load.image('char_mage', 'char_mage.png');
    this.load.image('char_archer', 'char_archer.png');
    this.load.image('char_goblin', 'char_goblin.png');
    this.load.image('char_goblin_boss', 'char_goblin_boss.png');
  }

  create() {
    this.sys.textures.get('char_warrior').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.sys.textures.get('char_mage').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.sys.textures.get('char_archer').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.sys.textures.get('char_goblin').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.sys.textures.get('char_goblin_boss').setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.turnManager = new TurnManager();
    this.isGameOver = false;
    this.characters = [];
    this.selectedCharacter = null;
    this.isDirectionSelectMode = false;
    this.isPostMoveDirectionSelect = false;

    // Set initial origin points based on screen dimensions
    this.updateOriginPoints();

    // Initialize obstacle map (All flat now)
    this.initObstacles();

    // Setup Graphics objects
    this.tileMapGraphics = this.add.graphics();
    this.interactiveGraphics = this.add.graphics();
    this.selectionRingGraphics = this.add.graphics();

    // Render Static Map
    this.renderStaticMap();

    // Create Characters
    this.createCharacters();

    // Select first player character (Leon) by default
    const firstPlayer = this.characters.find(c => !c.isEnemy);
    if (firstPlayer) {
      this.selectCharacter(firstPlayer);
    }

    // Bind Turn Manager to UI
    this.setupTurnManagerEvents();

    // Bind DOM UI Events
    this.bindDOMEvents();

    // Disable browser right click context menu
    this.input.mouse?.disableContextMenu();

    // Resize Handler
    this.scale.on('resize', this.handleResize, this);

    // Input Listeners
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
  }

  private drawPixelArt(
    char: Character
  ) {
    const isMirror = (char.direction === 'SE' || char.direction === 'SW');
    char.bodySprite.setFlipX(isMirror);
  }

  private updateCharacterVisualMode(char: Character) {
    // 2.5D sprite is permanently hidden
    if (char.bodySprite) {
      char.bodySprite.setVisible(false);
    }
    
    // Toggle only the head emoji emblem and head text visibility
    const showHead = this.showHeadAvatar;
    char.bodyEmblem.setVisible(showHead);
    char.bodyText.setVisible(showHead);

    // Body parts (trunk, shield, sword, horns, ears) are always visible
    if (char.bodyParts) {
      char.bodyParts.forEach(part => {
        if (part) {
          (part as any).setVisible(true);
        }
      });
    }
  }

  private toggleAvatarMode() {
    this.showHeadAvatar = !this.showHeadAvatar;
    this.characters.forEach(char => {
      this.updateCharacterVisualMode(char);
    });
  }

  update() {
    // Clear and redraw highlights
    this.interactiveGraphics.clear();
    this.drawHoverHighlight();
    this.drawMovementRangeHighlight();
    this.drawAttackRangeHighlight();
    this.drawHoveredCharacterAttackRange();
    this.drawDirectionSelectHighlight();
    this.drawSelectionRing();
  }

  private updateOriginPoints() {
    this.mapOriginX = this.cameras.main.width / 2;
    this.mapOriginY = this.cameras.main.height / 3;
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.updateOriginPoints();
    this.renderStaticMap();
    this.updateCharacterPositions();
  }

  private initObstacles() {
    this.obstacleGrid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        row.push(false);
      }
      this.obstacleGrid.push(row);
    }
    // Set static obstacles on specific tiles to demonstrate the SkinRegistry system
    this.obstacleGrid[4][3] = true; // (x: 3, y: 4)
    this.obstacleGrid[3][6] = true; // (x: 6, y: 3)
    this.obstacleGrid[7][4] = true; // (x: 4, y: 7)
    this.obstacleGrid[6][7] = true; // (x: 7, y: 6)
  }

  private getDynamicObstacleGrid(excludingChar: Character, targetChar?: Character): boolean[][] {
    const grid: boolean[][] = [];
    for (let y = 0; y < this.gridHeight; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        // Copy static obstacles from base grid
        row.push(this.obstacleGrid[y][x]);
      }
      grid.push(row);
    }

    // Occupied tiles by other alive entities are solid walls, unless it is the target destination
    this.characters.forEach(c => {
      if (c.hp > 0 && c !== excludingChar && c !== targetChar) {
        grid[c.y][c.x] = true;
      }
    });

    return grid;
  }



  private gridToScreen(x: number, y: number): Point {
    const isoX = (x - y) * this.halfTileWidth + this.mapOriginX;
    const isoY = (x + y) * this.halfTileHeight + this.mapOriginY;
    return { x: isoX, y: isoY };
  }

  private screenToGrid(screenX: number, screenY: number): Point {
    const dx = screenX - this.mapOriginX;
    const dy = screenY - this.mapOriginY;
    
    // Add offset (+1) to align mathematical coordinate diamond center with screen coordinate
    const x = Math.floor((dy / this.halfTileHeight + dx / this.halfTileWidth + 1) / 2);
    const y = Math.floor((dy / this.halfTileHeight - dx / this.halfTileWidth + 1) / 2);
    
    return { x, y };
  }

  private renderStaticMap() {
    this.tileMapGraphics.clear();

    // Draw tiles
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const screenPos = this.gridToScreen(x, y);

        // Tile base colors checkerboard
        let tileColor = 0x1e293b;
        if ((x + y) % 2 === 0) {
          tileColor = 0x1e293b;
        } else {
          tileColor = 0x0f172a;
        }
        this.drawIsometricTile(this.tileMapGraphics, screenPos.x, screenPos.y, tileColor, true);

        // Revert to original: Draw static 3D gray obstacle cylinder
        if (this.obstacleGrid[y][x]) {
          this.drawIsometricCylinder(this.tileMapGraphics, screenPos.x, screenPos.y);
        }
      }
    }
  }

  private drawIsometricCylinder(graphics: Phaser.GameObjects.Graphics, isoX: number, isoY: number) {
    const height = 46;
    
    // Shadow under cylinder
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillEllipse(isoX, isoY, 48, 24);
    
    // Bottom Base cap
    graphics.fillStyle(0x475569, 1);
    graphics.fillEllipse(isoX, isoY, 32, 16);
    
    // Column Body
    graphics.fillRect(isoX - 16, isoY - height, 32, height);
    
    // Top Cap
    graphics.fillStyle(0x64748b, 1);
    graphics.fillEllipse(isoX, isoY - height, 32, 16);
    
    // Outlines
    graphics.lineStyle(1.8, 0x18181b, 1.0);
    graphics.beginPath();
    graphics.moveTo(isoX - 16, isoY - height);
    graphics.lineTo(isoX - 16, isoY);
    graphics.moveTo(isoX + 16, isoY - height);
    graphics.lineTo(isoX + 16, isoY);
    graphics.strokePath();
    
    graphics.beginPath();
    graphics.arc(isoX, isoY, 16, 0, Math.PI, false);
    graphics.strokePath();

    graphics.strokeEllipse(isoX, isoY - height, 32, 16);
  }

  private drawIsometricTile(graphics: Phaser.GameObjects.Graphics, isoX: number, isoY: number, color: number, border: boolean) {
    graphics.fillStyle(color, 1);
    graphics.lineStyle(1.5, 0xffffff, 0.08);

    graphics.beginPath();
    graphics.moveTo(isoX, isoY - this.halfTileHeight);
    graphics.lineTo(isoX + this.halfTileWidth, isoY);
    graphics.lineTo(isoX, isoY + this.halfTileHeight);
    graphics.lineTo(isoX - this.halfTileWidth, isoY);
    graphics.closePath();
    
    graphics.fillPath();
    if (border) {
      graphics.strokePath();
    }

    // 16-bit Dithering / Pixel Art texture overlay
    const stepY = 4;
    const stepX = 4;
    
    // Extract RGB channels
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    // Seeded random-like texture based on tile coordinates to keep it static
    const seed = Math.sin(isoX * 12.9898 + isoY * 78.233) * 43758.5453;
    let randIdx = Math.abs(Math.floor(seed)) % 100;

    for (let dy = -this.halfTileHeight + 2; dy < this.halfTileHeight - 2; dy += stepY) {
      // Calculate isometric diamond bounds at current dy height
      const tRatio = 1 - Math.abs(dy) / this.halfTileHeight;
      const xRange = Math.floor(this.halfTileWidth * tRatio) - 2;

      for (let dx = -xRange; dx < xRange; dx += stepX) {
        randIdx = (randIdx * 33 + 17) % 100;
        
        if (randIdx > 75) {
          // Darken pixel dot
          const shadowColor = (Math.max(0, r - 12) << 16) | (Math.max(0, g - 12) << 8) | Math.max(0, b - 12);
          graphics.fillStyle(shadowColor, 0.65);
          graphics.fillRect(isoX + dx, isoY + dy, stepX, stepY);
        } else if (randIdx < 15) {
          // Lighten pixel dot (grass blade tip / sand specular)
          const highlightColor = (Math.min(255, r + 15) << 16) | (Math.min(255, g + 15) << 8) | Math.min(255, b + 15);
          graphics.fillStyle(highlightColor, 0.45);
          graphics.fillRect(isoX + dx, isoY + dy, stepX, stepY);
        }
      }
    }
  }

  private createCharacters() {
    // -------------------------------------------------------------
    // ALLIES (Player Side) - 5 Characters
    // -------------------------------------------------------------

    // 1. Leon (Warrior / Indigo - Melee)
    const leonContainer = this.add.container(0, 0);
    leonContainer.add(this.add.ellipse(0, 0, 48, 24, 0x000000, 0.4)); // shadow
    
    // Warrior Sprite (Hidden by default)
    const leonBody = this.add.image(0, -28, 'char_warrior').setScale(1.92).setOrigin(0.5, 0.95).setVisible(false);
    leonContainer.add(leonBody);

    // Body & Gear
    const leonBodyTrunk = this.add.rectangle(0, -10, 24, 16, 0x1e1b4b).setStrokeStyle(1.5, 0x38bdf8, 1);
    const leonShield = this.add.circle(-18, -14, 10, 0xfacc15).setStrokeStyle(1.5, 0xffffff, 1);
    const leonSword = this.add.rectangle(18, -14, 6, 20, 0x94a3b8).setAngle(20).setStrokeStyle(1, 0xffffff, 1);
    const leonHilt = this.add.rectangle(18, -4, 10, 3, 0x78350f).setAngle(20);
    leonContainer.add(leonBodyTrunk);
    leonContainer.add(leonShield);
    leonContainer.add(leonSword);
    leonContainer.add(leonHilt);

    // Warrior Horns
    const leonHornL = this.add.triangle(-15, -42, 0, 8, -6, -4, 10, 8, 0xfacc15).setAngle(-25);
    const leonHornR = this.add.triangle(15, -42, 0, 8, 6, -4, -10, 8, 0xfacc15).setAngle(25);
    leonContainer.add(leonHornL);
    leonContainer.add(leonHornR);

    const leonEmblem = this.add.circle(0, -28, 22, 0x1e1b4b).setStrokeStyle(2.5, 0x38bdf8, 1);
    const leonText = this.add.text(0, -28, '⚔️', { fontSize: '24px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    leonContainer.add(leonEmblem);
    leonContainer.add(leonText);

    const leonDirGraphics = this.add.graphics();
    leonContainer.add(leonDirGraphics);

    const leon: Character = {
      name: '레온 (Leon)',
      x: 1,
      y: 1,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      ap: 3,
      maxAp: 3,
      avatar: '⚔️',
      isEnemy: false,
      gameObject: leonContainer,
      moveRange: 4,
      minAttackRange: 1,
      maxAttackRange: 1, // Melee
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: leonEmblem,
      bodyText: leonText,
      bodySprite: leonBody,
      bodyParts: [leonBodyTrunk, leonShield, leonSword, leonHilt, leonHornL, leonHornR],
      direction: 'SE',
      dirGraphics: leonDirGraphics,
      skinType: 'warrior'
    };
    this.updateDirectionVisual(leon);
    this.characters.push(leon);

    // 2. Aisha (Mage / Purple Magenta - Ranged)
    const aishaContainer = this.add.container(0, 0);
    aishaContainer.add(this.add.ellipse(0, 0, 44, 22, 0x000000, 0.4));
    
    // Mage Sprite (Hidden by default)
    const aishaBody = this.add.image(0, -28, 'char_mage').setScale(1.92).setOrigin(0.5, 0.95).setVisible(false);
    aishaContainer.add(aishaBody);

    // Body & Gear
    const aishaBodyTrunk = this.add.triangle(0, -8, 0, -18, -13, 2, 13, 2, 0x701a75).setStrokeStyle(1.5, 0xd946ef, 1);
    const aishaStaff = this.add.rectangle(16, -18, 4, 28, 0xd97706);
    const aishaOrb = this.add.circle(16, -33, 6, 0x38bdf8).setStrokeStyle(1.5, 0xffffff, 1);
    aishaContainer.add(aishaBodyTrunk);
    aishaContainer.add(aishaStaff);
    aishaContainer.add(aishaOrb);

    // Wizard Hat Top
    const aishaHat = this.add.triangle(0, -50, 0, 0, -10, 16, 10, 16, 0x701a75).setStrokeStyle(1.5, 0xd946ef, 1);
    aishaContainer.add(aishaHat);

    const aishaEmblem = this.add.circle(0, -28, 22, 0x312e81).setStrokeStyle(2.5, 0x38bdf8, 1);
    const aishaText = this.add.text(0, -28, '🔮', { fontSize: '24px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    aishaContainer.add(aishaEmblem);
    aishaContainer.add(aishaText);

    const aishaDirGraphics = this.add.graphics();
    aishaContainer.add(aishaDirGraphics);

    const aisha: Character = {
      name: '에이샤 (Aisha)',
      x: 1,
      y: 2,
      hp: 75,
      maxHp: 75,
      mp: 120,
      maxMp: 120,
      ap: 3,
      maxAp: 3,
      avatar: '🔮',
      isEnemy: false,
      gameObject: aishaContainer,
      moveRange: 3,
      minAttackRange: 2,
      maxAttackRange: 3, // Ranged Mage
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: aishaEmblem,
      bodyText: aishaText,
      bodySprite: aishaBody,
      bodyParts: [aishaBodyTrunk, aishaStaff, aishaOrb, aishaHat],
      direction: 'SE',
      dirGraphics: aishaDirGraphics,
      skinType: 'mage'
    };
    this.updateDirectionVisual(aisha);
    this.characters.push(aisha);

    // 3. Roy (Archer / Teal - Long Range)
    const royContainer = this.add.container(0, 0);
    royContainer.add(this.add.ellipse(0, 0, 44, 22, 0x000000, 0.4));
    
    // Archer Sprite (Hidden by default)
    const royBody = this.add.image(0, -28, 'char_archer').setScale(1.92).setOrigin(0.5, 0.95).setVisible(false);
    royContainer.add(royBody);

    // Body & Gear
    const royBodyTrunk = this.add.rectangle(0, -10, 20, 16, 0x064e3b).setStrokeStyle(1.5, 0x34d399, 1);
    const royBow = this.add.triangle(-16, -16, 0, -10, -5, 12, 5, 12, 0x78350f).setAngle(-15).setStrokeStyle(1, 0xfacc15, 1);
    royContainer.add(royBodyTrunk);
    royContainer.add(royBow);

    // Archer feather decoration
    const royFeather = this.add.triangle(15, -42, 0, 10, -4, 0, 6, 0, 0x10b981).setAngle(35);
    royContainer.add(royFeather);

    const royEmblem = this.add.circle(0, -28, 22, 0x064e3b).setStrokeStyle(2.5, 0x38bdf8, 1);
    const royText = this.add.text(0, -28, '🏹', { fontSize: '24px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    royContainer.add(royEmblem);
    royContainer.add(royText);

    const royDirGraphics = this.add.graphics();
    royContainer.add(royDirGraphics);

    const roy: Character = {
      name: '로이 (Roy)',
      x: 2,
      y: 1,
      hp: 80,
      maxHp: 80,
      mp: 40,
      maxMp: 40,
      ap: 3,
      maxAp: 3,
      avatar: '🏹',
      isEnemy: false,
      gameObject: royContainer,
      moveRange: 4,
      minAttackRange: 3,
      maxAttackRange: 5, // Long Ranged Archer
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: royEmblem,
      bodyText: royText,
      bodySprite: royBody,
      bodyParts: [royBodyTrunk, royBow, royFeather],
      direction: 'SE',
      dirGraphics: royDirGraphics,
      skinType: 'archer'
    };
    this.updateDirectionVisual(roy);
    this.characters.push(roy);

    // 4. Ren (Cleric / Green - Support)
    const renContainer = this.add.container(0, 0);
    renContainer.add(this.add.ellipse(0, 0, 44, 22, 0x000000, 0.4));
    
    // Cleric Sprite (Hidden by default)
    const renBody = this.add.image(0, -28, 'char_mage').setScale(1.92).setOrigin(0.5, 0.95).setVisible(false);
    renContainer.add(renBody);

    // Body & Gear
    const renBodyTrunk = this.add.rectangle(0, -10, 22, 16, 0x1f2937).setStrokeStyle(1.5, 0xffffff, 1);
    const renBible = this.add.rectangle(0, -8, 14, 10, 0xfef08a).setStrokeStyle(1, 0x78350f, 1);
    renContainer.add(renBodyTrunk);
    renContainer.add(renBible);

    // Holy Halo Ring
    const renHalo = this.add.ellipse(0, -46, 26, 8).setStrokeStyle(2, 0xfacc15, 0.85);
    renContainer.add(renHalo);

    const renEmblem = this.add.circle(0, -28, 22, 0x065f46).setStrokeStyle(2.5, 0x38bdf8, 1);
    const renText = this.add.text(0, -28, '💚', { fontSize: '24px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    renContainer.add(renEmblem);
    renContainer.add(renText);

    const renDirGraphics = this.add.graphics();
    renContainer.add(renDirGraphics);

    const ren: Character = {
      name: '렌 (Ren)',
      x: 2,
      y: 2,
      hp: 85,
      maxHp: 85,
      mp: 100,
      maxMp: 100,
      ap: 3,
      maxAp: 3,
      avatar: '💚',
      isEnemy: false,
      gameObject: renContainer,
      moveRange: 3,
      minAttackRange: 1,
      maxAttackRange: 2, // Cleric Spell range
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: renEmblem,
      bodyText: renText,
      bodySprite: renBody,
      bodyParts: [renBodyTrunk, renBible, renHalo],
      direction: 'SE',
      dirGraphics: renDirGraphics,
      skinType: 'cleric'
    };
    this.updateDirectionVisual(ren);
    this.characters.push(ren);

    // 5. Kyle (Rogue / Dark Slate - Assassin)
    const kyleContainer = this.add.container(0, 0);
    kyleContainer.add(this.add.ellipse(0, 0, 46, 23, 0x000000, 0.4));
    
    // Rogue Sprite (Hidden by default)
    const kyleBody = this.add.image(0, -28, 'char_warrior').setScale(1.92).setOrigin(0.5, 0.95).setVisible(false);
    kyleContainer.add(kyleBody);

    // Body & Gear
    const kyleBodyTrunk = this.add.rectangle(0, -10, 20, 16, 0x1f2937).setStrokeStyle(1.5, 0x4b5563, 1);
    const kyleDaggerL = this.add.triangle(-14, -14, 0, -8, -3, 8, 3, 8, 0x94a3b8).setAngle(-25).setStrokeStyle(1, 0xef4444, 1);
    const kyleDaggerR = this.add.triangle(14, -14, 0, -8, -3, 8, 3, 8, 0x94a3b8).setAngle(25).setStrokeStyle(1, 0xef4444, 1);
    kyleContainer.add(kyleBodyTrunk);
    kyleContainer.add(kyleDaggerL);
    kyleContainer.add(kyleDaggerR);

    // Rogue Bandana tail
    const kyleBandana = this.add.triangle(-15, -20, 0, 4, 10, 0, 4, -10, 0xdc2626).setAngle(-30);
    kyleContainer.add(kyleBandana);

    const kyleEmblem = this.add.circle(0, -28, 22, 0x111827).setStrokeStyle(2.5, 0x38bdf8, 1);
    const kyleText = this.add.text(0, -28, '🗡️', { fontSize: '24px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    kyleContainer.add(kyleEmblem);
    kyleContainer.add(kyleText);

    const kyleDirGraphics = this.add.graphics();
    kyleContainer.add(kyleDirGraphics);

    const kyle: Character = {
      name: '카일 (Kyle)',
      x: 1,
      y: 3,
      hp: 90,
      maxHp: 90,
      mp: 60,
      maxMp: 60,
      ap: 3,
      maxAp: 3,
      avatar: '🗡️',
      isEnemy: false,
      gameObject: kyleContainer,
      moveRange: 5,
      minAttackRange: 1,
      maxAttackRange: 1, // Dagger Melee
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: kyleEmblem,
      bodyText: kyleText,
      bodySprite: kyleBody,
      bodyParts: [kyleBodyTrunk, kyleDaggerL, kyleDaggerR, kyleBandana],
      direction: 'SE',
      dirGraphics: kyleDirGraphics,
      skinType: 'rogue'
    };
    this.updateDirectionVisual(kyle);
    this.characters.push(kyle);

    // -------------------------------------------------------------
    // ENEMIES (Goblin Side) - 5 Characters
    // -------------------------------------------------------------

    // 1. Goblin Warrior A (Red - Melee)
    const gobAContainer = this.add.container(0, 0);
    gobAContainer.add(this.add.ellipse(0, 0, 48, 24, 0x000000, 0.4));
    
    // Goblin Sprite (Hidden by default)
    const gobABody = this.add.image(0, -28, 'char_goblin').setScale(1.92).setOrigin(0.5, 0.95).setVisible(false);
    gobAContainer.add(gobABody);

    // Body & Gear
    const gobABodyTrunk = this.add.rectangle(0, -10, 18, 14, 0x3f6212).setStrokeStyle(1.5, 0x65a30d, 1);
    const gobADagger = this.add.triangle(14, -12, 0, -6, -3, 6, 3, 6, 0x475569).setAngle(15).setStrokeStyle(1, 0xfee2e2, 1);
    gobAContainer.add(gobABodyTrunk);
    gobAContainer.add(gobADagger);

    // Goblin pointy ears
    const gobAEarL = this.add.triangle(-20, -28, 0, 0, 8, -5, 5, 7, 0x4d7c0f).setAngle(-45);
    const gobAEarR = this.add.triangle(20, -28, 0, 0, -8, -5, -5, 7, 0x4d7c0f).setAngle(45);
    gobAContainer.add(gobAEarL);
    gobAContainer.add(gobAEarR);

    const gobAEmblem = this.add.circle(0, -28, 22, 0x450a0a).setStrokeStyle(2.5, 0xf97316, 1);
    const gobAText = this.add.text(0, -28, '👹', { fontSize: '24px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    gobAContainer.add(gobAEmblem);
    gobAContainer.add(gobAText);

    const gobADirGraphics = this.add.graphics();
    gobAContainer.add(gobADirGraphics);

    const gobA: Character = {
      name: '고블린 병사 A',
      x: 8,
      y: 8,
      hp: 60,
      maxHp: 60,
      mp: 10,
      maxMp: 10,
      ap: 3,
      maxAp: 3,
      avatar: '👹',
      isEnemy: true,
      gameObject: gobAContainer,
      moveRange: 3,
      minAttackRange: 1,
      maxAttackRange: 1,
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: gobAEmblem,
      bodyText: gobAText,
      bodySprite: gobABody,
      bodyParts: [gobABodyTrunk, gobADagger, gobAEarL, gobAEarR],
      direction: 'NW',
      dirGraphics: gobADirGraphics,
      skinType: 'gob_warrior'
    };
    this.updateDirectionVisual(gobA);
    this.characters.push(gobA);

    // 2. Goblin Archer B (Orange - Ranged)
    const gobBContainer = this.add.container(0, 0);
    gobBContainer.add(this.add.ellipse(0, 0, 44, 22, 0x000000, 0.4));
    
    // Goblin Archer Sprite (Hidden by default)
    const gobBBody = this.add.image(0, -28, 'char_goblin').setScale(1.92).setOrigin(0.5, 0.95).setVisible(false);
    gobBContainer.add(gobBBody);

    // Body & Gear
    const gobBBodyTrunk = this.add.rectangle(0, -10, 18, 14, 0x3f6212).setStrokeStyle(1.5, 0x65a30d, 1);
    const gobBBow = this.add.triangle(-14, -14, 0, -8, -4, 8, 4, 8, 0x78350f).setAngle(-15).setStrokeStyle(1, 0xfacc15, 1);
    gobBContainer.add(gobBBodyTrunk);
    gobBContainer.add(gobBBow);

    // Goblin ears
    const gobBEarL = this.add.triangle(-20, -28, 0, 0, 8, -5, 5, 7, 0x4d7c0f).setAngle(-45);
    const gobBEarR = this.add.triangle(20, -28, 0, 0, -8, -5, -5, 7, 0x4d7c0f).setAngle(45);
    gobBContainer.add(gobBEarL);
    gobBContainer.add(gobBEarR);

    const gobBEmblem = this.add.circle(0, -28, 22, 0x7c2d12).setStrokeStyle(2.5, 0xf97316, 1);
    const gobBText = this.add.text(0, -28, '🏹', { fontSize: '24px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    gobBContainer.add(gobBEmblem);
    gobBContainer.add(gobBText);

    const gobBDirGraphics = this.add.graphics();
    gobBContainer.add(gobBDirGraphics);

    const gobB: Character = {
      name: '고블린 소총병 B',
      x: 8,
      y: 7,
      hp: 50,
      maxHp: 50,
      mp: 20,
      maxMp: 20,
      ap: 3,
      maxAp: 3,
      avatar: '🏹',
      isEnemy: true,
      gameObject: gobBContainer,
      moveRange: 3,
      minAttackRange: 2,
      maxAttackRange: 4,
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: gobBEmblem,
      bodyText: gobBText,
      bodySprite: gobBBody,
      bodyParts: [gobBBodyTrunk, gobBBow, gobBEarL, gobBEarR],
      direction: 'NW',
      dirGraphics: gobBDirGraphics,
      skinType: 'gob_archer'
    };
    this.updateDirectionVisual(gobB);
    this.characters.push(gobB);

    // 3. Goblin Shaman C (Crimson - Shaman Mage)
    const gobCContainer = this.add.container(0, 0);
    gobCContainer.add(this.add.ellipse(0, 0, 44, 22, 0x000000, 0.4));
    
    // Goblin Shaman Sprite (Hidden by default)
    const gobCBody = this.add.image(0, -28, 'char_goblin_boss').setScale(1.92).setOrigin(0.5, 0.95).setVisible(false);
    gobCContainer.add(gobCBody);

    // Body & Gear
    const gobCBodyTrunk = this.add.triangle(0, -8, 0, -18, -11, 2, 11, 2, 0x881337).setStrokeStyle(1.5, 0xf97316, 1);
    const gobCStaff = this.add.rectangle(15, -18, 3, 26, 0x78350f);
    const gobCOrb = this.add.circle(15, -31, 5, 0xa855f7).setStrokeStyle(1, 0xffffff, 1);
    gobCContainer.add(gobCBodyTrunk);
    gobCContainer.add(gobCStaff);
    gobCContainer.add(gobCOrb);

    // Goblin Shaman Feather Crown
    const gobCFeatherL = this.add.triangle(-6, -46, 0, 14, -3, 0, 3, 0, 0xdc2626).setAngle(-15);
    const gobCFeatherM = this.add.triangle(0, -50, 0, 16, -3, 0, 3, 0, 0xfacc15);
    const gobCFeatherR = this.add.triangle(6, -46, 0, 14, -3, 0, 3, 0, 0xdc2626).setAngle(15);
    gobCContainer.add(gobCFeatherL);
    gobCContainer.add(gobCFeatherM);
    gobCContainer.add(gobCFeatherR);

    const gobCEmblem = this.add.circle(0, -28, 22, 0x881337).setStrokeStyle(2.5, 0xf97316, 1);
    const gobCText = this.add.text(0, -28, '🧙‍♂️', { fontSize: '24px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    gobCContainer.add(gobCEmblem);
    gobCContainer.add(gobCText);

    const gobCDirGraphics = this.add.graphics();
    gobCContainer.add(gobCDirGraphics);

    const gobC: Character = {
      name: '고블린 주술사 C',
      x: 7,
      y: 8,
      hp: 55,
      maxHp: 55,
      mp: 80,
      maxMp: 80,
      ap: 3,
      maxAp: 3,
      avatar: '🧙‍♂️',
      isEnemy: true,
      gameObject: gobCContainer,
      moveRange: 3,
      minAttackRange: 2,
      maxAttackRange: 3,
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: gobCEmblem,
      bodyText: gobCText,
      bodySprite: gobCBody,
      bodyParts: [gobCBodyTrunk, gobCStaff, gobCOrb, gobCFeatherL, gobCFeatherM, gobCFeatherR],
      direction: 'NW',
      dirGraphics: gobCDirGraphics,
      skinType: 'gob_shaman'
    };
    this.updateDirectionVisual(gobC);
    this.characters.push(gobC);

    // 4. Goblin Assassin D (Dark Brown - Rogue Raider)
    const gobDContainer = this.add.container(0, 0);
    gobDContainer.add(this.add.ellipse(0, 0, 44, 22, 0x000000, 0.4));
    
    // Goblin Assassin Sprite (Hidden by default)
    const gobDBody = this.add.image(0, -28, 'char_goblin').setScale(1.92).setOrigin(0.5, 0.95).setVisible(false);
    gobDContainer.add(gobDBody);

    // Body & Gear
    const gobDBodyTrunk = this.add.rectangle(0, -10, 18, 14, 0x3f6212).setStrokeStyle(1.5, 0x65a30d, 1);
    const gobDDaggerL = this.add.triangle(-12, -12, 0, -6, -2.5, 6, 2.5, 6, 0x94a3b8).setAngle(-25).setStrokeStyle(1, 0xef4444, 1);
    const gobDDaggerR = this.add.triangle(12, -12, 0, -6, -2.5, 6, 2.5, 6, 0x94a3b8).setAngle(25).setStrokeStyle(1, 0xef4444, 1);
    gobDContainer.add(gobDBodyTrunk);
    gobDContainer.add(gobDDaggerL);
    gobDContainer.add(gobDDaggerR);

    // Goblin ears
    const gobDEarL = this.add.triangle(-20, -28, 0, 0, 8, -5, 5, 7, 0x4d7c0f).setAngle(-45);
    const gobDEarR = this.add.triangle(20, -28, 0, 0, -8, -5, -5, 7, 0x4d7c0f).setAngle(45);
    gobDContainer.add(gobDEarL);
    gobDContainer.add(gobDEarR);

    const gobDEmblem = this.add.circle(0, -28, 22, 0x451a03).setStrokeStyle(2.5, 0xf97316, 1);
    const gobDText = this.add.text(0, -28, '👤', { fontSize: '24px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    gobDContainer.add(gobDEmblem);
    gobDContainer.add(gobDText);

    const gobDDirGraphics = this.add.graphics();
    gobDContainer.add(gobDDirGraphics);

    const gobD: Character = {
      name: '고블린 습격자 D',
      x: 7,
      y: 7,
      hp: 50,
      maxHp: 50,
      mp: 30,
      maxMp: 30,
      ap: 3,
      maxAp: 3,
      avatar: '👤',
      isEnemy: true,
      gameObject: gobDContainer,
      moveRange: 4,
      minAttackRange: 1,
      maxAttackRange: 1,
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: gobDEmblem,
      bodyText: gobDText,
      bodySprite: gobDBody,
      bodyParts: [gobDBodyTrunk, gobDDaggerL, gobDDaggerR, gobDEarL, gobDEarR],
      direction: 'NW',
      dirGraphics: gobDDirGraphics,
      skinType: 'gob_assassin'
    };
    this.updateDirectionVisual(gobD);
    this.characters.push(gobD);

    // 5. Goblin Defender E (Olive Green - Shield Tanker)
    const gobEContainer = this.add.container(0, 0);
    gobEContainer.add(this.add.ellipse(0, 0, 52, 26, 0x000000, 0.4));
    
    // Goblin Defender Sprite (Hidden by default)
    const gobEBody = this.add.image(0, -28, 'char_goblin_boss').setScale(1.92).setOrigin(0.5, 0.95).setVisible(false);
    gobEContainer.add(gobEBody);

    // Body & Gear
    const gobEBodyTrunk = this.add.rectangle(0, -10, 22, 16, 0x14532d).setStrokeStyle(1.5, 0x65a30d, 1);
    const gobEShield = this.add.circle(-18, -14, 9, 0x475569).setStrokeStyle(1.5, 0xffffff, 1);
    gobEContainer.add(gobEBodyTrunk);
    gobEContainer.add(gobEShield);

    // Goblin Shaman/Defender Horn style feathers
    const gobEFeatherL = this.add.triangle(-6, -46, 0, 14, -3, 0, 3, 0, 0xdc2626).setAngle(-15);
    const gobEFeatherR = this.add.triangle(6, -46, 0, 14, -3, 0, 3, 0, 0xdc2626).setAngle(15);
    gobEContainer.add(gobEFeatherL);
    gobEContainer.add(gobEFeatherR);

    const gobEEmblem = this.add.circle(0, -28, 22, 0x14532d).setStrokeStyle(2.5, 0xf97316, 1);
    const gobEText = this.add.text(0, -28, '🛡️', { fontSize: '24px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    gobEContainer.add(gobEEmblem);
    gobEContainer.add(gobEText);

    const gobEDirGraphics = this.add.graphics();
    gobEContainer.add(gobEDirGraphics);

    const gobE: Character = {
      name: '고블린 대방패병 E',
      x: 8,
      y: 9,
      hp: 85,
      maxHp: 85,
      mp: 10,
      maxMp: 10,
      ap: 3,
      maxAp: 3,
      avatar: '🛡️',
      isEnemy: true,
      gameObject: gobEContainer,
      moveRange: 2,
      minAttackRange: 1,
      maxAttackRange: 1,
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: gobEEmblem,
      bodyText: gobEText,
      bodySprite: gobEBody,
      bodyParts: [gobEBodyTrunk, gobEShield, gobEFeatherL, gobEFeatherR],
      direction: 'NW',
      dirGraphics: gobEDirGraphics,
      skinType: 'gob_defender'
    };
    this.updateDirectionVisual(gobE);
    this.characters.push(gobE);

    // Attach dynamic mini HUD HP/MP graphics & permanent base faction aura rings to all characters
    this.characters.forEach(char => {
      const ringColor = char.isEnemy ? 0xf97316 : 0x3b82f6; // Orange for enemy, Blue for ally
      const auraRing = this.add.ellipse(0, 0, 52, 26);
      auraRing.setStrokeStyle(1.8, ringColor, 0.45);
      // Add right above the base shadow (index 1) to ensure depth layout order
      char.gameObject.addAt(auraRing, 1);

      const hudG = this.add.graphics();
      char.gameObject.add(hudG);
      char.hudBarGraphics = hudG;

      // Initial visual synchronization
      this.drawPixelArt(char);
      this.updateCharacterVisualMode(char);
    });

    this.updateCharacterPositions();
    this.characters.forEach(char => this.updateMiniHUDBar(char));
  }

  private updateDirectionVisual(char: Character) {
    char.dirGraphics.clear();
    
    // Draw neon cyan sight indicator line & endpoint pointer wedge
    const color = char.isEnemy ? 0xf97316 : 0x38bdf8;
    char.dirGraphics.lineStyle(3.5, 0xffffff, 0.85);
    char.dirGraphics.fillStyle(color, 1);

    const startX = 0;
    const startY = -4; // Center base height offset

    let targetX = 0;
    let targetY = 0;

    switch (char.direction) {
      case 'NE': // grid x++ => screen Down-Right
        targetX = 26;
        targetY = 13;
        break;
      case 'SE': // grid y++ => screen Down-Left
        targetX = -26;
        targetY = 13;
        break;
      case 'SW': // grid x-- => screen Up-Left
        targetX = -26;
        targetY = -13;
        break;
      case 'NW': // grid y-- => screen Up-Right
        targetX = 26;
        targetY = -13;
        break;
    }

    // Line drawing
    char.dirGraphics.beginPath();
    char.dirGraphics.moveTo(startX, startY);
    char.dirGraphics.lineTo(targetX, targetY);
    char.dirGraphics.strokePath();

    // Wedge/Arrow Tip circle dot
    char.dirGraphics.fillCircle(targetX, targetY, 4.5);
    char.dirGraphics.lineStyle(1.5, 0xffffff, 1);
    char.dirGraphics.strokeCircle(targetX, targetY, 4.5);

    // Redraw pixel art on orientation change (to support correct mirroring/flip)
    this.drawPixelArt(char);
  }

  private updateCharacterPositions() {
    this.characters.forEach(char => {
      this.setCharacterPosition(char);
    });
  }

  private setCharacterPosition(char: Character) {
    const pos = this.gridToScreen(char.x, char.y);
    char.gameObject.setPosition(pos.x, pos.y);
    char.gameObject.setDepth(pos.y + 10);
  }

  private selectCharacter(char: Character) {
    this.selectedCharacter = char;
    this.updateUIProfile(char);

    // 1. Remove previous indicator safely
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
      this.selectionIndicator = null;
    }

    // 2. Spawn a bouncing triangle indicator inside the container (above the character body)
    const color = char.isEnemy ? 0xf97316 : 0xfacc15; // Orange for enemy, Gold for ally
    
    // Draw an inverted triangle relative to container origin (0,0 is at base ellipse shadow)
    // Height of body is roughly -56, so we place indicator at y = -75
    this.selectionIndicator = this.add.triangle(0, -75, 0, 0, 16, 0, 8, 12, color, 1);
    this.selectionIndicator.setStrokeStyle(2, 0xffffff, 0.9);
    char.gameObject.add(this.selectionIndicator);

    // Bouncing animation on floating indicator
    this.tweens.add({
      targets: this.selectionIndicator,
      y: -87,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 3. Play squash & stretch landing jump bounce on selection
    const originalY = char.gameObject.y;
    this.tweens.chain({
      targets: char.gameObject,
      tweens: [
        {
          scaleY: 0.82,
          scaleX: 1.12,
          y: originalY + 4,
          duration: 70,
          ease: 'Quad.easeOut'
        },
        {
          scaleY: 1.15,
          scaleX: 0.88,
          y: originalY - 14,
          duration: 120,
          ease: 'Quad.easeIn'
        },
        {
          scaleY: 1.0,
          scaleX: 1.0,
          y: originalY,
          duration: 90,
          ease: 'Quad.easeOut'
        }
      ]
    });

    // Reset current modes
    this.isDirectionSelectMode = false;
    this.isPostMoveDirectionSelect = false;

    // 4. UX Fix: Automatically trigger movement mode if char has not moved yet
    const btnMove = document.getElementById('btn-move');
    const btnTurn = document.getElementById('btn-turn');
    const btnAttack = document.getElementById('btn-attack');
    
    if (btnMove) btnMove.classList.remove('highlight');
    if (btnTurn) btnTurn.classList.remove('highlight');
    if (btnAttack) btnAttack.classList.remove('highlight');
    this.isAttackMode = false;

    if (!char.isEnemy && !char.hasMovedThisTurn && this.turnManager.getState() === 'PLAYER_TURN' && !this.isGameOver) {
      this.isMovementMode = true;
      if (btnMove) btnMove.classList.add('highlight');
    } else {
      this.isMovementMode = false;
    }
  }

  // Tactical straight-line and blocked obstacle checks (Sight-blocking rules)
  private isCoordAttackable(attacker: Character, tx: number, ty: number): boolean {
    const dx = tx - attacker.x;
    const dy = ty - attacker.y;

    // 1. Straight axis check (Diagonal cells are strictly forbidden)
    if (dx !== 0 && dy !== 0) return false;
    if (dx === 0 && dy === 0) return false;

    // 2. Range boundary check
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist < attacker.minAttackRange || dist > attacker.maxAttackRange) return false;

    // 3. Line of sight check (Living characters block projection paths)
    if (dx !== 0) {
      const step = Math.sign(dx);
      for (let cx = attacker.x + step; cx !== tx; cx += step) {
        const obs = this.characters.find(c => c.x === cx && c.y === attacker.y && c.hp > 0);
        if (obs) return false; // Path blocked!
      }
    } else if (dy !== 0) {
      const step = Math.sign(dy);
      for (let cy = attacker.y + step; cy !== ty; cy += step) {
        const obs = this.characters.find(c => c.x === attacker.x && c.y === cy && c.hp > 0);
        if (obs) return false; // Path blocked!
      }
    }

    return true;
  }

  private updateMiniHUDBar(char: Character) {
    if (!char.hudBarGraphics) return;
    char.hudBarGraphics.clear();

    const isHpMax = char.hp === char.maxHp;
    const isMpMax = char.mp === char.maxMp;

    // HP & MP are 100% full: hide HUD completely
    if (isHpMax && isMpMax) {
      return;
    }

    const barW = 32;
    const hpBarH = 4;
    const mpBarH = 2.5;
    const spacing = 1.5;
    const bgH = hpBarH + mpBarH + spacing + 3; // total background frame height
    
    const startX = -barW / 2;
    const startY = -68; // Float slightly above the head area

    // 1. Sleek black background plate
    char.hudBarGraphics.fillStyle(0x090d16, 0.75);
    char.hudBarGraphics.lineStyle(1, 0xffffff, 0.15);
    char.hudBarGraphics.fillRoundedRect(startX - 2, startY - 2, barW + 4, bgH, 3);
    char.hudBarGraphics.strokeRoundedRect(startX - 2, startY - 2, barW + 4, bgH, 3);

    // 2. HP Bar (Green above 35% for ally, Orange for enemy, red neon at critical)
    const hpRatio = Math.max(0, Math.min(1, char.hp / char.maxHp));
    let hpColor = 0x10b981;
    if (char.isEnemy) {
      hpColor = hpRatio > 0.35 ? 0xf97316 : 0xef4444; // orange for enemies
    } else {
      hpColor = hpRatio > 0.35 ? 0x10b981 : 0xef4444; // green for allies
    }
    char.hudBarGraphics.fillStyle(0x334155, 1); // empty HP backer
    char.hudBarGraphics.fillRect(startX, startY, barW, hpBarH);
    char.hudBarGraphics.fillStyle(hpColor, 1);
    char.hudBarGraphics.fillRect(startX, startY, barW * hpRatio, hpBarH);

    // 3. MP Bar (Neon Blue)
    const mpRatio = char.maxMp > 0 ? Math.max(0, Math.min(1, char.mp / char.maxMp)) : 0;
    const mpColor = 0x3b82f6;
    char.hudBarGraphics.fillStyle(0x334155, 1); // empty MP backer
    char.hudBarGraphics.fillRect(startX, startY + hpBarH + spacing, barW, mpBarH);
    if (char.maxMp > 0) {
      char.hudBarGraphics.fillStyle(mpColor, 1);
      char.hudBarGraphics.fillRect(startX, startY + hpBarH + spacing, barW * mpRatio, mpBarH);
    }
  }

  private drawHoveredCharacterAttackRange() {
    if (!this.hoveredCharacter || this.isGameOver) return;
    const char = this.hoveredCharacter;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.isCoordAttackable(char, x, y)) {
          const screenPos = this.gridToScreen(x, y);
          this.interactiveGraphics.fillStyle(0xef4444, 0.05); // light subtle red
          this.interactiveGraphics.lineStyle(1.2, 0xef4444, 0.3); // dashed red boundary looks
          
          this.interactiveGraphics.beginPath();
          this.interactiveGraphics.moveTo(screenPos.x, screenPos.y - this.halfTileHeight);
          this.interactiveGraphics.lineTo(screenPos.x + this.halfTileWidth, screenPos.y);
          this.interactiveGraphics.lineTo(screenPos.x, screenPos.y + this.halfTileHeight);
          this.interactiveGraphics.lineTo(screenPos.x - this.halfTileWidth, screenPos.y);
          this.interactiveGraphics.closePath();
          
          this.interactiveGraphics.fillPath();
          this.interactiveGraphics.strokePath();
        }
      }
    }
  }

  private findBestLandingTileForAttack(char: Character, enemy: Character): Point | null {
    if (char.hasMovedThisTurn || char.hasAttackedThisTurn || char.ap <= 0) return null;

    const dynObstacles = this.getDynamicObstacleGrid(char);
    let bestTile: Point | null = null;
    let minPathLength = 999;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const dist = Math.abs(x - char.x) + Math.abs(y - char.y);
        if (dist > char.moveRange) continue;
        if (x === char.x && y === char.y) continue;

        const isOccupied = this.characters.some(c => c.x === x && c.y === y && c.hp > 0);
        if (isOccupied) continue;

        const path = findPath({ x: char.x, y: char.y }, { x, y }, this.gridWidth, this.gridHeight, dynObstacles);
        if (path.length <= 1 || path.length - 1 > char.moveRange) continue;

        const simulatedChar: Character = { ...char, x, y };
        if (this.isCoordAttackable(simulatedChar, enemy.x, enemy.y)) {
          if (path.length < minPathLength) {
            minPathLength = path.length;
            bestTile = { x, y };
          }
        }
      }
    }

    return bestTile;
  }

  private updateUIProfile(char: Character) {
    // CRITICAL: Block rendering of enemy statistics cards to Upper-Center profile
    if (char.isEnemy) return;

    const panel = document.getElementById('char-panel');
    if (!panel) return;

    panel.classList.remove('hidden');
    document.getElementById('char-avatar')!.innerText = char.avatar;
    document.getElementById('char-name')!.innerText = `${char.name} (${char.direction})`;
    
    const hpPercent = (char.hp / char.maxHp) * 100;
    document.getElementById('hp-bar')!.style.width = `${hpPercent}%`;
    document.getElementById('hp-text')!.innerText = `${char.hp}/${char.maxHp}`;
    
    const mpPercent = (char.mp / char.maxMp) * 100;
    document.getElementById('mp-bar')!.style.width = `${mpPercent}%`;
    document.getElementById('mp-text')!.innerText = `${char.mp}/${char.maxMp}`;

    // Update AP Gems UI
    this.updateAPGemsUI(char);

    this.updateActionButtonStates();
  }

  private updateAPGemsUI(char: Character) {
    const gemsContainer = document.getElementById('ap-gems');
    const textVal = document.getElementById('ap-text');
    if (!gemsContainer || !textVal) return;

    textVal.innerText = `${char.ap}/${char.maxAp}`;
    gemsContainer.innerHTML = ''; // Clear previous

    for (let i = 0; i < char.maxAp; i++) {
      const gemElement = document.createElement('span');
      gemElement.classList.add('ap-gem');
      if (i < char.ap) {
        gemElement.classList.add('filled');
        gemElement.innerText = '◆';
      } else {
        gemElement.classList.add('empty');
        gemElement.innerText = '◇';
      }
      gemsContainer.appendChild(gemElement);
    }
  }

  private updateActionButtonStates() {
    const isPlayerTurn = this.turnManager.getState() === 'PLAYER_TURN';
    const isAnimating = this.turnManager.getState() === 'ANIMATING';
    
    const btnMove = document.getElementById('btn-move') as HTMLButtonElement;
    const btnTurn = document.getElementById('btn-turn') as HTMLButtonElement;
    const btnAttack = document.getElementById('btn-attack') as HTMLButtonElement;
    const btnWait = document.getElementById('btn-wait') as HTMLButtonElement;
    const btnEnd = document.getElementById('btn-end-turn') as HTMLButtonElement;

    if (btnMove && btnTurn && btnAttack && btnWait && btnEnd) {
      if (isAnimating || this.isGameOver || !this.selectedCharacter || this.selectedCharacter.isEnemy) {
        btnMove.disabled = true;
        btnTurn.disabled = true;
        btnAttack.disabled = true;
        btnWait.disabled = true;
        btnEnd.disabled = this.isGameOver || isAnimating; 
      } else if (isPlayerTurn) {
        // Can always rotate direction unless animating/gameover
        btnMove.disabled = this.selectedCharacter.hasMovedThisTurn || this.selectedCharacter.hasAttackedThisTurn;
        btnTurn.disabled = this.selectedCharacter.hasAttackedThisTurn; 
        btnAttack.disabled = this.selectedCharacter.ap <= 0 || this.selectedCharacter.hasAttackedThisTurn;
        btnWait.disabled = this.selectedCharacter.hasMovedThisTurn && this.selectedCharacter.hasAttackedThisTurn;
        btnEnd.disabled = false;
      } else {
        btnMove.disabled = true;
        btnTurn.disabled = true;
        btnAttack.disabled = true;
        btnWait.disabled = true;
        btnEnd.disabled = true;
      }
    }
  }

  private setupTurnManagerEvents() {
    let lastRealState: TurnState = 'ENEMY_TURN';

    this.turnManager.onStateChange((state, turnNumber) => {
      const turnLabel = document.getElementById('turn-label');
      const turnCounter = document.getElementById('turn-counter');

      if (turnLabel && turnCounter) {
        turnCounter.innerText = `TURN ${turnNumber}`;

        if (state === 'PLAYER_TURN') {
          turnLabel.innerText = 'PLAYER TURN';
          turnLabel.style.color = '#6366f1';
          turnLabel.style.textShadow = '0 0 10px rgba(99, 102, 241, 0.5)';
          
          if (!this.isGameOver) {
            // Restore players
            if (lastRealState === 'ENEMY_TURN') {
              this.characters.forEach(c => {
                if (!c.isEnemy && c.hp > 0) {
                  c.ap = Math.min(c.ap + 1, c.maxAp);
                  c.hasMovedThisTurn = false;
                  c.hasAttackedThisTurn = false;
                  c.gameObject.alpha = 1.0; 
                }
              });

              // Select first living player ONLY on real turn transition (from enemy to player turn)
              const livingPlayer = this.characters.find(c => !c.isEnemy && c.hp > 0);
              if (livingPlayer) {
                this.selectCharacter(livingPlayer);
              }
              
              // Start turn limit timer
              this.startPlayerTurnTimer();
            }
            lastRealState = 'PLAYER_TURN';
          }
        } else if (state === 'ENEMY_TURN') {
          turnLabel.innerText = 'ENEMY TURN';
          turnLabel.style.color = '#ef4444';
          turnLabel.style.textShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
          
          if (!this.isGameOver) {
            // Clear player turn timer
            this.clearTurnTimer();

            // Restore enemies
            if (lastRealState === 'PLAYER_TURN') {
              this.characters.forEach(c => {
                if (c.isEnemy && c.hp > 0) {
                  c.ap = Math.min(c.ap + 1, c.maxAp);
                  c.hasMovedThisTurn = false;
                  c.hasAttackedThisTurn = false;
                  c.gameObject.alpha = 1.0;
                }
              });
              
              // Run AI
              this.time.delayedCall(200, () => {
                this.runAllEnemiesAI();
              });
            }
            lastRealState = 'ENEMY_TURN';
          }
        }
      }
      this.updateActionButtonStates();
    });
  }

  // --- Turn timer logic ---
  private startPlayerTurnTimer() {
    this.clearTurnTimer();

    const timerContainer = document.getElementById('timer-container');
    if (!timerContainer) return;

    if (this.turnTimeLimit === 0 || this.isGameOver) {
      timerContainer.classList.add('hidden');
      return;
    }

    timerContainer.classList.remove('hidden');
    
    // Reset timer visuals
    const fill = document.getElementById('timer-progress-fill') as HTMLElement;
    const txt = document.getElementById('timer-text') as HTMLElement;
    if (fill) {
      fill.classList.remove('warning');
      fill.style.width = '100%';
    }
    if (txt) {
      txt.classList.remove('warning');
    }

    this.currentTimeLeft = this.turnTimeLimit;
    this.updateTimerUI();

    // Start 1-sec loop countdown timer
    this.turnTimerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.tickTurnTimer,
      callbackScope: this,
      loop: true
    });
  }

  private tickTurnTimer() {
    if (this.isGameOver || this.turnManager.getState() !== 'PLAYER_TURN') {
      this.clearTurnTimer();
      return;
    }

    this.currentTimeLeft = Math.max(0, this.currentTimeLeft - 1);
    this.updateTimerUI();

    const fill = document.getElementById('timer-progress-fill') as HTMLElement;
    const txt = document.getElementById('timer-text') as HTMLElement;

    if (this.currentTimeLeft <= 5) {
      if (fill) fill.classList.add('warning');
      if (txt) txt.classList.add('warning');
    }

    if (this.currentTimeLeft <= 0) {
      this.clearTurnTimer();
      this.showDialogue('SYSTEM', '시간 초과! 턴이 강제로 종료됩니다.', 2000);
      
      // Close active modes
      this.isMovementMode = false;
      this.isDirectionSelectMode = false;
      this.isPostMoveDirectionSelect = false;
      this.isAttackMode = false;
      
      const btnMove = document.getElementById('btn-move');
      const btnTurn = document.getElementById('btn-turn');
      const btnAttack = document.getElementById('btn-attack');
      if (btnMove) btnMove.classList.remove('highlight');
      if (btnTurn) btnTurn.classList.remove('highlight');
      if (btnAttack) btnAttack.classList.remove('highlight');

      this.time.delayedCall(500, () => {
        if (!this.isGameOver) {
          this.turnManager.endPlayerTurn();
        }
      });
    }
  }

  private clearTurnTimer() {
    if (this.turnTimerEvent) {
      this.turnTimerEvent.destroy();
      this.turnTimerEvent = null;
    }
    const timerContainer = document.getElementById('timer-container');
    if (timerContainer) {
      timerContainer.classList.add('hidden');
    }
  }

  private updateTimerUI() {
    const txt = document.getElementById('timer-text');
    const fill = document.getElementById('timer-progress-fill');
    if (txt) {
      txt.innerText = `${this.currentTimeLeft}s`;
    }
    if (fill) {
      const percent = (this.currentTimeLeft / this.turnTimeLimit) * 100;
      fill.style.width = `${percent}%`;
    }
  }

  private bindDOMEvents() {
    const btnMove = document.getElementById('btn-move');
    const btnTurn = document.getElementById('btn-turn');
    const btnAttack = document.getElementById('btn-attack');
    const btnWait = document.getElementById('btn-wait');
    const btnEnd = document.getElementById('btn-end-turn');

    if (btnMove) {
      btnMove.addEventListener('click', () => {
        if (this.turnManager.getState() !== 'PLAYER_TURN' || !this.selectedCharacter || this.selectedCharacter.hasMovedThisTurn || this.isGameOver) return;
        this.isMovementMode = !this.isMovementMode;
        this.isAttackMode = false;
        this.isDirectionSelectMode = false;
        
        if (btnAttack) btnAttack.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');

        if (this.isMovementMode) {
          btnMove.classList.add('highlight');
        } else {
          btnMove.classList.remove('highlight');
        }
      });
    }

    if (btnTurn) {
      btnTurn.addEventListener('click', () => {
        if (this.turnManager.getState() !== 'PLAYER_TURN' || !this.selectedCharacter || this.isGameOver) return;
        this.isDirectionSelectMode = !this.isDirectionSelectMode;
        this.isMovementMode = false;
        this.isAttackMode = false;
        this.isPostMoveDirectionSelect = false;

        if (btnMove) btnMove.classList.remove('highlight');
        if (btnAttack) btnAttack.classList.remove('highlight');

        if (this.isDirectionSelectMode) {
          btnTurn.classList.add('highlight');
          this.showDialogue(this.selectedCharacter.name, '바라볼 방향을 선택해라.', 1500);
        } else {
          btnTurn.classList.remove('highlight');
        }
      });
    }

    if (btnAttack) {
      btnAttack.addEventListener('click', () => {
        if (this.turnManager.getState() !== 'PLAYER_TURN' || !this.selectedCharacter || this.selectedCharacter.ap <= 0 || this.selectedCharacter.hasAttackedThisTurn || this.isGameOver) return;
        this.isAttackMode = !this.isAttackMode;
        this.isMovementMode = false;
        this.isDirectionSelectMode = false;
        
        if (btnMove) btnMove.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');

        if (this.isAttackMode) {
          btnAttack.classList.add('highlight');
        } else {
          btnAttack.classList.remove('highlight');
        }
      });
    }

    if (btnWait) {
      btnWait.addEventListener('click', () => {
        if (this.turnManager.getState() !== 'PLAYER_TURN' || !this.selectedCharacter || this.isGameOver) return;
        this.selectedCharacter.hasMovedThisTurn = true;
        this.selectedCharacter.hasAttackedThisTurn = true; 
        this.isMovementMode = false;
        this.isAttackMode = false;
        this.isDirectionSelectMode = false;
        
        if (btnMove) btnMove.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');
        if (btnAttack) btnAttack.classList.remove('highlight');
        
        this.checkCharacterTurnEnd(this.selectedCharacter);
        this.updateActionButtonStates();
        
        this.showDialogue(this.selectedCharacter.name, '행동을 대기한다.', 1200);
      });
    }

    if (btnEnd) {
      btnEnd.addEventListener('click', () => {
        if (this.turnManager.getState() !== 'PLAYER_TURN' || this.isGameOver) return;
        this.isMovementMode = false;
        this.isAttackMode = false;
        this.isDirectionSelectMode = false;
        if (btnMove) btnMove.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');
        if (btnAttack) btnAttack.classList.remove('highlight');
        this.turnManager.endPlayerTurn();
      });
    }

    // Config Panel Settings Bindings
    const timeLimits = [
      { id: 'btn-limit-none', val: 0 },
      { id: 'btn-limit-10', val: 10 },
      { id: 'btn-limit-30', val: 30 },
      { id: 'btn-limit-60', val: 60 },
    ];

    timeLimits.forEach(limit => {
      const btn = document.getElementById(limit.id);
      if (btn) {
        btn.addEventListener('click', () => {
          // Toggle active class
          timeLimits.forEach(l => {
            const b = document.getElementById(l.id);
            if (b) b.classList.remove('active');
          });
          btn.classList.add('active');

          // Change state limit
          this.turnTimeLimit = limit.val;

          // If currently player's turn, instantly reboot countdown
          if (this.turnManager.getState() === 'PLAYER_TURN' && !this.isGameOver) {
            this.startPlayerTurnTimer();
          }
        });
      }
    });

    const btnAvatar = document.getElementById('btn-avatar-toggle');
    if (btnAvatar) {
      btnAvatar.textContent = '표시';
      btnAvatar.addEventListener('click', () => {
        this.toggleAvatarMode();
        if (this.showHeadAvatar) {
          btnAvatar.textContent = '표시';
          btnAvatar.classList.add('active');
        } else {
          btnAvatar.textContent = '숨김';
          btnAvatar.classList.remove('active');
        }
      });
    }
  }

  private showHoverHUD(char: Character) {
    const hud = document.getElementById('hover-hud');
    if (!hud) return;

    hud.classList.remove('hidden');
    document.getElementById('hud-avatar')!.innerText = char.avatar;
    
    const nameEl = document.getElementById('hud-name')!;
    nameEl.innerText = char.name;
    // Highlight faction colors: Orange for enemy, Blue for player allies
    if (char.isEnemy) {
      nameEl.style.color = '#fb923c';
    } else {
      nameEl.style.color = '#38bdf8';
    }

    document.getElementById('hud-hp')!.innerText = `${char.hp}/${char.maxHp}`;
    document.getElementById('hud-mp')!.innerText = `${char.mp}/${char.maxMp}`;
  }

  private hideHoverHUD() {
    const hud = document.getElementById('hover-hud');
    if (hud) {
      hud.classList.add('hidden');
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    const gridPos = this.screenToGrid(pointer.worldX, pointer.y);

    if (
      gridPos.x >= 0 && gridPos.x < this.gridWidth &&
      gridPos.y >= 0 && gridPos.y < this.gridHeight
    ) {
      this.hoverTile = gridPos;

      // Realtime orientation preview if in Direction Selection Mode (Extended Straight line check)
      if (this.isDirectionSelectMode && this.selectedCharacter && !this.selectedCharacter.isEnemy) {
        const char = this.selectedCharacter;
        const dx = gridPos.x - char.x;
        const dy = gridPos.y - char.y;

        // If hovered tile is on the same straight cross-axis lines
        if ((dx === 0 && dy !== 0) || (dx !== 0 && dy === 0)) {
          if (dx !== 0) char.direction = dx > 0 ? 'NE' : 'SW';
          else if (dy !== 0) char.direction = dy > 0 ? 'SE' : 'NW';

          this.updateDirectionVisual(char);
          this.updateUIProfile(char); 
        }
      }

      // Realtime orientation preview during Attack Mode hover
      if (this.isAttackMode && this.selectedCharacter && !this.selectedCharacter.isEnemy) {
        const char = this.selectedCharacter;
        const dx = gridPos.x - char.x;
        const dy = gridPos.y - char.y;

        if (this.isCoordAttackable(char, gridPos.x, gridPos.y)) {
          if (Math.abs(dx) > Math.abs(dy)) {
            char.direction = dx > 0 ? 'NE' : 'SW';
          } else if (Math.abs(dy) > Math.abs(dx)) {
            char.direction = dy > 0 ? 'SE' : 'NW';
          }
          this.updateDirectionVisual(char);
          this.updateUIProfile(char);
        }
      }

      // Realtime floating HUD update on hovered living character
      const hoveredChar = this.characters.find(
        c => c.x === gridPos.x && c.y === gridPos.y && c.hp > 0
      );

      if (hoveredChar) {
        this.showHoverHUD(hoveredChar);
        this.hoveredCharacter = hoveredChar;
      } else {
        this.hideHoverHUD();
        this.hoveredCharacter = null;
      }
    } else {
      this.hoverTile = null;
      this.hideHoverHUD();
      this.hoveredCharacter = null;
    }
  }

  private handlePointerDown(_pointer: Phaser.Input.Pointer) {
    if (this.turnManager.getState() !== 'PLAYER_TURN' || this.isGameOver) return;
    if (!this.hoverTile) return;

    const pointer = _pointer;
    const isRightClick = pointer.rightButtonDown() || pointer.button === 2;

    // A. Right Click Undo handles (Cancel movement and restore coordinates before direction select)
    if (isRightClick) {
      if (this.isDirectionSelectMode && this.isPostMoveDirectionSelect && this.selectedCharacter && !this.selectedCharacter.isEnemy) {
        const char = this.selectedCharacter;
        
        // Revert to backup coordinates and facing direction
        char.x = this.preMoveX;
        char.y = this.preMoveY;
        char.direction = this.preMoveDirection;

        this.setCharacterPosition(char);
        this.updateDirectionVisual(char);

        // Revert flags
        char.hasMovedThisTurn = false;
        this.isDirectionSelectMode = false;
        this.isPostMoveDirectionSelect = false;
        this.isMovementMode = true; // reactivate movement green tile highlights

        // Reset highlights on DOM buttons
        const btnMove = document.getElementById('btn-move');
        const btnTurn = document.getElementById('btn-turn');
        if (btnMove) btnMove.classList.add('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');

        this.checkCharacterTurnEnd(char);
        this.updateActionButtonStates();
        this.showDialogue(char.name, '이동을 취소하고 복귀했다.', 1200);
        return;
      }
    }

    // B. Direction selection clicks take priority (Extended straight axis clicks)
    if (this.isDirectionSelectMode && this.selectedCharacter && !this.selectedCharacter.isEnemy && !this.selectedCharacter.hasAttackedThisTurn && !isRightClick) {
      const char = this.selectedCharacter;
      const dx = this.hoverTile.x - char.x;
      const dy = this.hoverTile.y - char.y;

      // Must be on the horizontal/vertical axis path
      if ((dx === 0 && dy !== 0) || (dx !== 0 && dy === 0)) {
        if (dx !== 0) char.direction = dx > 0 ? 'NE' : 'SW';
        else if (dy !== 0) char.direction = dy > 0 ? 'SE' : 'NW';

        this.updateDirectionVisual(char);
        this.isDirectionSelectMode = false;

        const btnTurn = document.getElementById('btn-turn');
        if (btnTurn) btnTurn.classList.remove('highlight');

        if (this.isPostMoveDirectionSelect) {
          // If we finished a move, automatically transition into attack mode
          this.isPostMoveDirectionSelect = false;
          
          if (char.ap > 0 && !char.hasAttackedThisTurn) {
            this.isAttackMode = true;
            const btnAttack = document.getElementById('btn-attack');
            if (btnAttack) btnAttack.classList.add('highlight');
          }
        }

        this.checkCharacterTurnEnd(char);
        this.updateActionButtonStates();
        return;
      }
    }

    // C. UX Fix: Clicking a living ally character ALWAYS switches selection immediately
    // Note: Do not switch selection if clicking an enemy character or right clicking
    const clickedAlly = this.characters.find(
      c => !c.isEnemy && c.x === this.hoverTile!.x && c.y === this.hoverTile!.y && c.hp > 0
    );

    if (clickedAlly && !this.isDirectionSelectMode && !isRightClick) {
      this.selectCharacter(clickedAlly);
      return;
    }

    // D-1. Auto-Chain Attack check when clicking an enemy in Move/Direction modes
    if ((this.isMovementMode || this.isDirectionSelectMode) && this.selectedCharacter && !this.selectedCharacter.isEnemy && !isRightClick) {
      const char = this.selectedCharacter;
      const clickedEnemy = this.characters.find(
        c => c.isEnemy && c.x === this.hoverTile!.x && c.y === this.hoverTile!.y && c.hp > 0
      );

      if (clickedEnemy) {
        // Option A: Direct hit from current spot
        const isSelfAttackable = this.isCoordAttackable(char, clickedEnemy.x, clickedEnemy.y) && !char.hasAttackedThisTurn && char.ap > 0;
        if (isSelfAttackable) {
          this.isMovementMode = false;
          this.isDirectionSelectMode = false;
          this.isPostMoveDirectionSelect = false;

          const btnMove = document.getElementById('btn-move');
          const btnTurn = document.getElementById('btn-turn');
          if (btnMove) btnMove.classList.remove('highlight');
          if (btnTurn) btnTurn.classList.remove('highlight');

          this.executeAttack(char, clickedEnemy, () => {
            this.checkCharacterTurnEnd(char);
          });
          return;
        }

        // Option B: Move to best landing spot then execute attack
        const bestLanding = this.findBestLandingTileForAttack(char, clickedEnemy);
        if (bestLanding) {
          this.isMovementMode = false;
          this.isDirectionSelectMode = false;
          this.isPostMoveDirectionSelect = false;

          const btnMove = document.getElementById('btn-move');
          const btnTurn = document.getElementById('btn-turn');
          if (btnMove) btnMove.classList.remove('highlight');
          if (btnTurn) btnTurn.classList.remove('highlight');

          const dynObstacles = this.getDynamicObstacleGrid(char);
          const path = findPath(
            { x: char.x, y: char.y },
            bestLanding,
            this.gridWidth,
            this.gridHeight,
            dynObstacles
          );

          if (path.length > 1) {
            this.preMoveX = char.x;
            this.preMoveY = char.y;
            this.preMoveDirection = char.direction;

            this.moveCharacterAlongPath(char, path, () => {
              char.hasMovedThisTurn = true;
              
              // Attack immediately after moving completes!
              this.executeAttack(char, clickedEnemy, () => {
                this.checkCharacterTurnEnd(char);
              });
            });
          }
          return;
        }
      }
    }

    if (!this.selectedCharacter || isRightClick) return;

    // D. Movement execution / Self click for direction select
    if (this.isMovementMode && !this.selectedCharacter.hasMovedThisTurn && !this.selectedCharacter.hasAttackedThisTurn) {
      const isSelfTile = (this.hoverTile.x === this.selectedCharacter.x && this.hoverTile.y === this.selectedCharacter.y);

      // If clicked own tile, cancel movement and enter direction selection mode (Turn)
      if (isSelfTile) {
        this.isMovementMode = false;
        const btnMove = document.getElementById('btn-move');
        if (btnMove) btnMove.classList.remove('highlight');

        this.isDirectionSelectMode = true;
        this.isPostMoveDirectionSelect = false;
        const btnTurn = document.getElementById('btn-turn');
        if (btnTurn) btnTurn.classList.add('highlight');
        this.showDialogue(this.selectedCharacter.name, '바라볼 방향을 선택해라.', 1500);
        return;
      }

      const isOccupied = this.characters.some(c => c.x === this.hoverTile!.x && c.y === this.hoverTile!.y && c.hp > 0);
      if (!isOccupied) {
        // Calculate path using dynamic obstacle matrix (other characters are blocks)
        const dynObstacles = this.getDynamicObstacleGrid(this.selectedCharacter);
        const path = findPath(
          { x: this.selectedCharacter.x, y: this.selectedCharacter.y },
          this.hoverTile,
          this.gridWidth,
          this.gridHeight,
          dynObstacles
        );

        if (path.length > 1 && path.length - 1 <= this.selectedCharacter.moveRange) {
          this.isMovementMode = false;
          const btnMove = document.getElementById('btn-move');
          if (btnMove) btnMove.classList.remove('highlight');
          
          const targetChar = this.selectedCharacter;

          // Backup coordinates for right-click Undo 
          this.preMoveX = targetChar.x;
          this.preMoveY = targetChar.y;
          this.preMoveDirection = targetChar.direction;

          this.moveCharacterAlongPath(targetChar, path, () => {
            targetChar.hasMovedThisTurn = true;
            
            // Post-movement: transition into direction selection first, then auto-attack
            if (!targetChar.isEnemy && this.turnManager.getState() === 'PLAYER_TURN' && !this.isGameOver) {
              this.isDirectionSelectMode = true;
              this.isPostMoveDirectionSelect = true;
              const btnTurn = document.getElementById('btn-turn');
              if (btnTurn) btnTurn.classList.add('highlight');
              this.showDialogue(targetChar.name, '바라볼 방향을 선택해라.', 1500);
            } else {
              this.checkCharacterTurnEnd(targetChar);
            }
          });
        }
      }
    }

    // E. Attack execution (Individual straight-axis & blocked-line-of-sight checks)
    if (this.isAttackMode && this.selectedCharacter.ap > 0 && !this.selectedCharacter.hasAttackedThisTurn) {
      const targetEnemy = this.characters.find(
        c => c.isEnemy && c.x === this.hoverTile!.x && c.y === this.hoverTile!.y && c.hp > 0
      );

      if (targetEnemy) {
        const canAttack = this.isCoordAttackable(this.selectedCharacter, this.hoverTile.x, this.hoverTile.y);
        if (canAttack) {
          this.isAttackMode = false;
          const btnAttack = document.getElementById('btn-attack');
          if (btnAttack) btnAttack.classList.remove('highlight');

          const attacker = this.selectedCharacter;
          this.executeAttack(attacker, targetEnemy, () => {
            this.checkCharacterTurnEnd(attacker);
          });
        }
      }
    }
  }

  private checkCharacterTurnEnd(char: Character) {
    // Only flag wait state visual if both actions (Move, Attack) are spent and not in direction mode
    if (char.hasMovedThisTurn && char.hasAttackedThisTurn && !this.isDirectionSelectMode) {
      char.gameObject.alpha = 0.55; 
    } else {
      char.gameObject.alpha = 1.0;
    }
    this.updateUIProfile(char);
  }

  private moveCharacterAlongPath(char: Character, path: Point[], onComplete: () => void) {
    this.previousState = this.turnManager.getState();
    this.turnManager.setState('ANIMATING');

    const moveSteps = path.slice(1);

    if (moveSteps.length === 0) {
      this.turnManager.setState(this.previousState);
      onComplete();
      return;
    }

    const tweensConfig = moveSteps.map((step) => {
      const screenPos = this.gridToScreen(step.x, step.y);
      return {
        targets: char.gameObject,
        x: screenPos.x,
        y: screenPos.y,
        duration: 250,
        ease: 'Linear',
        onStart: () => {
          // Face the direction of the stepping step
          const dx = step.x - char.x;
          const dy = step.y - char.y;
          if (dx > 0) char.direction = 'NE';
          else if (dy > 0) char.direction = 'SE';
          else if (dx < 0) char.direction = 'SW';
          else if (dy < 0) char.direction = 'NW';
          
          this.updateDirectionVisual(char);
        },
        onComplete: () => {
          char.x = step.x;
          char.y = step.y;
          char.gameObject.setDepth(screenPos.y + 10);
        }
      };
    });

    this.tweens.chain({
      targets: char.gameObject,
      tweens: tweensConfig,
      onComplete: () => {
        this.turnManager.setState(this.previousState);
        onComplete();
      }
    });
  }

  private executeAttack(attacker: Character, defender: Character, onComplete?: () => void) {
    this.previousState = this.turnManager.getState();
    this.turnManager.setState('ANIMATING');

    // AP consumption
    attacker.ap = Math.max(0, attacker.ap - 1);
    attacker.hasAttackedThisTurn = true;
    
    // Rotate attacker to face defender (Using absolute delta checks)
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      attacker.direction = dx > 0 ? 'NE' : 'SW';
    } else if (Math.abs(dy) > Math.abs(dx)) {
      attacker.direction = dy > 0 ? 'SE' : 'NW';
    }
    this.updateDirectionVisual(attacker);
    
    this.updateUIProfile(attacker);
    this.updateMiniHUDBar(attacker);

    const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);

    if (dist === 1) {
      // Melee (Leon / Goblin A / etc.)
      this.executeMeleeAttack(attacker, defender, onComplete);
    } else {
      // Ranged Projectile (Aisha / Roy / etc.)
      this.executeRangedAttack(attacker, defender, onComplete);
    }
  }

  private executeMeleeAttack(attacker: Character, defender: Character, onComplete?: () => void) {
    const startPos = this.gridToScreen(attacker.x, attacker.y);
    const targetPos = this.gridToScreen(defender.x, defender.y);

    // Calculate forward lunging step offsets (dash lunge)
    const lungeX = startPos.x + (targetPos.x - startPos.x) * 0.35;
    const lungeY = startPos.y + (targetPos.y - startPos.y) * 0.35;

    // Chain dash lunge tween aligned with animation timing
    this.tweens.chain({
      targets: attacker.gameObject,
      tweens: [
        {
          x: lungeX,
          y: lungeY,
          duration: 150,
          ease: 'Quad.easeOut'
        },
        {
          x: startPos.x,
          y: startPos.y,
          duration: 200,
          ease: 'Quad.easeInOut'
        }
      ],
      onComplete: () => {
        if (this.isGameOver) return;
        this.handleHit(attacker, defender);
        this.turnManager.setState(this.previousState);
        if (onComplete) onComplete();
      }
    });
  }

  private executeRangedAttack(attacker: Character, defender: Character, onComplete?: () => void) {
    const startPos = this.gridToScreen(attacker.x, attacker.y);
    const targetPos = this.gridToScreen(defender.x, defender.y);

    if (this.isGameOver || defender.hp <= 0) return;

    // Spawn Magic orb/bullet Projectile based on faction color
    const projColor = attacker.isEnemy ? 0xf97316 : 0xd946ef;
    const proj = this.add.graphics();
    proj.fillStyle(projColor, 1);
    proj.fillCircle(0, 0, 8);
    proj.lineStyle(2, 0xffffff, 0.8);
    proj.strokeCircle(0, 0, 8);
    
    proj.setPosition(startPos.x, startPos.y - 40);
    proj.setDepth(1000); 

    // Projectile flight to defender location
    this.tweens.add({
      targets: proj,
      x: targetPos.x,
      y: targetPos.y - 25,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Expansion explosion splash
        this.tweens.add({
          targets: proj,
          scaleX: 3,
          scaleY: 3,
          alpha: 0,
          duration: 150,
          onComplete: () => {
            proj.destroy();
          }
        });

        // Trigger hit calculations
        this.handleHit(attacker, defender);
        if (this.isGameOver) return;
        this.turnManager.setState(this.previousState);
        if (onComplete) onComplete();
      }
    });
  }

  private handleHit(attacker: Character, defender: Character) {
    this.cameras.main.shake(100, 0.003);

    // 1. Evaluate Back Attack bonus: attacker is positioned strictly behind defender's facing direction
    let isBackAttack = false;
    if (defender.direction === 'NE' && attacker.x < defender.x) isBackAttack = true;
    else if (defender.direction === 'SE' && attacker.y < defender.y) isBackAttack = true;
    else if (defender.direction === 'SW' && attacker.x > defender.x) isBackAttack = true;
    else if (defender.direction === 'NW' && attacker.y > defender.y) isBackAttack = true;

    let damage = attacker.isEnemy ? Phaser.Math.Between(10, 16) : Phaser.Math.Between(18, 26);
    if (isBackAttack) {
      damage = Math.floor(damage * 1.5);
    }

    defender.hp = Math.max(0, defender.hp - damage);
    this.updateMiniHUDBar(defender);

    // Only update UI profile if the hit character is currently selected by the player and is not an enemy
    if (this.selectedCharacter === defender && !defender.isEnemy) {
      this.updateUIProfile(defender);
    }

    this.showDamagePopup(defender.gameObject, damage, isBackAttack);

    this.tweens.add({
      targets: defender.gameObject,
      x: defender.gameObject.x + (attacker.x < defender.x ? 8 : -8),
      y: defender.gameObject.y + (attacker.y < defender.y ? 4 : -4),
      duration: 50,
      yoyo: true,
      repeat: 2,
      onStart: () => {
        this.cameras.main.flash(50, 239, 68, 68, false);
      }
    });

    if (defender.hp <= 0) {
      this.handleDeath(defender);
    }
  }

  private showDamagePopup(target: Phaser.GameObjects.Container, damage: number, isBackAttack = false) {
    const depth = target.depth + 100;

    if (isBackAttack) {
      // Bouncing yellow back attack neon notification
      const backText = this.add.text(target.x, target.y - 88, 'BACK ATTACK! ⚡', {
        fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
        fontSize: '15px',
        color: '#facc15',
        stroke: '#000000',
        strokeThickness: 3.5,
        align: 'center'
      });
      backText.setOrigin(0.5);
      backText.setDepth(depth);

      this.tweens.add({
        targets: backText,
        y: backText.y - 25,
        alpha: 0,
        duration: 900,
        ease: 'Power1.easeOut',
        onComplete: () => backText.destroy()
      });
    }

    // Standard/Modified damage popup
    const popupText = this.add.text(target.x, target.y - 65, `-${damage}`, {
      fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
      fontSize: isBackAttack ? '25px' : '22px',
      color: isBackAttack ? '#fbbf24' : '#ef4444', // yellow orange for back attack
      stroke: '#000000',
      strokeThickness: isBackAttack ? 5 : 4,
      align: 'center'
    });
    
    popupText.setOrigin(0.5);
    popupText.setDepth(depth);

    this.tweens.add({
      targets: popupText,
      y: popupText.y - 45,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        popupText.destroy();
      }
    });
  }

  private handleDeath(char: Character) {
    this.tweens.add({
      targets: char.gameObject,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        char.gameObject.destroy();
        this.showDialogue(char.name, '쓰러졌다!', 2000);

        this.checkGameConditions();
      }
    });
  }

  private checkGameConditions() {
    const livingPlayers = this.characters.filter(c => !c.isEnemy && c.hp > 0);
    const livingEnemies = this.characters.filter(c => c.isEnemy && c.hp > 0);

    if (livingEnemies.length === 0) {
      this.triggerEndGame('VICTORY', '#10b981');
    } else if (livingPlayers.length === 0) {
      this.triggerEndGame('DEFEAT', '#ef4444');
    }
  }

  private triggerEndGame(result: string, color: string) {
    this.isGameOver = true;
    this.clearTurnTimer();
    
    const gameOverText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      result,
      {
        fontFamily: 'Orbit, sans-serif',
        fontSize: '64px',
        color: color,
        stroke: '#090d16',
        strokeThickness: 8,
        align: 'center'
      }
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setDepth(1000);
    gameOverText.setScrollFactor(0);

    this.showDialogue('SYSTEM', `전투가 종료되었습니다. 결과: ${result}`, 3500);
    this.updateActionButtonStates();
  }

  private runAllEnemiesAI() {
    const livingEnemies = this.characters.filter(c => c.isEnemy && c.hp > 0);
    if (livingEnemies.length === 0 || this.isGameOver) {
      this.turnManager.endEnemyTurn();
      return;
    }

    this.runSingleEnemyAIStep(livingEnemies, 0);
  }

  private runSingleEnemyAIStep(enemies: Character[], index: number) {
    if (index >= enemies.length || this.isGameOver) {
      this.turnManager.endEnemyTurn();
      return;
    }

    const currentEnemy = enemies[index];
    this.selectCharacter(currentEnemy); 

    this.runSingleEnemyAI(currentEnemy, () => {
      this.time.delayedCall(500, () => {
        this.runSingleEnemyAIStep(enemies, index + 1);
      });
    });
  }

  private runSingleEnemyAI(enemy: Character, onComplete: () => void) {
    this.showDialogue(enemy.name, '행동을 개시한다.', 1000);

    this.time.delayedCall(1100, () => {
      if (this.isGameOver || enemy.hp <= 0) {
        onComplete();
        return;
      }

      // 1. Find closest living player target
      const livingPlayers = this.characters.filter(c => !c.isEnemy && c.hp > 0);
      if (livingPlayers.length === 0) {
        onComplete();
        return;
      }

      let closestPlayer = livingPlayers[0];
      let minDist = 9999;
      livingPlayers.forEach(p => {
        const d = Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y);
        if (d < minDist) {
          minDist = d;
          closestPlayer = p;
        }
      });

      // Define sequential AI behavior steps
      const attemptAttack = (afterAttackCallback: () => void) => {
        if (this.isGameOver || enemy.hp <= 0) {
          afterAttackCallback();
          return;
        }

        // Apply straight line of sight coordinate attacks
        const canAttack = this.isCoordAttackable(enemy, closestPlayer.x, closestPlayer.y);
        if (canAttack && enemy.ap > 0 && !enemy.hasAttackedThisTurn) {
          this.executeAttack(enemy, closestPlayer, () => {
            this.time.delayedCall(600, () => {
              afterAttackCallback();
            });
          });
        } else {
          afterAttackCallback();
        }
      };

      const attemptMovement = (afterMoveCallback: () => void) => {
        if (this.isGameOver || enemy.hp <= 0 || enemy.hasMovedThisTurn) {
          afterMoveCallback();
          return;
        }

        // Already in straight line attack range, skip movement to conserve position
        const canAttackNow = this.isCoordAttackable(enemy, closestPlayer.x, closestPlayer.y);
        if (canAttackNow) {
          afterMoveCallback();
          return;
        }

        const dynObstacles = this.getDynamicObstacleGrid(enemy, closestPlayer);
        const path = findPath(
          { x: enemy.x, y: enemy.y },
          { x: closestPlayer.x, y: closestPlayer.y },
          this.gridWidth,
          this.gridHeight,
          dynObstacles
        );

        if (path.length > 2) {
          // Find the best landing spot along the path that puts us in range
          let walkTargetIndex = path.length - 1;
          for (let i = 0; i < path.length; i++) {
            // Must evaluate isCoordAttackable from simulated tile positions
            const simulatedEnemyPos: Character = { ...enemy, x: path[i].x, y: path[i].y };
            if (this.isCoordAttackable(simulatedEnemyPos, closestPlayer.x, closestPlayer.y)) {
              walkTargetIndex = i;
              break;
            }
          }

          // Clamp index by moveRange
          const maxMoveIndex = Math.min(enemy.moveRange, walkTargetIndex);
          if (maxMoveIndex > 0) {
            const actualPath = path.slice(0, maxMoveIndex + 1);
            const destination = actualPath[actualPath.length - 1];

            // Verify landing cell is not occupied
            const isDestOccupied = this.characters.some(
              c => c.x === destination.x && c.y === destination.y && c.hp > 0 && c !== enemy
            );

            if (!isDestOccupied) {
              this.moveCharacterAlongPath(enemy, actualPath, () => {
                enemy.hasMovedThisTurn = true;
                this.time.delayedCall(400, () => {
                  afterMoveCallback();
                });
              });
            } else {
              afterMoveCallback();
            }
          } else {
            afterMoveCallback();
          }
        } else {
          afterMoveCallback();
        }
      };

      // Execution Pipeline:
      // Step 1: Try to attack first (e.g. if player is already nearby)
      attemptAttack(() => {
        // Step 2: Try to move closer if not yet in range
        attemptMovement(() => {
          // Step 3: Try to attack again after movement (if AP is left and didn't attack yet)
          attemptAttack(() => {
            // Step 4: Finished all actions
            onComplete();
          });
        });
      });
    });
  }

  // --- Interaction rendering ---
  private drawHoverHighlight() {
    if (!this.hoverTile || this.isGameOver || !this.selectedCharacter) return;

    const enemyAtHover = this.characters.find(c => c.isEnemy && c.x === this.hoverTile!.x && c.y === this.hoverTile!.y && c.hp > 0);
    const allyAtHover = this.characters.find(c => !c.isEnemy && c.x === this.hoverTile!.x && c.y === this.hoverTile!.y && c.hp > 0);
    const screenPos = this.gridToScreen(this.hoverTile.x, this.hoverTile.y);

    let color = 0x6366f1; 
    
    if (this.isMovementMode && !this.selectedCharacter.isEnemy) {
      if (enemyAtHover) {
        const char = this.selectedCharacter;
        const isSelfAttackable = this.isCoordAttackable(char, enemyAtHover.x, enemyAtHover.y) && !char.hasAttackedThisTurn && char.ap > 0;
        const isMoveAttackable = !char.hasMovedThisTurn && this.findBestLandingTileForAttack(char, enemyAtHover) !== null;
        if (isSelfAttackable || isMoveAttackable) {
          color = 0xef4444;
        } else {
          color = 0xf59e0b;
        }
      } else {
        const isOccupied = this.characters.some(c => c.x === this.hoverTile!.x && c.y === this.hoverTile!.y && c.hp > 0);
        const dynObstacles = this.getDynamicObstacleGrid(this.selectedCharacter);
        const path = findPath(
          { x: this.selectedCharacter.x, y: this.selectedCharacter.y },
          this.hoverTile,
          this.gridWidth,
          this.gridHeight,
          dynObstacles
        );

        if (path.length > 1 && path.length - 1 <= this.selectedCharacter.moveRange && !isOccupied) {
          color = 0x10b981; 
        } else {
          color = 0xf59e0b; 
        }
      }
    } else if (this.isAttackMode && !this.selectedCharacter.isEnemy) {
      const canAttack = this.isCoordAttackable(this.selectedCharacter, this.hoverTile.x, this.hoverTile.y);
      if (enemyAtHover && canAttack && !this.selectedCharacter.hasAttackedThisTurn) {
        color = 0xef4444; 
      } else {
        color = 0x64748b; 
      }
    } else if (this.isDirectionSelectMode && !this.selectedCharacter.isEnemy) {
      const char = this.selectedCharacter;
      if (enemyAtHover) {
        const isSelfAttackable = this.isCoordAttackable(char, enemyAtHover.x, enemyAtHover.y) && !char.hasAttackedThisTurn && char.ap > 0;
        if (isSelfAttackable) {
          color = 0xef4444;
        } else {
          color = 0x64748b;
        }
      } else {
        const dx = this.hoverTile.x - char.x;
        const dy = this.hoverTile.y - char.y;

        // Gold highlight preview along straight lines
        if ((dx === 0 && dy !== 0) || (dx !== 0 && dy === 0)) {
          color = 0xfacc15; 
        } else {
          color = 0x64748b;
        }
      }
    } else {
      if (enemyAtHover) {
        color = 0xef4444; 
      } else if (allyAtHover && !this.selectedCharacter.isEnemy) {
        color = 0x3b82f6; 
      }
    }

    this.interactiveGraphics.lineStyle(2, color, 1);
    this.interactiveGraphics.fillStyle(color, 0.15);

    this.interactiveGraphics.beginPath();
    this.interactiveGraphics.moveTo(screenPos.x, screenPos.y - this.halfTileHeight);
    this.interactiveGraphics.lineTo(screenPos.x + this.halfTileWidth, screenPos.y);
    this.interactiveGraphics.lineTo(screenPos.x, screenPos.y + this.halfTileHeight);
    this.interactiveGraphics.lineTo(screenPos.x - this.halfTileWidth, screenPos.y);
    this.interactiveGraphics.closePath();

    this.interactiveGraphics.fillPath();
    this.interactiveGraphics.strokePath();
  }

  private drawMovementRangeHighlight() {
    if (!this.isMovementMode || !this.selectedCharacter || this.selectedCharacter.isEnemy || this.selectedCharacter.hasMovedThisTurn || this.turnManager.getState() !== 'PLAYER_TURN' || this.isGameOver) return;

    const dynObstacles = this.getDynamicObstacleGrid(this.selectedCharacter);

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        // Manhattan distance pre-filtering for performance
        const dist = Math.abs(x - this.selectedCharacter.x) + Math.abs(y - this.selectedCharacter.y);
        if (dist > this.selectedCharacter.moveRange) continue;
        if (x === this.selectedCharacter.x && y === this.selectedCharacter.y) continue;

        const isOccupied = this.characters.some(c => c.x === x && c.y === y && c.hp > 0);
        if (isOccupied) continue;

        const path = findPath(
          { x: this.selectedCharacter.x, y: this.selectedCharacter.y },
          { x, y },
          this.gridWidth,
          this.gridHeight,
          dynObstacles
        );

        if (path.length > 1 && path.length - 1 <= this.selectedCharacter.moveRange) {
          const screenPos = this.gridToScreen(x, y);
          this.interactiveGraphics.fillStyle(0x10b981, 0.08);
          this.interactiveGraphics.lineStyle(1, 0x10b981, 0.25);
          
          this.interactiveGraphics.beginPath();
          this.interactiveGraphics.moveTo(screenPos.x, screenPos.y - this.halfTileHeight);
          this.interactiveGraphics.lineTo(screenPos.x + this.halfTileWidth, screenPos.y);
          this.interactiveGraphics.lineTo(screenPos.x, screenPos.y + this.halfTileHeight);
          this.interactiveGraphics.lineTo(screenPos.x - this.halfTileWidth, screenPos.y);
          this.interactiveGraphics.closePath();
          
          this.interactiveGraphics.fillPath();
          this.interactiveGraphics.strokePath();
        }
      }
    }
  }

  private drawAttackRangeHighlight() {
    if (!this.isAttackMode || !this.selectedCharacter || this.selectedCharacter.isEnemy || this.selectedCharacter.ap <= 0 || this.selectedCharacter.hasAttackedThisTurn || this.turnManager.getState() !== 'PLAYER_TURN' || this.isGameOver) return;

    const char = this.selectedCharacter;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        // Enforce straight and unblocked line-of-sight checks
        if (this.isCoordAttackable(char, x, y)) {
          const screenPos = this.gridToScreen(x, y);
          this.interactiveGraphics.fillStyle(0xef4444, 0.08);
          this.interactiveGraphics.lineStyle(1, 0xef4444, 0.25);
          
          this.interactiveGraphics.beginPath();
          this.interactiveGraphics.moveTo(screenPos.x, screenPos.y - this.halfTileHeight);
          this.interactiveGraphics.lineTo(screenPos.x + this.halfTileWidth, screenPos.y);
          this.interactiveGraphics.lineTo(screenPos.x, screenPos.y + this.halfTileHeight);
          this.interactiveGraphics.lineTo(screenPos.x - this.halfTileWidth, screenPos.y);
          this.interactiveGraphics.closePath();
          
          this.interactiveGraphics.fillPath();
          this.interactiveGraphics.strokePath();
        }
      }
    }
  }

  private drawDirectionSelectHighlight() {
    if (!this.isDirectionSelectMode || !this.selectedCharacter || this.selectedCharacter.isEnemy || this.isGameOver) return;
    
    const char = this.selectedCharacter;

    // Draw yellow highlights along horizontal & vertical lines all the way across the grid (excluding the char itself)
    for (let x = 0; x < this.gridWidth; x++) {
      if (x === char.x) continue;
      const screenPos = this.gridToScreen(x, char.y);
      this.drawYellowSelectTile(screenPos);
    }
    
    for (let y = 0; y < this.gridHeight; y++) {
      if (y === char.y) continue;
      const screenPos = this.gridToScreen(char.x, y);
      this.drawYellowSelectTile(screenPos);
    }
  }

  private drawYellowSelectTile(screenPos: Point) {
    this.interactiveGraphics.fillStyle(0xfacc15, 0.08);
    this.interactiveGraphics.lineStyle(1.5, 0xfacc15, 0.35);
    
    this.interactiveGraphics.beginPath();
    this.interactiveGraphics.moveTo(screenPos.x, screenPos.y - this.halfTileHeight);
    this.interactiveGraphics.lineTo(screenPos.x + this.halfTileWidth, screenPos.y);
    this.interactiveGraphics.lineTo(screenPos.x, screenPos.y + this.halfTileHeight);
    this.interactiveGraphics.lineTo(screenPos.x - this.halfTileWidth, screenPos.y);
    this.interactiveGraphics.closePath();
    
    this.interactiveGraphics.fillPath();
    this.interactiveGraphics.strokePath();
  }

  private drawSelectionRing() {
    this.selectionRingGraphics.clear();
    if (!this.selectedCharacter || this.isGameOver || this.selectedCharacter.hp <= 0) return;

    const pos = this.gridToScreen(this.selectedCharacter.x, this.selectedCharacter.y);
    const pulse = 0.85 + Math.sin(this.time.now / 150) * 0.08;
    const ringColor = this.selectedCharacter.isEnemy ? 0xf97316 : 0x3b82f6;

    this.selectionRingGraphics.lineStyle(2.5, ringColor, 0.95);
    this.selectionRingGraphics.strokeEllipse(pos.x, pos.y, 50 * pulse, 25 * pulse);
  }

  private showDialogue(speaker: string, text: string, durationMs: number) {
    const box = document.getElementById('dialogue-box');
    if (!box) return;

    box.querySelector('.dialogue-speaker')!.textContent = speaker;
    box.querySelector('.dialogue-text')!.textContent = text;
    box.classList.remove('hidden');

    this.time.delayedCall(durationMs, () => {
      box.classList.add('hidden');
    });
  }
}
