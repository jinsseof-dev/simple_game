import Phaser from 'phaser';
import { findPath, type Point } from '../utils/pathfinding';
import { TurnManager, type TurnState } from '../game/TurnManager';
import { STAGE_PRESETS, type StageConfig } from '../game/StageConfig';

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
  glowRing: Phaser.GameObjects.Ellipse;
  direction: 'NE' | 'SE' | 'SW' | 'NW';
  dirGraphics: Phaser.GameObjects.Graphics;
  hudBarGraphics?: Phaser.GameObjects.Graphics;
  skinType: string;
  spells: SpellConfig[];
  burnTurns: number;
  stunTurns: number;
  poisonTurns: number;
  bonusDmg: number;
  isPromoted?: boolean;
  isInvincible?: boolean;
}

interface SpellConfig {
  name: string;
  cost: number;
  rangeMin: number;
  rangeMax: number;
  type: 'AoE' | 'Line' | 'Single';
  effectType: 'damage' | 'heal' | 'buff';
  debuffType?: 'burn' | 'stun' | 'poison';
}

interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor';
  classLimit: 'warrior' | 'mage' | 'archer' | 'cleric' | 'rogue';
  dmgBonus: number;
  hpBonus: number;
}

const EQUIPMENT_DATABASE: Item[] = [
  // Warrior Weapons
  { id: 'w_w1', name: '청동 대검', type: 'weapon', classLimit: 'warrior', dmgBonus: 6, hpBonus: 0 },
  { id: 'w_w2', name: '강철 바스타드', type: 'weapon', classLimit: 'warrior', dmgBonus: 12, hpBonus: 0 },
  { id: 'w_w3', name: '룬 그레이트소드', type: 'weapon', classLimit: 'warrior', dmgBonus: 20, hpBonus: 0 },
  { id: 'w_w4', name: '드래곤 슬레이어', type: 'weapon', classLimit: 'warrior', dmgBonus: 30, hpBonus: 0 },
  { id: 'w_w5', name: '성검 아론다이트', type: 'weapon', classLimit: 'warrior', dmgBonus: 45, hpBonus: 0 },
  // Warrior Armors
  { id: 'w_a1', name: '사슬 갑옷', type: 'armor', classLimit: 'warrior', dmgBonus: 0, hpBonus: 20 },
  { id: 'w_a2', name: '판금 갑옷', type: 'armor', classLimit: 'warrior', dmgBonus: 0, hpBonus: 40 },
  { id: 'w_a3', name: '미스릴 갑옷', type: 'armor', classLimit: 'warrior', dmgBonus: 0, hpBonus: 70 },
  { id: 'w_a4', name: '드래곤 스케일', type: 'armor', classLimit: 'warrior', dmgBonus: 0, hpBonus: 110 },
  { id: 'w_a5', name: '천상의 신성 갑옷', type: 'armor', classLimit: 'warrior', dmgBonus: 0, hpBonus: 160 },

  // Mage Weapons
  { id: 'm_w1', name: '견습 마법봉', type: 'weapon', classLimit: 'mage', dmgBonus: 8, hpBonus: 0 },
  { id: 'm_w2', name: '현자의 지팡이', type: 'weapon', classLimit: 'mage', dmgBonus: 16, hpBonus: 0 },
  { id: 'm_w3', name: '비전 대마도서', type: 'weapon', classLimit: 'mage', dmgBonus: 26, hpBonus: 0 },
  { id: 'm_w4', name: '원소의 구체', type: 'weapon', classLimit: 'mage', dmgBonus: 38, hpBonus: 0 },
  { id: 'm_w5', name: '대마도사의 파멸 지팡이', type: 'weapon', classLimit: 'mage', dmgBonus: 55, hpBonus: 0 },
  // Mage Armors
  { id: 'm_a1', name: '마법 학도 로브', type: 'armor', classLimit: 'mage', dmgBonus: 0, hpBonus: 15 },
  { id: 'm_a2', name: '룬 로브', type: 'armor', classLimit: 'mage', dmgBonus: 0, hpBonus: 30 },
  { id: 'm_a3', name: '아스트랄 가브', type: 'armor', classLimit: 'mage', dmgBonus: 0, hpBonus: 55 },
  { id: 'm_a4', name: '원소 엘리멘탈 로브', type: 'armor', classLimit: 'mage', dmgBonus: 0, hpBonus: 90 },
  { id: 'm_a5', name: '별빛 성운 의복', type: 'armor', classLimit: 'mage', dmgBonus: 0, hpBonus: 130 },

  // Archer Weapons
  { id: 'a_w1', name: '합성궁', type: 'weapon', classLimit: 'archer', dmgBonus: 7, hpBonus: 0 },
  { id: 'a_w2', name: '장궁 윈드포스', type: 'weapon', classLimit: 'archer', dmgBonus: 14, hpBonus: 0 },
  { id: 'a_w3', name: '발리스타 크로스보우', type: 'weapon', classLimit: 'archer', dmgBonus: 23, hpBonus: 0 },
  { id: 'a_w4', name: '신성한 요정 궁', type: 'weapon', classLimit: 'archer', dmgBonus: 34, hpBonus: 0 },
  { id: 'a_w5', name: '아폴론의 성궁', type: 'weapon', classLimit: 'archer', dmgBonus: 50, hpBonus: 0 },
  // Archer Armors
  { id: 'a_a1', name: '가죽 갑옷', type: 'armor', classLimit: 'archer', dmgBonus: 0, hpBonus: 18 },
  { id: 'a_a2', name: '강화 가죽 가브', type: 'armor', classLimit: 'archer', dmgBonus: 0, hpBonus: 35 },
  { id: 'a_a3', name: '질풍의 가죽 재킷', type: 'armor', classLimit: 'archer', dmgBonus: 0, hpBonus: 60 },
  { id: 'a_a4', name: '샤도우 스텔스 갑옷', type: 'armor', classLimit: 'archer', dmgBonus: 0, hpBonus: 100 },
  { id: 'a_a5', name: '바람 정령의 조끼', type: 'armor', classLimit: 'archer', dmgBonus: 0, hpBonus: 145 },

  // Cleric Weapons
  { id: 'c_w1', name: '낡은 메이스', type: 'weapon', classLimit: 'cleric', dmgBonus: 5, hpBonus: 0 },
  { id: 'c_w2', name: '신성한 망치', type: 'weapon', classLimit: 'cleric', dmgBonus: 10, hpBonus: 0 },
  { id: 'c_w3', name: '은빛 기도서', type: 'weapon', classLimit: 'cleric', dmgBonus: 17, hpBonus: 0 },
  { id: 'c_w4', name: '자비의 크로스 스태프', type: 'weapon', classLimit: 'cleric', dmgBonus: 27, hpBonus: 0 },
  { id: 'c_w5', name: '천사 가브리엘의 홀', type: 'weapon', classLimit: 'cleric', dmgBonus: 40, hpBonus: 0 },
  // Cleric Armors
  { id: 'c_a1', name: '성직자 의복', type: 'armor', classLimit: 'cleric', dmgBonus: 0, hpBonus: 16 },
  { id: 'c_a2', name: '신성 로브', type: 'armor', classLimit: 'cleric', dmgBonus: 0, hpBonus: 32 },
  { id: 'c_a3', name: '빛의 성의', type: 'armor', classLimit: 'cleric', dmgBonus: 0, hpBonus: 58 },
  { id: 'c_a4', name: '대천사의 수호 로브', type: 'armor', classLimit: 'cleric', dmgBonus: 0, hpBonus: 95 },
  { id: 'c_a5', name: '생명의 신전 갑옷', type: 'armor', classLimit: 'cleric', dmgBonus: 0, hpBonus: 140 },

  // Rogue Weapons
  { id: 'r_w1', name: '무쇠 단검', type: 'weapon', classLimit: 'rogue', dmgBonus: 7, hpBonus: 0 },
  { id: 'r_w2', name: '암살자의 대거', type: 'weapon', classLimit: 'rogue', dmgBonus: 14, hpBonus: 0 },
  { id: 'r_w3', name: '포이즌 크리스', type: 'weapon', classLimit: 'rogue', dmgBonus: 22, hpBonus: 0 },
  { id: 'r_w4', name: '섀도우 블레이드', type: 'weapon', classLimit: 'rogue', dmgBonus: 33, hpBonus: 0 },
  { id: 'r_w5', name: '속삭이는 바람 단검', type: 'weapon', classLimit: 'rogue', dmgBonus: 48, hpBonus: 0 },
  // Rogue Armors
  { id: 'r_a1', name: '누비 옷', type: 'armor', classLimit: 'rogue', dmgBonus: 0, hpBonus: 15 },
  { id: 'r_a2', name: '자객 슈트', type: 'armor', classLimit: 'rogue', dmgBonus: 0, hpBonus: 30 },
  { id: 'r_a3', name: '밤의 스텔스 가브', type: 'armor', classLimit: 'rogue', dmgBonus: 0, hpBonus: 50 },
  { id: 'r_a4', name: '어둠 추적자 조끼', type: 'armor', classLimit: 'rogue', dmgBonus: 0, hpBonus: 85 },
  { id: 'r_a5', name: '심연의 그림자 가죽', type: 'armor', classLimit: 'rogue', dmgBonus: 0, hpBonus: 125 }
];




export class GameScene extends Phaser.Scene {
  private turnManager!: TurnManager;
  private showHeadAvatar = true;
  private pedestalStyle: 'standee' | 'chess' | 'hexagon' = 'hexagon';
  private currentStageIndex = 0;
  private mapObjects: Phaser.GameObjects.GameObject[] = [];
  private fieldItems: { x: number; y: number; item: Item; gameObject: Phaser.GameObjects.GameObject }[] = [];

  // Camera panning control variables
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: any;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private animationSpeedMultiplier = 1.0;
  private cameraSpeed = 10;
  private isDraggingCamera = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private tabKey!: Phaser.Input.Keyboard.Key;
  private isDragModeActive = false;
  private startPointerX = 0;
  private startPointerY = 0;

  // Grid configuration (dynamically set per stage)
  private gridWidth = 8;
  private gridHeight = 8;
  private halfTileWidth = 64;
  private halfTileHeight = 32;

  // Map offset to center it on screen
  private mapOriginX = 0;
  private mapOriginY = 0;

  // Obstacle grid (All flat tiles now as requested)
  private obstacleGrid: boolean[][] = [];
  private cliffGrid: boolean[][] = [];
  private bridgeGrid: boolean[][] = [];
  private lavaGrid: boolean[][] = [];

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
  private isSpellMode = false;
  private selectedSpellIndex = 0; // 0 = Skill 1, 1 = Skill 2
  private isGameOver = false;

  // Persistent Character Growth Academy State
  private trainingSpheres = 0;
  private allyGrowthStats: Record<string, {
    bonusHp: number;
    bonusDmg: number;
    bonusMove: number;
    bonusMp: number;
    equippedWeapon: Item | null;
    equippedArmor: Item | null;
    isPromoted: boolean;
  }> = {
    warrior: { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false },
    mage: { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false },
    archer: { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false },
    cleric: { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false },
    rogue: { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false }
  };

  private sharedInventory: Item[] = [];
  private selectedAcademyHeroKey = 'warrior';
  private spawnedAllyKeys: string[] = [];

  private endgameResult: 'VICTORY' | 'DEFEAT' | 'COMPLETE' = 'VICTORY';

  // Roguelike Runes and Star Challenges State
  private isRuneModeEnabled = false;
  private activeRunes: string[] = [];
  private stageLavaDamaged = false;
  private stageRetreatedCount = 0;

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

    // Bind Keyboard keys for Camera Pan controls
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D
      });
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
      this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
    }

    // Setup Graphics objects
    this.tileMapGraphics = this.add.graphics();
    this.interactiveGraphics = this.add.graphics();
    this.selectionRingGraphics = this.add.graphics();

    // Bind Turn Manager to UI
    this.setupTurnManagerEvents();

    // Load Stage 1 as initial entry
    this.loadStage(this.currentStageIndex);

    // Bind DOM UI Events
    this.bindDOMEvents();

    // Game Mode Selection Modal bindings
    const modeOverlay = document.getElementById('mode-selection-overlay');
    const btnClassic = document.getElementById('btn-mode-classic');
    const btnRune = document.getElementById('btn-mode-rune');
    
    if (this.currentStageIndex > 0) {
      modeOverlay?.classList.add('hidden');
    }

    if (btnClassic && btnRune && modeOverlay) {
      btnClassic.addEventListener('click', () => {
        this.isRuneModeEnabled = false;
        modeOverlay.classList.add('hidden');
        this.showDialogue('SYSTEM', '🏆 클래식 모드가 적용되었습니다.', 1500);
      });
      btnRune.addEventListener('click', () => {
        this.isRuneModeEnabled = true;
        modeOverlay.classList.add('hidden');
        this.showDialogue('SYSTEM', '🔮 로그라이트 룬 모드가 활성화되었습니다!', 1800);
      });
    }

    // Disable browser right click context menu
    this.input.mouse?.disableContextMenu();

    // Resize Handler
    this.scale.on('resize', this.handleResize, this);

    // Input Listeners
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointerup', this.handlePointerUp, this);
  }

  private drawPedestal(char: Character) {
    const graphics = char.bodyParts[0] as Phaser.GameObjects.Graphics;
    if (!graphics) return;
    graphics.clear();

    const isEnemy = char.isEnemy;
    
    // Faction Colors
    const baseColor = isEnemy ? 0x7f1d1d : 0x1e3a8a; // Dark base (Crimson / Blue)
    const topColor = isEnemy ? 0xdc2626 : 0x3b82f6;  // Bright top (Red / Blue)
    const strokeColor = 0xffffff;
    
    const style = this.pedestalStyle;

    if (style === 'standee') {
      // --- 1. Standee Style (Low height: 8px) ---
      graphics.fillStyle(baseColor, 1);
      graphics.fillRect(-20, -8, 40, 8);
      graphics.fillEllipse(0, 0, 40, 16);
      graphics.fillStyle(topColor, 1);
      graphics.fillEllipse(0, -8, 40, 16);
      graphics.lineStyle(1.5, strokeColor, 0.85);
      graphics.strokeEllipse(0, -8, 40, 16);

      // Center card clip slot
      const clipBaseColor = isEnemy ? 0x450a0a : 0x172554;
      graphics.fillStyle(clipBaseColor, 1);
      graphics.fillRect(-12, -12, 24, 4);
      graphics.fillEllipse(0, -8, 24, 6);
      graphics.fillEllipse(0, -12, 24, 6);
      
      // Black slot slit line where badge is standing
      graphics.lineStyle(1.5, 0x111827, 1);
      graphics.beginPath();
      graphics.moveTo(-10, -12);
      graphics.lineTo(10, -12);
      graphics.strokePath();

    } else if (style === 'chess') {
      // --- 2. Chess Pedestal Style ---
      // Tier 1: Wide Bottom
      graphics.fillStyle(baseColor, 1);
      graphics.fillRect(-22, -4, 44, 4);
      graphics.fillEllipse(0, 0, 44, 16);
      graphics.fillEllipse(0, -4, 44, 16);

      // Tier 2: Narrow Neck (middle)
      const midColor = isEnemy ? 0x991b1b : 0x2563eb;
      graphics.fillStyle(midColor, 1);
      graphics.fillRect(-12, -11, 24, 7);
      graphics.fillEllipse(0, -4, 24, 8);
      graphics.fillEllipse(0, -11, 24, 8);

      // Tier 3: Rounded Top Plinth
      graphics.fillStyle(topColor, 1);
      graphics.fillEllipse(0, -14, 28, 12);
      graphics.lineStyle(1.5, strokeColor, 0.85);
      graphics.strokeEllipse(0, -14, 28, 12);

    } else if (style === 'hexagon') {
      // --- 3. Hexagonal Plinth Style ---
      // Side 1: Bottom center-right wall
      graphics.fillStyle(baseColor, 1);
      graphics.beginPath();
      graphics.moveTo(0, 4);
      graphics.lineTo(18, -2);
      graphics.lineTo(18, 6);
      graphics.lineTo(0, 12);
      graphics.closePath();
      graphics.fillPath();

      // Side 2: Bottom center-left wall
      const wallLColor = isEnemy ? 0x991b1b : 0x1d4ed8;
      graphics.fillStyle(wallLColor, 1);
      graphics.beginPath();
      graphics.moveTo(-18, -2);
      graphics.lineTo(0, 4);
      graphics.lineTo(0, 12);
      graphics.lineTo(-18, 6);
      graphics.closePath();
      graphics.fillPath();
      
      // Top hex cap
      graphics.fillStyle(topColor, 1);
      graphics.beginPath();
      graphics.moveTo(0, -16);
      graphics.lineTo(18, -10);
      graphics.lineTo(18, -2);
      graphics.lineTo(0, 4);
      graphics.lineTo(-18, -2);
      graphics.lineTo(-18, -10);
      graphics.closePath();
      graphics.fillPath();

      // Draw bezel outline
      graphics.lineStyle(1.5, strokeColor, 0.85);
      graphics.beginPath();
      graphics.moveTo(0, -16);
      graphics.lineTo(18, -10);
      graphics.lineTo(18, -2);
      graphics.lineTo(0, 4);
      graphics.lineTo(-18, -2);
      graphics.lineTo(-18, -10);
      graphics.closePath();
      graphics.strokePath();


      // --- Base Hexagon drawings end here ---
    }

    // Status Debuff Visual Rings:
    if (char.burnTurns > 0) {
      // Burn: orange fire aura ring
      graphics.lineStyle(2.0, 0xf97316, 0.75);
      graphics.strokeEllipse(0, -6, 42, 21);
      // Flame particles (small diagonal spur lines)
      graphics.beginPath();
      graphics.moveTo(-16, -16); graphics.lineTo(-20, -23);
      graphics.moveTo(16, -16); graphics.lineTo(20, -23);
      graphics.moveTo(-16, 4); graphics.lineTo(-20, 9);
      graphics.moveTo(16, 4); graphics.lineTo(20, 9);
      graphics.strokePath();
    }

    if (char.stunTurns > 0) {
      // Stun: shocking cyan electric spark ring
      graphics.lineStyle(2.2, 0x00f3ff, 0.9);
      graphics.strokeEllipse(0, -6, 39, 19.5);
      // Zigzag electricity crackles
      graphics.beginPath();
      graphics.moveTo(-12, -8);
      graphics.lineTo(-6, -13);
      graphics.lineTo(0, -6);
      graphics.lineTo(6, -14);
      graphics.lineTo(12, -8);
      graphics.strokePath();
    }

    if (char.poisonTurns > 0) {
      // Poison: acid green bubbling aura ring
      graphics.lineStyle(2.0, 0x22c55e, 0.8);
      graphics.strokeEllipse(0, -6, 44, 22);
      // Small poison droplets
      graphics.fillStyle(0x22c55e, 0.75);
      graphics.fillCircle(-21, -12, 2.5);
      graphics.fillCircle(21, -12, 2.5);
      graphics.fillCircle(-10, 8, 2);
      graphics.fillCircle(10, 8, 2);
    }

    // Embed beautiful neon compass directional ring at the bottom of all pedestals!
    this.drawCompassIndicator(graphics, char);
  }

  private drawCompassIndicator(graphics: Phaser.GameObjects.Graphics, char: Character) {
    const isEnemy = char.isEnemy;
    const arrowColor = isEnemy ? 0xf97316 : 0x00ff88; // Neon Orange / Neon Mint
    
    // 1. Draw elegant compass dial guide ellipse around pedestal base
    graphics.lineStyle(1.8, 0xffffff, 0.28);
    graphics.strokeEllipse(0, -6, 36, 18);

    // 2. Draw 4 directional guide dots and 1 sharp highlighted pointing wedge
    const dirs = ['NE', 'SE', 'SW', 'NW'];
    dirs.forEach(dir => {
      if (char.direction === dir) {
        graphics.fillStyle(arrowColor, 0.95);
        graphics.lineStyle(1.0, 0xffffff, 0.85);
        graphics.beginPath();
        if (dir === 'NE') {
          graphics.moveTo(25, -19); // Tip
          graphics.lineTo(14, -18); // Left Wing
          graphics.lineTo(20, -10); // Right Wing
        } else if (dir === 'SE') {
          graphics.moveTo(25, 7);   // Tip
          graphics.lineTo(20, -2);  // Left Wing
          graphics.lineTo(14, 6);   // Right Wing
        } else if (dir === 'SW') {
          graphics.moveTo(-25, 7);  // Tip
          graphics.lineTo(-14, 6);  // Left Wing
          graphics.lineTo(-20, -2); // Right Wing
        } else if (dir === 'NW') {
          graphics.moveTo(-25, -19); // Tip
          graphics.lineTo(-20, -10); // Left Wing
          graphics.lineTo(-14, -18); // Right Wing
        }
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
      } else {
        // Draw tiny inactive guide dots aligned to the isometric diagonal ellipse
        graphics.fillStyle(0xffffff, 0.45);
        if (dir === 'NE') graphics.fillPoint(25, -16, 2.5);
        else if (dir === 'SE') graphics.fillPoint(25, 4, 2.5);
        else if (dir === 'SW') graphics.fillPoint(-25, 4, 2.5);
        else if (dir === 'NW') graphics.fillPoint(-25, -16, 2.5);
      }
    });
  }

  private drawPixelArt(char: Character) {
    const isMirror = (char.direction === 'NW' || char.direction === 'SW');
    
    // Scale standard size: X-mirroring flips text/avatar rendering!
    const baseScaleX = 1.0;
    const baseScaleY = 1.0;
    
    if (char.bodyText) {
      char.bodyText.setScale(isMirror ? -baseScaleX : baseScaleX, baseScaleY);
    }
    
    if (char.bodySprite) {
      char.bodySprite.setFlipX(isMirror);
    }
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
    // Speed multiplier state evaluation (Spacebar or UI fast toggle)
    const btnSkip = document.getElementById('btn-skip-toggle');
    const isUiSkipActive = btnSkip && btnSkip.classList.contains('active');
    if (this.spaceKey && this.spaceKey.isDown) {
      this.animationSpeedMultiplier = 0.08;
    } else {
      this.animationSpeedMultiplier = isUiSkipActive ? 0.05 : 1.0;
    }

    // 1. Camera Panning Controls (Keyboard)
    const scrollSpeed = this.cameraSpeed;
    if (this.cursors && this.wasdKeys) {
      if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
        this.cameras.main.scrollX -= scrollSpeed;
      }
      if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
        this.cameras.main.scrollX += scrollSpeed;
      }
      if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
        this.cameras.main.scrollY -= scrollSpeed;
      }
      if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
        this.cameras.main.scrollY += scrollSpeed;
      }
    }



    // 3. Clamp Camera Scroll within dynamic boundary bounds
    const maxScrollX = 300 + (this.gridWidth - 8) * 45;
    const maxScrollY = 250 + (this.gridHeight - 8) * 30;
    this.cameras.main.scrollX = Phaser.Math.Clamp(this.cameras.main.scrollX, -maxScrollX, maxScrollX);
    this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY, -maxScrollY, maxScrollY);

    // 4. Spacebar: Quick Focus on the selected character
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.selectedCharacter) {
      const pos = this.gridToScreen(this.selectedCharacter.x, this.selectedCharacter.y);
      this.cameras.main.pan(pos.x, pos.y - 30, 350, 'Power2');
    }

    // 5. Tab Key: Cycle selection through active player characters who have remaining actions
    if (this.tabKey && Phaser.Input.Keyboard.JustDown(this.tabKey) && this.turnManager.getState() === 'PLAYER_TURN' && !this.isGameOver) {
      const activeAllies = this.characters.filter(c => 
        !c.isEnemy && 
        c.hp > 0 && 
        !(c.hasMovedThisTurn && c.hasAttackedThisTurn)
      );

      if (activeAllies.length > 0) {
        let targetIdx = 0;
        if (this.selectedCharacter) {
          const currentIdx = activeAllies.indexOf(this.selectedCharacter);
          if (currentIdx !== -1) {
            targetIdx = (currentIdx + 1) % activeAllies.length;
          }
        }
        const targetUnit = activeAllies[targetIdx];
        this.selectCharacter(targetUnit);
        
        const pos = this.gridToScreen(targetUnit.x, targetUnit.y);
        this.cameras.main.pan(pos.x, pos.y - 30, 300, 'Power2');
      }
    }

    // Clear and redraw highlights
    this.interactiveGraphics.clear();
    this.drawHoverHighlight();
    this.drawMovementRangeHighlight();
    this.drawAttackRangeHighlight();
    this.drawSpellRangeHighlight();
    this.drawHoveredCharacterAttackRange();
    this.drawSelectionRing();
  }

  private updateOriginPoints() {
    this.mapOriginX = this.cameras.main.width / 2;
    if (this.gridWidth >= 16) {
      this.mapOriginY = this.cameras.main.height / 3.8;
    } else {
      this.mapOriginY = this.cameras.main.height / 3;
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.updateOriginPoints();
    this.renderStaticMap();
    this.updateCharacterPositions();
  }

  private initProceduralMap() {
    this.obstacleGrid = [];
    this.cliffGrid = [];
    this.bridgeGrid = [];
    this.lavaGrid = [];

    const stage = STAGE_PRESETS[this.currentStageIndex];
    const theme = stage ? stage.theme : 'grass';

    // Initialize blank grids matching dynamic dimension
    for (let y = 0; y < this.gridHeight; y++) {
      this.obstacleGrid.push(Array(this.gridWidth).fill(false));
      this.cliffGrid.push(Array(this.gridWidth).fill(false));
      this.bridgeGrid.push(Array(this.gridWidth).fill(false));
      this.lavaGrid.push(Array(this.gridWidth).fill(false));
    }

    if (theme === 'desert') {
      // 1. Canyon Cliff & Bridge Theme (Desert theme gets gorge/canyons)
      const cx = Math.floor(this.gridWidth / 2);
      
      for (let y = 0; y < this.gridHeight; y++) {
        this.cliffGrid[y][cx] = true;
        if (y % 4 !== 0 && cx + 1 < this.gridWidth) {
          this.cliffGrid[y][cx + 1] = true;
        }
      }

      const cy = Math.floor(this.gridHeight / 2);
      const bridgeRow1 = cy;
      const bridgeRow2 = cy - 1;

      for (let y = 0; y < this.gridHeight; y++) {
        if (y === bridgeRow1 || y === bridgeRow2) {
          this.cliffGrid[y][cx] = false;
          this.bridgeGrid[y][cx] = true;
          if (cx + 1 < this.gridWidth) {
            this.cliffGrid[y][cx + 1] = false;
            this.bridgeGrid[y][cx + 1] = true;
          }
        }
      }

      // Add cover obstacles near the bridge heads
      const covers = [
        { x: cx - 2, y: bridgeRow1 },
        { x: cx - 2, y: bridgeRow2 },
        { x: cx + 3, y: bridgeRow1 },
        { x: cx + 3, y: bridgeRow2 }
      ];
      covers.forEach(c => {
        if (c.x >= 0 && c.x < this.gridWidth && c.y >= 0 && c.y < this.gridHeight) {
          this.obstacleGrid[c.y][c.x] = true;
        }
      });
    } else if (theme === 'town') {
      // 2. Town / Fortress Theme: Lava Pit trenches flowing through town streets
      const lavaCol1 = Math.floor(this.gridWidth / 2) - 1;
      const lavaCol2 = Math.floor(this.gridWidth / 2);

      for (let y = 0; y < this.gridHeight; y++) {
        // Leave a 2-tile bridge in the middle for passage across lava
        const cy = Math.floor(this.gridHeight / 2);
        if (y !== cy && y !== cy - 1) {
          this.lavaGrid[y][lavaCol1] = true;
          this.lavaGrid[y][lavaCol2] = true;
        }
      }

      // Add obstacles (Crates/Barrels)
      for (let y = 1; y < this.gridHeight - 1; y++) {
        for (let x = 1; x < this.gridWidth - 1; x++) {
          const isNearAllySpawn = (x < 3 && y >= this.gridHeight - 3);
          const isNearEnemySpawn = (x >= this.gridWidth - 3 && y < 3);
          const isLava = this.lavaGrid[y][x];

          if (!isNearAllySpawn && !isNearEnemySpawn && !isLava && Math.random() < 0.12) {
            this.obstacleGrid[y][x] = true;
          }
        }
      }
    } else if (theme === 'dungeon') {
      // 3. Dungeon Boss Arena Theme: Highly organized symmetrical pillars & checkerboard lava pools
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          const isNearAllySpawn = (x < 3 && y >= this.gridHeight - 3);
          const isNearEnemySpawn = (x >= this.gridWidth - 3 && y < 3);
          
          if (isNearAllySpawn || isNearEnemySpawn) continue;

          // Symmetrical pillars/obstacles
          if ((x === 3 || x === this.gridWidth - 4) && (y === 3 || y === this.gridHeight - 4)) {
            this.obstacleGrid[y][x] = true;
          }

          // Checkerboard lava pits in center
          if (x >= 4 && x <= this.gridWidth - 5 && y >= 4 && y <= this.gridHeight - 5) {
            if ((x + y) % 2 === 0) {
              this.lavaGrid[y][x] = true;
            }
          }
        }
      }
    } else {
      // 4. Grass Theme (Generic open field with scattered foliage)
      for (let y = 1; y < this.gridHeight - 1; y++) {
        for (let x = 1; x < this.gridWidth - 1; x++) {
          const isNearAllySpawn = (x < 4 && y >= this.gridHeight - 4);
          const isNearEnemySpawn = (x >= this.gridWidth - 4 && y < 4);
          
          if (!isNearAllySpawn && !isNearEnemySpawn && Math.random() < 0.14) {
            this.obstacleGrid[y][x] = true;
          }
        }
      }
    }
  }

  private getDynamicObstacleGrid(excludingChar: Character, targetChar?: Character): boolean[][] {
    const grid: boolean[][] = [];
    for (let y = 0; y < this.gridHeight; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        // Impassable if static obstacle OR if it is a cliff that does not have a bridge on it
        const isCliffWall = this.cliffGrid[y] && this.cliffGrid[y][x] && !(this.bridgeGrid[y] && this.bridgeGrid[y][x]);
        row.push(this.obstacleGrid[y][x] || isCliffWall);
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
    const stage = STAGE_PRESETS[this.currentStageIndex];
    const theme = stage.theme;

    // Draw tiles
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const screenPos = this.gridToScreen(x, y);

        // Subdued, premium tones matching paper tabletop boardgames
        let tileColor = 0x1e293b;
        const isLavaTile = !!(this.lavaGrid[y] && this.lavaGrid[y][x]);
        if (isLavaTile) {
          tileColor = (x + y) % 2 === 0 ? 0xe11d48 : 0xbe123c;
        } else if (theme === 'grass') {
          tileColor = (x + y) % 2 === 0 ? 0x2e4a31 : 0x1f3622;
        } else if (theme === 'desert') {
          tileColor = (x + y) % 2 === 0 ? 0xd2b48c : 0xb39371;
        } else if (theme === 'town') {
          tileColor = (x + y) % 2 === 0 ? 0x854d0e : 0x713f12;
        } else if (theme === 'dungeon') {
          tileColor = (x + y) % 2 === 0 ? 0x384252 : 0x29313e;
        }
        
        const isCliff = this.cliffGrid[y] && this.cliffGrid[y][x];
        const isBridge = this.bridgeGrid[y] && this.bridgeGrid[y][x];
        
        this.drawIsometricTile(this.tileMapGraphics, screenPos.x, screenPos.y, tileColor, true, theme, isCliff, isBridge, isLavaTile);

        if (this.obstacleGrid[y][x]) {
          this.drawIsometricObstacle(this.tileMapGraphics, screenPos.x, screenPos.y, theme);
        }
      }
    }
  }

  private drawIsometricObstacle(graphics: Phaser.GameObjects.Graphics, isoX: number, isoY: number, theme: string) {
    if (theme === 'grass') {
      // --- 1. RUGGED BOULDER (자연 바위 더미) ---
      // Ground Shadow
      graphics.fillStyle(0x000000, 0.35);
      graphics.fillEllipse(isoX, isoY + 4, 38, 18);
      
      // Face 1: Left light slope (slate gray)
      graphics.fillStyle(0x94a3b8, 1);
      graphics.beginPath();
      graphics.moveTo(isoX, isoY - 32);
      graphics.lineTo(isoX - 18, isoY - 10);
      graphics.lineTo(isoX - 10, isoY + 2);
      graphics.lineTo(isoX, isoY - 8);
      graphics.closePath();
      graphics.fillPath();

      // Face 2: Right dark slope (dark slate gray)
      graphics.fillStyle(0x475569, 1);
      graphics.beginPath();
      graphics.moveTo(isoX, isoY - 32);
      graphics.lineTo(isoX, isoY - 8);
      graphics.lineTo(isoX + 12, isoY + 4);
      graphics.lineTo(isoX + 18, isoY - 14);
      graphics.closePath();
      graphics.fillPath();

      // Face 3: Lower ground shadowing rock foot
      graphics.fillStyle(0x334155, 1);
      graphics.beginPath();
      graphics.moveTo(isoX - 10, isoY + 2);
      graphics.lineTo(isoX, isoY - 8);
      graphics.lineTo(isoX + 12, isoY + 4);
      graphics.lineTo(isoX - 2, isoY + 8);
      graphics.closePath();
      graphics.fillPath();

      // Bold Outlines
      graphics.lineStyle(1.8, 0x0f172a, 1.0);
      graphics.beginPath();
      graphics.moveTo(isoX, isoY - 32);
      graphics.lineTo(isoX - 18, isoY - 10);
      graphics.lineTo(isoX - 10, isoY + 2);
      graphics.lineTo(isoX - 2, isoY + 8);
      graphics.lineTo(isoX + 12, isoY + 4);
      graphics.lineTo(isoX + 18, isoY - 14);
      graphics.closePath();
      graphics.strokePath();

      // Inner crease lines
      graphics.beginPath();
      graphics.moveTo(isoX, isoY - 32);
      graphics.lineTo(isoX, isoY - 8);
      graphics.moveTo(isoX - 10, isoY + 2);
      graphics.lineTo(isoX, isoY - 8);
      graphics.lineTo(isoX + 12, isoY + 4);
      graphics.strokePath();

    } else if (theme === 'desert') {
      // --- 2. SANDSTONE ROCK & MINI CACTUS (사구 암석과 선인장) ---
      // Ground Shadow
      graphics.fillStyle(0x000000, 0.35);
      graphics.fillEllipse(isoX, isoY + 4, 34, 16);

      // Sandstone base
      graphics.fillStyle(0xa16207, 1); // Dark gold ochre
      graphics.beginPath();
      graphics.moveTo(isoX - 15, isoY - 4);
      graphics.lineTo(isoX, isoY - 26);
      graphics.lineTo(isoX + 14, isoY - 12);
      graphics.lineTo(isoX - 2, isoY + 6);
      graphics.closePath();
      graphics.fillPath();

      // Sandstone highlight face
      graphics.fillStyle(0xca8a04, 1); // Bright gold yellow
      graphics.beginPath();
      graphics.moveTo(isoX - 15, isoY - 4);
      graphics.lineTo(isoX, isoY - 26);
      graphics.lineTo(isoX - 2, isoY + 6);
      graphics.closePath();
      graphics.fillPath();

      // Outlines for stone
      graphics.lineStyle(1.8, 0x451a03, 1.0);
      graphics.beginPath();
      graphics.moveTo(isoX - 15, isoY - 4);
      graphics.lineTo(isoX, isoY - 26);
      graphics.lineTo(isoX + 14, isoY - 12);
      graphics.lineTo(isoX - 2, isoY + 6);
      graphics.closePath();
      graphics.strokePath();

      graphics.beginPath();
      graphics.moveTo(isoX, isoY - 26);
      graphics.lineTo(isoX - 2, isoY + 6);
      graphics.strokePath();

      // Cactus (Sprouting slightly to the left)
      graphics.fillStyle(0x15803d, 1); // Cactus green
      graphics.fillRect(isoX - 11, isoY - 33, 5, 23);
      graphics.fillStyle(0x166534, 1); // Shaded side
      graphics.fillRect(isoX - 8, isoY - 33, 2, 23);

      // Branch
      graphics.fillStyle(0x15803d, 1);
      graphics.fillRect(isoX - 16, isoY - 26, 6, 3);
      graphics.fillRect(isoX - 16, isoY - 30, 3, 5);

      // Cactus Outlines
      graphics.lineStyle(1.5, 0x052e16, 1.0);
      graphics.strokeRect(isoX - 11, isoY - 33, 5, 23);
      graphics.strokeRect(isoX - 16, isoY - 30, 3, 5);

    } else if (theme === 'town') {
      // --- 3. WOODEN OAK BARREL (마을 오크 나무통) ---
      // Ground Shadow
      graphics.fillStyle(0x000000, 0.35);
      graphics.fillEllipse(isoX, isoY + 4, 30, 15);

      // Oak Barrel Cylinder Base
      graphics.fillStyle(0x78350f, 1); // Dark brown wood
      graphics.fillRect(isoX - 12, isoY - 28, 24, 28);
      
      // Ellipse Top wood cap
      graphics.fillStyle(0xa16207, 1); // Light warm wood
      graphics.fillEllipse(isoX, isoY - 28, 24, 8);
      graphics.fillEllipse(isoX, isoY, 24, 8);

      // Iron Rings around barrel
      graphics.fillStyle(0x334155, 1); // Iron slate gray
      graphics.fillRect(isoX - 12.5, isoY - 20, 25, 3);
      graphics.fillRect(isoX - 12.5, isoY - 8, 25, 3);

      // Outer outline & shading details
      graphics.lineStyle(1.8, 0x1c1917, 1.0);
      graphics.beginPath();
      // Outer side boundaries
      graphics.moveTo(isoX - 12, isoY - 28);
      graphics.lineTo(isoX - 12, isoY);
      graphics.moveTo(isoX + 12, isoY - 28);
      graphics.lineTo(isoX + 12, isoY);
      graphics.strokePath();

      graphics.strokeEllipse(isoX, isoY - 28, 24, 8);
      // Bottom rim curve outline
      graphics.beginPath();
      graphics.arc(isoX, isoY, 12, 0, Math.PI, false);
      graphics.strokePath();

      // Vertical Wood Staves lines
      graphics.lineStyle(0.8, 0x451a03, 0.6);
      graphics.beginPath();
      graphics.moveTo(isoX - 4, isoY - 26);
      graphics.lineTo(isoX - 4, isoY + 2);
      graphics.moveTo(isoX + 4, isoY - 26);
      graphics.lineTo(isoX + 4, isoY + 2);
      graphics.strokePath();
    } else {
      // --- 4. ANCIENT RUIN PILLAR (깨진 유적 석주) ---
      // Ground Shadow
      graphics.fillStyle(0x000000, 0.4);
      graphics.fillEllipse(isoX, isoY + 2, 40, 20);

      // Left Pillar Body (Muted Blue-Gray)
      graphics.fillStyle(0x334155, 1);
      graphics.beginPath();
      graphics.moveTo(isoX - 12, isoY - 40);
      graphics.lineTo(isoX - 2, isoY - 33);
      graphics.lineTo(isoX - 2, isoY + 6);
      graphics.lineTo(isoX - 12, isoY);
      graphics.closePath();
      graphics.fillPath();

      // Right Pillar Body (Darker Slate Gray)
      graphics.fillStyle(0x1e293b, 1);
      graphics.beginPath();
      graphics.moveTo(isoX - 2, isoY - 33);
      graphics.lineTo(isoX + 12, isoY - 31);
      graphics.lineTo(isoX + 12, isoY + 4);
      graphics.lineTo(isoX - 2, isoY + 6);
      graphics.closePath();
      graphics.fillPath();

      // Top Broken Diagonal Cap (Light Sand Stone color)
      graphics.fillStyle(0x64748b, 1);
      graphics.beginPath();
      graphics.moveTo(isoX - 12, isoY - 40);
      graphics.lineTo(isoX + 10, isoY - 37);
      graphics.lineTo(isoX + 12, isoY - 31);
      graphics.lineTo(isoX - 2, isoY - 33);
      graphics.closePath();
      graphics.fillPath();

      // Outlines
      graphics.lineStyle(1.8, 0x0f172a, 1.0);
      graphics.beginPath();
      graphics.moveTo(isoX - 12, isoY - 40);
      graphics.lineTo(isoX - 12, isoY);
      graphics.lineTo(isoX - 2, isoY + 6);
      graphics.lineTo(isoX + 12, isoY + 4);
      graphics.lineTo(isoX + 12, isoY - 31);
      graphics.lineTo(isoX - 12, isoY - 40);
      graphics.strokePath();

      graphics.beginPath();
      graphics.moveTo(isoX - 2, isoY - 33);
      graphics.lineTo(isoX - 2, isoY + 6);
      graphics.strokePath();

      // Cracks in ruin stone
      graphics.lineStyle(1.2, 0x090d16, 0.75);
      graphics.beginPath();
      graphics.moveTo(isoX - 6, isoY - 20);
      graphics.lineTo(isoX - 9, isoY - 14);
      graphics.lineTo(isoX - 5, isoY - 8);
      graphics.strokePath();
    }
  }

  private drawIsometricTile(graphics: Phaser.GameObjects.Graphics, isoX: number, isoY: number, color: number, border: boolean, theme: 'grass' | 'desert' | 'town' | 'dungeon', isCliff = false, isBridge = false, isLava = false) {
    if (isLava) {
      // --- D. BUBBLING LAVA PIT (이글거리는 마그마 용암) ---
      // 1. Base glowing orange support depth
      graphics.fillStyle(0x991b1b, 1.0); // deep red base
      graphics.beginPath();
      graphics.moveTo(isoX - this.halfTileWidth, isoY);
      graphics.lineTo(isoX, isoY + this.halfTileHeight);
      graphics.lineTo(isoX + this.halfTileWidth, isoY);
      graphics.lineTo(isoX + this.halfTileWidth, isoY + 6);
      graphics.lineTo(isoX, isoY + this.halfTileHeight + 6);
      graphics.lineTo(isoX - this.halfTileWidth, isoY + 6);
      graphics.closePath();
      graphics.fillPath();

      // 2. Liquid lava top surface
      graphics.fillStyle(color, 1.0); // bright molten color
      graphics.lineStyle(1.8, 0xf97316, 0.7); // Bright hot orange lava borders

      graphics.beginPath();
      graphics.moveTo(isoX, isoY - this.halfTileHeight);
      graphics.lineTo(isoX + this.halfTileWidth, isoY);
      graphics.lineTo(isoX, isoY + this.halfTileHeight);
      graphics.lineTo(isoX - this.halfTileWidth, isoY);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();

      // 3. Draw a glowing core highlight inside lava tile to represent heat
      graphics.fillStyle(0xfef08a, 0.45); // Soft yellow heat glow
      graphics.beginPath();
      graphics.moveTo(isoX, isoY - this.halfTileHeight * 0.4);
      graphics.lineTo(isoX + this.halfTileWidth * 0.4, isoY);
      graphics.lineTo(isoX, isoY + this.halfTileHeight * 0.4);
      graphics.lineTo(isoX - this.halfTileWidth * 0.4, isoY);
      graphics.closePath();
      graphics.fillPath();
      return;
    }

    if (isCliff && !isBridge) {
      // --- A. 3D DEEP CANYON CLIFF (칠흑의 입체 낭떠러지) ---
      // 1. Draw 3D Cliff Side Facet (Downwards depth extrusion)
      graphics.fillStyle(0x06060e, 1.0);
      graphics.beginPath();
      graphics.moveTo(isoX - this.halfTileWidth, isoY);
      graphics.lineTo(isoX, isoY + this.halfTileHeight);
      graphics.lineTo(isoX + this.halfTileWidth, isoY);
      graphics.lineTo(isoX + this.halfTileWidth, isoY + 28);
      graphics.lineTo(isoX, isoY + this.halfTileHeight + 28);
      graphics.lineTo(isoX - this.halfTileWidth, isoY + 28);
      graphics.closePath();
      graphics.fillPath();

      // 2. Draw Top Flat Cliff Surface (Dark abyss tile)
      graphics.fillStyle(0x0a0915, 1.0);
      graphics.lineStyle(1.5, 0x5b21b6, 0.38); // Deep neon violet grid line

      graphics.beginPath();
      graphics.moveTo(isoX, isoY - this.halfTileHeight);
      graphics.lineTo(isoX + this.halfTileWidth, isoY);
      graphics.lineTo(isoX, isoY + this.halfTileHeight);
      graphics.lineTo(isoX - this.halfTileWidth, isoY);
      graphics.closePath();
      
      graphics.fillPath();
      graphics.strokePath();
      return; // Skip standard ground dithering for canyon abyss
    }

    if (isBridge) {
      // --- B. TACTICAL WOOD PLANK BRIDGE (목재 다리) ---
      // 1. Draw solid dark brown support base
      graphics.fillStyle(0x3e2723, 1.0);
      graphics.beginPath();
      graphics.moveTo(isoX - this.halfTileWidth, isoY);
      graphics.lineTo(isoX, isoY + this.halfTileHeight);
      graphics.lineTo(isoX + this.halfTileWidth, isoY);
      graphics.lineTo(isoX + this.halfTileWidth, isoY + 6);
      graphics.lineTo(isoX, isoY + this.halfTileHeight + 6);
      graphics.lineTo(isoX - this.halfTileWidth, isoY + 6);
      graphics.closePath();
      graphics.fillPath();

      // 2. Draw bridge top surface planks
      graphics.fillStyle(0x5c4033, 1.0);
      graphics.lineStyle(1.8, 0xd97706, 0.7); // Bright amber borders

      graphics.beginPath();
      graphics.moveTo(isoX, isoY - this.halfTileHeight);
      graphics.lineTo(isoX + this.halfTileWidth, isoY);
      graphics.lineTo(isoX, isoY + this.halfTileHeight);
      graphics.lineTo(isoX - this.halfTileWidth, isoY);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();

      // 3. Draw rustic wood plank dividers (lines running NE-SW)
      graphics.lineStyle(1.5, 0x2a1b15, 0.65);
      graphics.beginPath();
      
      // Parallel plank lines
      graphics.moveTo(isoX - this.halfTileWidth / 2, isoY - this.halfTileHeight / 2);
      graphics.lineTo(isoX + this.halfTileWidth / 2, isoY + this.halfTileHeight / 2);
      
      graphics.moveTo(isoX - this.halfTileWidth / 4, isoY - this.halfTileHeight / 4);
      graphics.lineTo(isoX + this.halfTileWidth * 0.75, isoY + this.halfTileHeight * 0.75);

      graphics.moveTo(isoX - this.halfTileWidth * 0.75, isoY - this.halfTileHeight * 0.75);
      graphics.lineTo(isoX + this.halfTileWidth / 4, isoY + this.halfTileHeight / 4);
      
      graphics.strokePath();
      return; // Skip ground dithering for bridges
    }

    // --- C. STANDARD GROUND TILE ---
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

    // 16-bit Dithering / Texture Overlay based on theme
    const stepY = 4;
    const stepX = 4;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    const seed = Math.sin(isoX * 12.9898 + isoY * 78.233) * 43758.5453;
    let randIdx = Math.abs(Math.floor(seed)) % 100;

    // A. Draw Theme-specific textures (Grass blades / Sand ripples / Cobblestone lines)
    if (theme === 'dungeon') {
      // Cobblestone grout divider lines (4-split brick)
      graphics.lineStyle(1.2, 0x1e293b, 0.4);
      graphics.beginPath();
      graphics.moveTo(isoX, isoY - this.halfTileHeight);
      graphics.lineTo(isoX, isoY + this.halfTileHeight);
      graphics.moveTo(isoX - this.halfTileWidth, isoY);
      graphics.lineTo(isoX + this.halfTileWidth, isoY);
      graphics.strokePath();
    } else if (theme === 'grass') {
      // Grass weeds randomly spread
      if (randIdx % 7 === 0) {
        graphics.fillStyle(0x0f172a, 0.25);
        graphics.fillRect(isoX + (randIdx % 20) - 10, isoY + (randIdx % 10) - 5, 2, 4);
      }
    } else if (theme === 'desert') {
      // Desert sand wind waves
      if (randIdx % 9 === 0) {
        graphics.lineStyle(1.2, 0x7c2d12, 0.15);
        graphics.beginPath();
        graphics.moveTo(isoX - 10, isoY + (randIdx % 6) - 3);
        graphics.lineTo(isoX + 10, isoY + (randIdx % 6) - 1);
        graphics.strokePath();
      }
    } else if (theme === 'town') {
      // Clay Brick Pavement textures (horizontal overlay brick cuts)
      graphics.lineStyle(1.2, 0x451a03, 0.4);
      graphics.beginPath();
      graphics.moveTo(isoX - 25, isoY - 6);
      graphics.lineTo(isoX + 25, isoY - 6);
      graphics.moveTo(isoX - 25, isoY + 6);
      graphics.lineTo(isoX + 25, isoY + 6);
      graphics.moveTo(isoX - 10, isoY - 6);
      graphics.lineTo(isoX - 10, isoY + 6);
      graphics.moveTo(isoX + 10, isoY - 6);
      graphics.lineTo(isoX + 10, isoY + 6);
      graphics.strokePath();
    }

    // B. General pixel texture noise
    for (let dy = -this.halfTileHeight + 2; dy < this.halfTileHeight - 2; dy += stepY) {
      const tRatio = 1 - Math.abs(dy) / this.halfTileHeight;
      const xRange = Math.floor(this.halfTileWidth * tRatio) - 2;

      for (let dx = -xRange; dx < xRange; dx += stepX) {
        randIdx = (randIdx * 33 + 17) % 100;
        
        if (randIdx > 78) {
          const shadowColor = (Math.max(0, r - 10) << 16) | (Math.max(0, g - 10) << 8) | Math.max(0, b - 10);
          graphics.fillStyle(shadowColor, 0.4);
          graphics.fillRect(isoX + dx, isoY + dy, 2, 2);
        } else if (randIdx < 12) {
          const highlightColor = (Math.min(255, r + 12) << 16) | (Math.min(255, g + 12) << 8) | Math.min(255, b + 12);
          graphics.fillStyle(highlightColor, 0.3);
          graphics.fillRect(isoX + dx, isoY + dy, 2, 2);
        }
      }
    }
  }

  private loadStage(stageIndex: number) {
    this.currentStageIndex = stageIndex;
    const stage = STAGE_PRESETS[stageIndex];
    if (!stage) return;

    // Reset Star Challenges trackers
    this.stageLavaDamaged = false;
    this.stageRetreatedCount = 0;

    // Reset camera scroll position and compute adaptive zoom
    this.cameras.main.setScroll(0, 0);
    let zoom = 1.0;
    if (stage.width >= 16) {
      zoom = 0.74;
    } else if (stage.width >= 12) {
      zoom = 0.86;
    } else if (stage.width >= 10) {
      zoom = 0.94;
    }
    this.cameras.main.setZoom(zoom);

    // 1. Clean up existing objects
    this.characters.forEach(c => {
      if (c.gameObject) c.gameObject.destroy();
    });
    this.characters = [];
    this.selectedCharacter = null;
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
      this.selectionIndicator = null;
    }
    this.mapObjects.forEach(obj => obj.destroy());
    this.mapObjects = [];
    this.fieldItems = [];

    // 2. Set grid configuration dynamically based on stage index
    this.gridWidth = 10 + (this.currentStageIndex % 3) * 3;
    this.gridHeight = this.gridWidth;
    this.updateOriginPoints();

    // 3. Init procedural map layouts (Canyon cliffs, Bridges, Rocky forests)
    this.initProceduralMap();

    // 4. Render map
    this.renderStaticMap();

    // 5. Load units
    this.createCharactersFromPreset(stage);
    this.spawnFieldItems();

    // 6. Reset turn manager and UI
    this.turnManager.reset();
    
    // Update Stage display HUD
    let chapterStr = "";
    if (stageIndex <= 2) {
      chapterStr = `Chapter 1-${stageIndex + 1} [숲]`;
    } else if (stageIndex <= 5) {
      chapterStr = `Chapter 2-${stageIndex - 2} [사막]`;
    } else if (stageIndex <= 8) {
      chapterStr = `Chapter 3-${stageIndex - 5} [마을]`;
    } else {
      chapterStr = `Chapter 4-1 [보스전]`;
    }

    const stageNameDisplay = document.getElementById('stage-name-display');
    if (stageNameDisplay) {
      stageNameDisplay.innerText = `${chapterStr} : ${stage.name}`;
    }

    // Hide clear overlay if visible
    const clearOverlay = document.getElementById('stage-clear-overlay');
    if (clearOverlay) {
      clearOverlay.classList.add('hidden');
    }

    // Select first living ally unit
    const firstPlayer = this.characters.find(c => !c.isEnemy);
    if (firstPlayer) {
      this.selectCharacter(firstPlayer);
    }
  }

  private createCharactersFromPreset(stage: StageConfig) {
    const UNIT_SPECS: Record<string, {
      avatar: string;
      maxHp: number;
      maxMp: number;
      maxAp: number;
      moveRange: number;
      minAttackRange: number;
      maxAttackRange: number;
      spriteKey: string;
      scale: number;
      baseColor: number;
      topColor: number;
      isEnemy: boolean;
      spells: SpellConfig[];
    }> = {
      warrior: {
        avatar: '⚔️', maxHp: 100, maxMp: 5, maxAp: 3, moveRange: 4, minAttackRange: 1, maxAttackRange: 1, spriteKey: 'char_warrior', scale: 1.92, baseColor: 0x1e3a8a, topColor: 0x3b82f6, isEnemy: false,
        spells: [
          { name: '썬더 슬래시', cost: 2, rangeMin: 1, rangeMax: 2, type: 'Single', effectType: 'damage', debuffType: 'stun' },
          { name: '피닉스 다이브', cost: 3, rangeMin: 1, rangeMax: 3, type: 'AoE', effectType: 'damage', debuffType: 'burn' }
        ]
      },
      mage: {
        avatar: '🔮', maxHp: 75, maxMp: 5, maxAp: 3, moveRange: 3, minAttackRange: 2, maxAttackRange: 4, spriteKey: 'char_mage', scale: 1.92, baseColor: 0x4c1d95, topColor: 0x8b5cf6, isEnemy: false,
        spells: [
          { name: '파이어 스톰', cost: 3, rangeMin: 2, rangeMax: 4, type: 'AoE', effectType: 'damage', debuffType: 'burn' },
          { name: '프로스트 레이', cost: 2, rangeMin: 2, rangeMax: 4, type: 'Line', effectType: 'damage', debuffType: 'stun' }
        ]
      },
      archer: {
        avatar: '🏹', maxHp: 80, maxMp: 5, maxAp: 3, moveRange: 4, minAttackRange: 3, maxAttackRange: 5, spriteKey: 'char_archer', scale: 1.92, baseColor: 0x064e3b, topColor: 0x10b981, isEnemy: false,
        spells: [
          { name: '윈드 피어스', cost: 2, rangeMin: 3, rangeMax: 5, type: 'Line', effectType: 'damage' },
          { name: '샤이닝 에로우', cost: 3, rangeMin: 3, rangeMax: 5, type: 'Single', effectType: 'damage', debuffType: 'stun' }
        ]
      },
      cleric: {
        avatar: '💚', maxHp: 85, maxMp: 5, maxAp: 3, moveRange: 3, minAttackRange: 1, maxAttackRange: 2, spriteKey: 'char_mage', scale: 1.92, baseColor: 0x065f46, topColor: 0x34d399, isEnemy: false,
        spells: [
          { name: '홀리 하트', cost: 2, rangeMin: 1, rangeMax: 3, type: 'Single', effectType: 'heal' },
          { name: '그레이스 에어', cost: 3, rangeMin: 1, rangeMax: 3, type: 'AoE', effectType: 'heal' }
        ]
      },
      rogue: {
        avatar: '🗡️', maxHp: 90, maxMp: 5, maxAp: 3, moveRange: 5, minAttackRange: 1, maxAttackRange: 1, spriteKey: 'char_warrior', scale: 1.92, baseColor: 0x111827, topColor: 0x4b5563, isEnemy: false,
        spells: [
          { name: '섀도우 스텝', cost: 2, rangeMin: 1, rangeMax: 2, type: 'Single', effectType: 'damage' },
          { name: '포이즌 대거', cost: 2, rangeMin: 1, rangeMax: 2, type: 'Single', effectType: 'damage', debuffType: 'poison' }
        ]
      },
      gob_warrior: {
        avatar: '👹', maxHp: 60, maxMp: 5, maxAp: 3, moveRange: 3, minAttackRange: 1, maxAttackRange: 1, spriteKey: 'char_goblin', scale: 1.92, baseColor: 0x7f1d1d, topColor: 0xdc2626, isEnemy: true,
        spells: [
          { name: '휠윈드 슬래시', cost: 2, rangeMin: 1, rangeMax: 1, type: 'AoE', effectType: 'damage' },
          { name: '격노의 도끼', cost: 2, rangeMin: 1, rangeMax: 1, type: 'Single', effectType: 'damage', debuffType: 'burn' }
        ]
      },
      gob_archer: {
        avatar: '🏹', maxHp: 50, maxMp: 5, maxAp: 3, moveRange: 3, minAttackRange: 2, maxAttackRange: 4, spriteKey: 'char_goblin', scale: 1.92, baseColor: 0x7c2d12, topColor: 0xea580c, isEnemy: true,
        spells: [
          { name: '포이즌 에로우', cost: 2, rangeMin: 2, rangeMax: 4, type: 'Single', effectType: 'damage', debuffType: 'poison' },
          { name: '더블 샷', cost: 2, rangeMin: 2, rangeMax: 4, type: 'Single', effectType: 'damage' }
        ]
      },
        gob_shaman: {
        avatar: '🧙‍♂️', maxHp: 55, maxMp: 5, maxAp: 3, moveRange: 3, minAttackRange: 2, maxAttackRange: 3, spriteKey: 'char_goblin_boss', scale: 1.92, baseColor: 0x881337, topColor: 0xf43f5e, isEnemy: true,
        spells: [
          { name: '다크 스피어', cost: 3, rangeMin: 2, rangeMax: 3, type: 'AoE', effectType: 'damage', debuffType: 'stun' },
          { name: '커스 오브 파이어', cost: 2, rangeMin: 2, rangeMax: 3, type: 'Single', effectType: 'damage', debuffType: 'burn' }
        ]
      },
      gob_assassin: {
        avatar: '👤', maxHp: 50, maxMp: 5, maxAp: 3, moveRange: 4, minAttackRange: 1, maxAttackRange: 1, spriteKey: 'char_goblin', scale: 1.92, baseColor: 0x451a03, topColor: 0xa16207, isEnemy: true,
        spells: [
          { name: '기습', cost: 2, rangeMin: 1, rangeMax: 2, type: 'Single', effectType: 'damage' },
          { name: '독침', cost: 2, rangeMin: 1, rangeMax: 2, type: 'Single', effectType: 'damage', debuffType: 'poison' }
        ]
      },
      gob_defender: {
        avatar: '🛡️', maxHp: 85, maxMp: 5, maxAp: 3, moveRange: 2, minAttackRange: 1, maxAttackRange: 1, spriteKey: 'char_goblin_boss', scale: 1.92, baseColor: 0x14532d, topColor: 0x22c55e, isEnemy: true,
        spells: [
          { name: '그라운드 퀘이크', cost: 2, rangeMin: 1, rangeMax: 2, type: 'Single', effectType: 'damage', debuffType: 'stun' },
          { name: '고블린 블러드', cost: 2, rangeMin: 1, rangeMax: 1, type: 'Single', effectType: 'heal' }
        ]
      }
    };

    const spawnPresets = [...stage.allies, ...stage.enemies];

    this.spawnedAllyKeys = [];

    spawnPresets.forEach(preset => {
      const spec = UNIT_SPECS[preset.type];
      if (!spec) return;

      if (!spec.isEnemy && !this.spawnedAllyKeys.includes(preset.type)) {
        this.spawnedAllyKeys.push(preset.type);
      }

      let spawnX = preset.x;
      let spawnY = preset.y;

      const isValidSpawn = (x: number, y: number) => {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return false;
        if (this.cliffGrid[y][x] && !(this.bridgeGrid[y] && this.bridgeGrid[y][x])) return false;
        if (this.obstacleGrid[y][x]) return false;
        const isOccupied = this.characters.some(c => c.x === x && c.y === y && c.hp > 0);
        return !isOccupied;
      };

      if (!isValidSpawn(spawnX, spawnY)) {
        let found = false;
        if (!spec.isEnemy) {
          for (let y = this.gridHeight - 1; y >= this.gridHeight - 6; y--) {
            for (let x = 0; x < 6; x++) {
              if (isValidSpawn(x, y)) {
                spawnX = x;
                spawnY = y;
                found = true;
                break;
              }
            }
            if (found) break;
          }
        } else {
          for (let y = 0; y < 6; y++) {
            for (let x = this.gridWidth - 1; x >= this.gridWidth - 6; x--) {
              if (isValidSpawn(x, y)) {
                spawnX = x;
                spawnY = y;
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
      }

      const container = this.add.container(0, 0);
      container.add(this.add.ellipse(0, 0, 48, 24, 0x000000, 0.4)); // shadow

      // Glow Ring
      const ringColor = spec.isEnemy ? 0xf97316 : 0x38bdf8;
      const glow = this.add.ellipse(0, 0, spec.isEnemy ? 68 : 72, spec.isEnemy ? 34 : 36, ringColor, 0.7).setVisible(false);
      this.tweens.add({
        targets: glow,
        alpha: 0.08,
        scaleX: 1.35,
        scaleY: 1.35,
        duration: 900,
        yoyo: true,
        repeat: -1
      });
      container.add(glow);

    // Body Sprite
      const sprite = this.add.image(0, -28, spec.spriteKey).setScale(spec.scale).setOrigin(0.5, 0.95).setVisible(false);
      container.add(sprite);

      // Pedestal Stand
      const pillar = this.add.graphics();
      container.add(pillar);

      // Head Emblem / Emoji Text
      const emblemStrokeColor = spec.isEnemy ? 0xf97316 : 0x38bdf8;
      const emblemBg = spec.isEnemy ? 0x450a0a : 0x1e1b4b;
      const emblem = this.add.circle(0, -24, 20, emblemBg).setStrokeStyle(2.5, emblemStrokeColor, 1);
      const text = this.add.text(0, -24, spec.avatar, { fontSize: '20px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
      container.add(emblem);
      container.add(text);

      const dirGraphics = this.add.graphics();
      container.add(dirGraphics);

      // Calculate stage difficulty multiplier for enemies
      let difficultyMultiplier = 1.0;
      if (spec.isEnemy) {
        const chapterNum = Math.floor(this.currentStageIndex / 3) + 1;
        const stageNumWithinChapter = (this.currentStageIndex % 3) + 1;
        difficultyMultiplier = 1.0 + (chapterNum - 1) * 0.25 + (stageNumWithinChapter - 1) * 0.15;
      }

      const growth = !spec.isEnemy ? (this.allyGrowthStats[preset.type] || { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false }) : { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false };
      const eqDmg = (growth.equippedWeapon ? growth.equippedWeapon.dmgBonus : 0);
      const eqHp = (growth.equippedArmor ? growth.equippedArmor.hpBonus : 0);

      let finalMaxHp = spec.isEnemy ? Math.floor(spec.maxHp * difficultyMultiplier) : (spec.maxHp + growth.bonusHp + eqHp);
      let finalMaxMp = spec.maxMp + growth.bonusMp;
      let finalMoveRange = spec.moveRange + growth.bonusMove;
      if (!spec.isEnemy && this.activeRunes.includes('wind_walk')) {
        finalMoveRange += 1;
      }
      let finalMaxAttackRange = spec.maxAttackRange;
      let finalBonusDmg = growth.bonusDmg + eqDmg;

      let charName = preset.name;
      let charAvatar = spec.avatar;

      if (!spec.isEnemy && growth.isPromoted) {
        if (preset.type === 'warrior') {
          charName = '성기사 레온';
          charAvatar = '👑';
          finalMaxHp += 30;
          finalMoveRange += 1;
        } else if (preset.type === 'mage') {
          charName = '대마도사 아이샤';
          charAvatar = '🔮';
          finalMaxMp += 2;
        } else if (preset.type === 'archer') {
          charName = '신궁 로이';
          charAvatar = '🎯';
          finalMaxAttackRange += 1;
        } else if (preset.type === 'cleric') {
          charName = '대주교 세라';
          charAvatar = '👼';
        } else if (preset.type === 'rogue') {
          charName = '그림자 카엘';
          charAvatar = '👤';
          finalBonusDmg += 10;
        }
        text.setText(charAvatar);
      }

      // Copy base spells
      const charSpells = [...spec.spells];
      
      // Append 3rd Tier promoted spell
      if (!spec.isEnemy && growth.isPromoted) {
        if (preset.type === 'warrior') {
          charSpells.push({ name: '신의 수호', cost: 3, rangeMin: 1, rangeMax: 2, type: 'AoE', effectType: 'buff' });
        } else if (preset.type === 'mage') {
          charSpells.push({ name: '종말의 유성', cost: 3, rangeMin: 1, rangeMax: 4, type: 'AoE', effectType: 'damage', debuffType: 'burn' });
        } else if (preset.type === 'archer') {
          charSpells.push({ name: '폭풍의 벼락 화살', cost: 3, rangeMin: 1, rangeMax: 6, type: 'Line', effectType: 'damage', debuffType: 'stun' });
        } else if (preset.type === 'cleric') {
          charSpells.push({ name: '구원의 성가', cost: 3, rangeMin: 0, rangeMax: 9, type: 'Single', effectType: 'heal' });
        } else if (preset.type === 'rogue') {
          charSpells.push({ name: '암습의 난무', cost: 3, rangeMin: 1, rangeMax: 4, type: 'Single', effectType: 'damage' });
        }
      }

      const char: Character = {
        name: charName,
        x: spawnX,
        y: spawnY,
        hp: finalMaxHp,
        maxHp: finalMaxHp,
        mp: finalMaxMp,
        maxMp: finalMaxMp,
        ap: 0,
        maxAp: spec.maxAp,
        avatar: charAvatar,
        isEnemy: spec.isEnemy,
        gameObject: container,
        moveRange: finalMoveRange,
        minAttackRange: spec.minAttackRange,
        maxAttackRange: spec.maxAttackRange,
        hasMovedThisTurn: false,
        hasAttackedThisTurn: false,
        bodyEmblem: emblem,
        bodyText: text,
        bodySprite: sprite,
        bodyParts: [pillar],
        glowRing: glow,
        direction: spec.isEnemy ? 'SE' : 'NW',
        dirGraphics: dirGraphics,
        skinType: preset.type,
        spells: spec.spells,
        burnTurns: 0,
        stunTurns: 0,
        poisonTurns: 0,
        bonusDmg: growth.bonusDmg + eqDmg
      };

      if (char.isEnemy && char.name.includes('[BOSS]')) {
        container.setScale(1.35);
      }

      this.drawPedestal(char);
      this.updateDirectionVisual(char);
      this.characters.push(char);
    });

    this.characters.forEach(char => {
      const ringColor = char.isEnemy ? 0xf97316 : 0x3b82f6;
      const auraRing = this.add.ellipse(0, 0, 52, 26);
      auraRing.setStrokeStyle(1.8, ringColor, 0.45);
      char.gameObject.addAt(auraRing, 1);

      const hudG = this.add.graphics();
      char.gameObject.add(hudG);
      char.hudBarGraphics = hudG;

      this.drawPixelArt(char);
      this.updateCharacterVisualMode(char);
    });

    this.updateCharacterPositions();
    this.characters.forEach(char => this.updateMiniHUDBar(char));
  }

  private spawnFieldItems() {
    const isValidTile = (x: number, y: number) => {
      if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return false;
      if (this.cliffGrid[y][x] && !(this.bridgeGrid[y] && this.bridgeGrid[y][x])) return false;
      if (this.obstacleGrid[y][x]) return false;
      if (this.characters.some(c => c.x === x && c.y === y && c.hp > 0)) return false;
      if (this.fieldItems.some(f => f.x === x && f.y === y)) return false;
      return true;
    };

    for (let i = 0; i < 2; i++) {
      let x = 0;
      let y = 0;
      let found = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        x = Phaser.Math.Between(0, this.gridWidth - 1);
        y = Phaser.Math.Between(0, this.gridHeight - 1);
        if (isValidTile(x, y)) {
          found = true;
          break;
        }
      }
      if (!found) continue;

      const item = Phaser.Utils.Array.GetRandom(EQUIPMENT_DATABASE);
      const { x: sx, y: sy } = this.gridToScreen(x, y);
      const icon = this.add.text(sx, sy - 10, '🎁', { fontSize: '28px' }).setOrigin(0.5);
      icon.setDepth(sy);
      this.tweens.add({
        targets: icon,
        y: sy - 20,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.mapObjects.push(icon);
      this.fieldItems.push({ x, y, item, gameObject: icon });
    }
  }

  private updateDirectionVisual(char: Character) {
    char.dirGraphics.clear();
    
    // Draw Farland Tactics style 4-way arrows if in direction selection mode
    const showArrows = this.isDirectionSelectMode && this.selectedCharacter === char && !char.isEnemy;
    if (showArrows) {
      const directions: ('NE' | 'SE' | 'SW' | 'NW')[] = ['NE', 'SE', 'SW', 'NW'];
      
      directions.forEach(dir => {
        const isCurrent = char.direction === dir;
        const topColor = isCurrent ? 0xff4d4d : 0x00f3ff;
        const sideColor = isCurrent ? 0xaa0000 : 0x007ba0;
        const strokeColor = isCurrent ? 0xffffff : 0x00c8ff;
        const strokeAlpha = isCurrent ? 0.95 : 0.45;
        const alpha = isCurrent ? 1.0 : 0.65;

        // 1. Draw Side Facet (Depth Shadow)
        char.dirGraphics.fillStyle(sideColor, alpha);
        char.dirGraphics.beginPath();
        if (dir === 'NE') {
          char.dirGraphics.moveTo(28, -20);
          char.dirGraphics.lineTo(36, -34);
          char.dirGraphics.lineTo(29, -16);
          char.dirGraphics.lineTo(22, -18);
        } else if (dir === 'SE') {
          char.dirGraphics.moveTo(22, -12);
          char.dirGraphics.lineTo(36, -10);
          char.dirGraphics.lineTo(26, -6);
          char.dirGraphics.lineTo(18, -8);
        } else if (dir === 'SW') {
          char.dirGraphics.moveTo(-22, -12);
          char.dirGraphics.lineTo(-36, -10);
          char.dirGraphics.lineTo(-26, -6);
          char.dirGraphics.lineTo(-18, -8);
        } else if (dir === 'NW') {
          char.dirGraphics.moveTo(-28, -20);
          char.dirGraphics.lineTo(-36, -34);
          char.dirGraphics.lineTo(-29, -16);
          char.dirGraphics.lineTo(-22, -18);
        }
        char.dirGraphics.closePath();
        char.dirGraphics.fillPath();

        // 2. Draw Top Facet (Glow Top Face)
        char.dirGraphics.fillStyle(topColor, alpha);
        char.dirGraphics.beginPath();
        if (dir === 'NE') {
          char.dirGraphics.moveTo(20, -28);
          char.dirGraphics.lineTo(36, -34);
          char.dirGraphics.lineTo(28, -20);
        } else if (dir === 'SE') {
          char.dirGraphics.moveTo(28, -20);
          char.dirGraphics.lineTo(36, -10);
          char.dirGraphics.lineTo(22, -12);
        } else if (dir === 'SW') {
          char.dirGraphics.moveTo(-28, -20);
          char.dirGraphics.lineTo(-36, -10);
          char.dirGraphics.lineTo(-22, -12);
        } else if (dir === 'NW') {
          char.dirGraphics.moveTo(-20, -28);
          char.dirGraphics.lineTo(-36, -34);
          char.dirGraphics.lineTo(-28, -20);
        }
        char.dirGraphics.closePath();
        char.dirGraphics.fillPath();

        // 3. Draw Neon Outer Outline
        char.dirGraphics.lineStyle(1.8, strokeColor, strokeAlpha);
        char.dirGraphics.beginPath();
        if (dir === 'NE') {
          char.dirGraphics.moveTo(20, -28);
          char.dirGraphics.lineTo(36, -34);
          char.dirGraphics.lineTo(29, -16);
          char.dirGraphics.lineTo(22, -18);
        } else if (dir === 'SE') {
          char.dirGraphics.moveTo(28, -20);
          char.dirGraphics.lineTo(36, -10);
          char.dirGraphics.lineTo(26, -6);
          char.dirGraphics.lineTo(18, -8);
        } else if (dir === 'SW') {
          char.dirGraphics.moveTo(-28, -20);
          char.dirGraphics.lineTo(-36, -10);
          char.dirGraphics.lineTo(-26, -6);
          char.dirGraphics.lineTo(-18, -8);
        } else if (dir === 'NW') {
          char.dirGraphics.moveTo(-20, -28);
          char.dirGraphics.lineTo(-36, -34);
          char.dirGraphics.lineTo(-29, -16);
          char.dirGraphics.lineTo(-22, -18);
        }
        char.dirGraphics.closePath();
        char.dirGraphics.strokePath();
      });
    }

    this.drawPedestal(char);
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
    // Enable/disable pulsing glow rings based on current selection
    this.characters.forEach(c => {
      if (c.glowRing) c.glowRing.setVisible(false);
    });
    if (char.glowRing) {
      char.glowRing.setVisible(true);
    }

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
    this.isSpellMode = false;

    // 4. UX Fix: Automatically trigger movement mode if char has not moved yet
    const btnMove = document.getElementById('btn-move');
    const btnTurn = document.getElementById('btn-turn');
    const btnAttack = document.getElementById('btn-attack');
    const btnSpell = document.getElementById('btn-spell');
    
    if (btnMove) btnMove.classList.remove('highlight');
    if (btnTurn) btnTurn.classList.remove('highlight');
    if (btnAttack) btnAttack.classList.remove('highlight');
    if (btnSpell) btnSpell.classList.remove('highlight');
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

    // 3. Line of sight check (Static terrain obstacles always block. Characters block dynamically based on faction)
    if (dx !== 0) {
      const step = Math.sign(dx);
      for (let cx = attacker.x + step; cx !== tx; cx += step) {
        // Static terrain blocks always
        if (this.obstacleGrid[attacker.y][cx]) return false;

        // Cover shields:
        if (attacker.isEnemy) {
          // Enemies attacking players are blocked by ANY living unit (allies/enemies) on the path
          const hasBlocker = this.characters.some(c => c.x === cx && c.y === attacker.y && c.hp > 0);
          if (hasBlocker) return false;
        } else {
          // Players attacking are only blocked by Enemy units on the path (Allies shoot through each other)
          const hasEnemyBlocker = this.characters.some(c => c.x === cx && c.y === attacker.y && c.hp > 0 && c.isEnemy);
          if (hasEnemyBlocker) return false;
        }
      }
    } else if (dy !== 0) {
      const step = Math.sign(dy);
      for (let cy = attacker.y + step; cy !== ty; cy += step) {
        // Static terrain blocks always
        if (this.obstacleGrid[cy][attacker.x]) return false;

        // Cover shields:
        if (attacker.isEnemy) {
          // Enemies attacking players are blocked by ANY living unit on the path
          const hasBlocker = this.characters.some(c => c.x === attacker.x && c.y === cy && c.hp > 0);
          if (hasBlocker) return false;
        } else {
          // Players attacking are only blocked by Enemy units on the path
          const hasEnemyBlocker = this.characters.some(c => c.x === attacker.x && c.y === cy && c.hp > 0 && c.isEnemy);
          if (hasEnemyBlocker) return false;
        }
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
    const btnSpell1 = document.getElementById('btn-spell-1') as HTMLButtonElement;
    const btnSpell2 = document.getElementById('btn-spell-2') as HTMLButtonElement;
    const btnSpell3 = document.getElementById('btn-spell-3') as HTMLButtonElement;
    const btnWait = document.getElementById('btn-wait') as HTMLButtonElement;
    const btnEnd = document.getElementById('btn-end-turn') as HTMLButtonElement;

    if (btnMove && btnTurn && btnAttack && btnSpell1 && btnSpell2 && btnSpell3 && btnWait && btnEnd) {
      if (isAnimating || this.isGameOver || !this.selectedCharacter || this.selectedCharacter.isEnemy) {
        btnMove.disabled = true;
        btnTurn.disabled = true;
        btnAttack.disabled = true;
        btnSpell1.disabled = true;
        btnSpell2.disabled = true;
        btnSpell3.disabled = true;
        btnWait.disabled = true;
        btnEnd.disabled = this.isGameOver || isAnimating; 
      } else if (isPlayerTurn) {
        const char = this.selectedCharacter;
        const spell1 = char.spells[0];
        const spell2 = char.spells[1];
        const spell3 = char.spells[2];

        let cost1 = spell1 ? spell1.cost : 99;
        let cost2 = spell2 ? spell2.cost : 99;
        let cost3 = spell3 ? spell3.cost : 99;

        if (!char.isEnemy && this.activeRunes.includes('mp_accel')) {
          cost1 = Math.max(1, cost1 - 1);
          cost2 = Math.max(1, cost2 - 1);
          cost3 = Math.max(1, cost3 - 1);
        }

        const canUseSpell1 = spell1 && char.mp >= cost1 && char.ap >= cost1 && !char.hasAttackedThisTurn;
        const canUseSpell2 = spell2 && char.mp >= cost2 && char.ap >= cost2 && !char.hasAttackedThisTurn;
        const canUseSpell3 = spell3 && char.mp >= cost3 && char.ap >= cost3 && !char.hasAttackedThisTurn;

        btnMove.disabled = char.hasMovedThisTurn || char.hasAttackedThisTurn;
        btnTurn.disabled = char.hasAttackedThisTurn; 
        btnAttack.disabled = char.ap <= 0 || char.hasAttackedThisTurn;
        btnSpell1.disabled = !canUseSpell1;
        btnSpell2.disabled = !canUseSpell2;
        btnSpell3.disabled = !canUseSpell3;
        
        if (spell1) {
          btnSpell1.innerText = `${spell1.name} (🔮${cost1})`;
        } else {
          btnSpell1.innerText = '스킬 1';
        }

        if (spell2) {
          btnSpell2.innerText = `${spell2.name} (🔮${cost2})`;
        } else {
          btnSpell2.innerText = '스킬 2';
        }

        if (spell3) {
          btnSpell3.innerText = `${spell3.name} (🔮${cost3})`;
          btnSpell3.style.display = 'inline-block';
        } else {
          btnSpell3.innerText = '궁극기 미해제';
          btnSpell3.disabled = true;
          btnSpell3.style.display = 'none';
        }

        btnWait.disabled = char.hasMovedThisTurn && char.hasAttackedThisTurn;
        btnEnd.disabled = false;
      } else {
        btnMove.disabled = true;
        btnTurn.disabled = true;
        btnAttack.disabled = true;
        btnSpell1.disabled = true;
        btnSpell2.disabled = true;
        btnSpell3.disabled = true;
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
              // 1. Process Status Effects (Burn dot / Stun CC) first
              this.processStatusEffectsForFaction(false);

              this.characters.forEach(c => {
                if (!c.isEnemy && c.hp > 0) {
                  c.ap = Math.min(c.ap + 1, c.maxAp);
                  if (turnNumber > 1) {
                    c.mp = Math.min(c.mp + 1, c.maxMp);
                  }
                  c.hasMovedThisTurn = false;
                  c.hasAttackedThisTurn = false;
                  c.gameObject.alpha = 1.0; 
                  this.updateMiniHUDBar(c);
                }
              });

              // Select first living player ONLY on real turn transition
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
            // Clear selection and neon glow rings on turn change
            if (this.selectionIndicator) {
              this.selectionIndicator.destroy();
              this.selectionIndicator = null;
            }
            this.characters.forEach(c => {
              if (c.glowRing) c.glowRing.setVisible(false);
            });
            this.selectedCharacter = null;

            // Clear player turn timer
            this.clearTurnTimer();

            // Restore enemies
            if (lastRealState === 'PLAYER_TURN') {
              // 2. Process Status Effects (Burn dot / Stun CC) first for enemies
              this.processStatusEffectsForFaction(true);

              this.characters.forEach(c => {
                if (c.isEnemy && c.hp > 0) {
                  c.ap = Math.min(c.ap + 1, c.maxAp);
                  if (turnNumber > 1) {
                    c.mp = Math.min(c.mp + 1, c.maxMp);
                  }
                  c.hasMovedThisTurn = false;
                  c.hasAttackedThisTurn = false;
                  c.gameObject.alpha = 1.0;
                  this.updateMiniHUDBar(c);
                }
              });
              
              // Run AI (Delay slightly for status popups if any)
              this.time.delayedCall(500 * this.animationSpeedMultiplier, () => {
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

  private processStatusEffectsForFaction(isEnemyFaction: boolean) {
    if (this.isGameOver) return;

    this.characters.forEach(c => {
      if (c.hp > 0 && c.isEnemy === isEnemyFaction) {
        c.isInvincible = false;
        // 1. Process Stun CC
        if (c.stunTurns > 0) {
          c.ap = 0; // Lock action points to 0
          c.stunTurns--;
          
          this.drawPedestal(c);
          this.showDialogue(c.name, '마비되어 턴이 강제 스킵된다!', 1300);

          const effectText = this.add.text(c.gameObject.x, c.gameObject.y - 115, '⚡ 마비 행동불가!', {
            fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
            fontSize: '13px',
            color: '#00f3ff',
            stroke: '#000000',
            strokeThickness: 3
          }).setOrigin(0.5).setDepth(c.gameObject.depth + 101);

          this.tweens.add({
            targets: effectText,
            y: effectText.y - 25,
            alpha: 0,
            duration: 1200 * this.animationSpeedMultiplier,
            onComplete: () => effectText.destroy()
          });
        }

        // 2. Process Burn DoT (15% maxHp damage)
        if (c.burnTurns > 0 && c.hp > 0) {
          const burnDamage = Math.floor(c.maxHp * 0.15);
          c.hp = Math.max(0, c.hp - burnDamage);
          c.burnTurns--;
          
          this.drawPedestal(c);
          this.updateMiniHUDBar(c);
          if (this.selectedCharacter === c && !c.isEnemy) {
            this.updateUIProfile(c);
          }

          // Trigger orange color damage text
          this.showDamagePopup(c.gameObject, burnDamage, false, '#f97316');

          const effectText = this.add.text(c.gameObject.x, c.gameObject.y - 115, '🔥 화상 지속피해!', {
            fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
            fontSize: '13px',
            color: '#f97316',
            stroke: '#000000',
            strokeThickness: 3
          }).setOrigin(0.5).setDepth(c.gameObject.depth + 101);

          this.tweens.add({
            targets: effectText,
            y: effectText.y - 25,
            alpha: 0,
            duration: 1200 * this.animationSpeedMultiplier,
            onComplete: () => effectText.destroy()
          });

          // Flash target orange
          this.tweens.add({
            targets: c.gameObject,
            x: c.gameObject.x + 4,
            duration: 50 * this.animationSpeedMultiplier,
            yoyo: true,
            repeat: 2,
            onStart: () => {
              this.cameras.main.flash(50 * this.animationSpeedMultiplier, 249, 115, 22, false);
            }
          });

          if (c.hp <= 0) {
            this.handleDeath(c);
          }
        }

        // 3. Process Poison DoT (12% maxHp damage)
        if (c.poisonTurns > 0 && c.hp > 0) {
          const poisonDamage = Math.floor(c.maxHp * 0.12);
          c.hp = Math.max(0, c.hp - poisonDamage);
          c.poisonTurns--;

          this.drawPedestal(c);
          this.updateMiniHUDBar(c);
          if (this.selectedCharacter === c && !c.isEnemy) {
            this.updateUIProfile(c);
          }

          // Green poison damage text
          this.showDamagePopup(c.gameObject, poisonDamage, false, '#22c55e');

          const effectText = this.add.text(c.gameObject.x, c.gameObject.y - 115, '🤢 독 지속피해!', {
            fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
            fontSize: '13px',
            color: '#22c55e',
            stroke: '#000000',
            strokeThickness: 3
          }).setOrigin(0.5).setDepth(c.gameObject.depth + 101);

          this.tweens.add({
            targets: effectText,
            y: effectText.y - 25,
            alpha: 0,
            duration: 1200 * this.animationSpeedMultiplier,
            onComplete: () => effectText.destroy()
          });

          // Flash target green
          this.tweens.add({
            targets: c.gameObject,
            x: c.gameObject.x + 4,
            duration: 50 * this.animationSpeedMultiplier,
            yoyo: true,
            repeat: 2,
            onStart: () => {
              this.cameras.main.flash(50 * this.animationSpeedMultiplier, 34, 197, 94, false);
            }
          });

          if (c.hp <= 0) {
            this.handleDeath(c);
          }
        }

        // 4. Process Lava (Molten magma check) DoT
        if (c.hp > 0 && this.lavaGrid[c.y] && this.lavaGrid[c.y][c.x]) {
          const lavaDamage = Math.floor(c.maxHp * 0.15);
          c.hp = Math.max(0, c.hp - lavaDamage);
          c.burnTurns = Math.max(c.burnTurns, 3); // Inflict Burn for 3 turns!
          if (!c.isEnemy) {
            this.stageLavaDamaged = true;
          }
          
          this.drawPedestal(c);
          this.updateMiniHUDBar(c);
          if (this.selectedCharacter === c && !c.isEnemy) {
            this.updateUIProfile(c);
          }

          this.showDamagePopup(c.gameObject, lavaDamage, false, '#f43f5e');

          const effectText = this.add.text(c.gameObject.x, c.gameObject.y - 115, '🌋 용암지대 피해!', {
            fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
            fontSize: '13px',
            color: '#f43f5e',
            stroke: '#000000',
            strokeThickness: 3
          }).setOrigin(0.5).setDepth(c.gameObject.depth + 101);

          this.tweens.add({
            targets: effectText,
            y: effectText.y - 25,
            alpha: 0,
            duration: 1200 * this.animationSpeedMultiplier,
            onComplete: () => effectText.destroy()
          });

          if (c.hp <= 0) {
            this.handleDeath(c);
          }
        }

        // 5. Boss Frenzy Passive Regeneration (Citadel Defiance)
        if (c.hp > 0 && c.isEnemy && c.name.includes('[BOSS]') && c.hp / c.maxHp <= 0.5) {
          const oldHp = c.hp;
          const regenAmount = Math.floor(c.maxHp * 0.10);
          c.hp = Math.min(c.maxHp, c.hp + regenAmount);
          const realRegen = c.hp - oldHp;

          if (realRegen > 0) {
            this.drawPedestal(c);
            this.updateMiniHUDBar(c);

            const regenText = this.add.text(c.gameObject.x, c.gameObject.y - 115, `💚 재생 +${realRegen}`, {
              fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
              fontSize: '14px',
              color: '#4ade80',
              stroke: '#000000',
              strokeThickness: 3.5
            }).setOrigin(0.5).setDepth(c.gameObject.depth + 101);

            this.tweens.add({
              targets: regenText,
              y: regenText.y - 30,
              alpha: 0,
              duration: 1200 * this.animationSpeedMultiplier,
              onComplete: () => regenText.destroy()
            });
          }
        }
      }
    });

    // Check if the DoT damage cleared the opposing faction entirely
    this.time.delayedCall(400 * this.animationSpeedMultiplier, () => {
      this.checkGameConditions();
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
    const btnSkip = document.getElementById('btn-skip-toggle');

    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        btnSkip.classList.toggle('active');
        if (btnSkip.classList.contains('active')) {
          this.animationSpeedMultiplier = 0.05;
        } else {
          this.animationSpeedMultiplier = 1.0;
        }
      });
    }

    const btnCheat = document.getElementById('btn-cheat-win');
    if (btnCheat) {
      btnCheat.addEventListener('click', () => {
        if (this.isGameOver) return;

        // Force kill all active enemies on the field
        this.characters.forEach(c => {
          if (c.isEnemy && c.hp > 0) {
            c.hp = 0;
            this.handleDeath(c);
          }
        });
        
        const activeLeon = this.characters.find(c => !c.isEnemy && c.hp > 0);
        if (activeLeon) {
          this.showDialogue(activeLeon.name, '치트키 발동! 적군이 일시에 전멸했다!', 1200);
        }

        this.time.delayedCall(800 * this.animationSpeedMultiplier, () => {
          if (this.currentStageIndex === STAGE_PRESETS.length - 1) {
            this.triggerEndGame('COMPLETE');
          } else {
            this.triggerEndGame('VICTORY');
          }
        });
      });
    }

    const btnSpell1 = document.getElementById('btn-spell-1');
    const btnSpell2 = document.getElementById('btn-spell-2');
    const btnSpell3 = document.getElementById('btn-spell-3');

    const clearSpellHighlights = () => {
      if (btnSpell1) btnSpell1.classList.remove('highlight');
      if (btnSpell2) btnSpell2.classList.remove('highlight');
      if (btnSpell3) btnSpell3.classList.remove('highlight');
    };

    if (btnSpell1) {
      btnSpell1.addEventListener('click', () => {
        if (this.turnManager.getState() !== 'PLAYER_TURN' || !this.selectedCharacter || this.isGameOver) return;
        const char = this.selectedCharacter;
        const spell = char.spells[0];
        let cost = spell ? spell.cost : 99;
        if (!char.isEnemy && this.activeRunes.includes('mp_accel')) {
          cost = Math.max(1, cost - 1);
        }
        const canUseSpell = spell && char.mp >= cost && char.ap > 0 && !char.hasAttackedThisTurn;
        if (!canUseSpell) return;

        this.selectedSpellIndex = 0;
        this.isSpellMode = true; // Force true when clicking specific spell
        this.isMovementMode = false;
        this.isAttackMode = false;
        this.isDirectionSelectMode = false;
        
        if (btnMove) btnMove.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');
        if (btnAttack) btnAttack.classList.remove('highlight');
        clearSpellHighlights();

        if (this.isSpellMode) {
          btnSpell1.classList.add('highlight');
        }
      });
    }

    if (btnSpell2) {
      btnSpell2.addEventListener('click', () => {
        if (this.turnManager.getState() !== 'PLAYER_TURN' || !this.selectedCharacter || this.isGameOver) return;
        const char = this.selectedCharacter;
        const spell = char.spells[1];
        let cost = spell ? spell.cost : 99;
        if (!char.isEnemy && this.activeRunes.includes('mp_accel')) {
          cost = Math.max(1, cost - 1);
        }
        const canUseSpell = spell && char.mp >= cost && char.ap > 0 && !char.hasAttackedThisTurn;
        if (!canUseSpell) return;

        this.selectedSpellIndex = 1;
        this.isSpellMode = true;
        this.isMovementMode = false;
        this.isAttackMode = false;
        this.isDirectionSelectMode = false;
        
        if (btnMove) btnMove.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');
        if (btnAttack) btnAttack.classList.remove('highlight');
        clearSpellHighlights();

        if (this.isSpellMode) {
          btnSpell2.classList.add('highlight');
        }
      });
    }

    if (btnSpell3) {
      btnSpell3.addEventListener('click', () => {
        if (this.turnManager.getState() !== 'PLAYER_TURN' || !this.selectedCharacter || this.isGameOver) return;
        const char = this.selectedCharacter;
        const spell = char.spells[2];
        let cost = spell ? spell.cost : 99;
        if (!char.isEnemy && this.activeRunes.includes('mp_accel')) {
          cost = Math.max(1, cost - 1);
        }
        const canUseSpell = spell && char.mp >= cost && char.ap > 0 && !char.hasAttackedThisTurn;
        if (!canUseSpell) return;

        this.selectedSpellIndex = 2;
        this.isSpellMode = true;
        this.isMovementMode = false;
        this.isAttackMode = false;
        this.isDirectionSelectMode = false;
        
        if (btnMove) btnMove.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');
        if (btnAttack) btnAttack.classList.remove('highlight');
        clearSpellHighlights();

        if (this.isSpellMode) {
          btnSpell3.classList.add('highlight');
        }
      });
    }

    if (btnMove) {
      btnMove.addEventListener('click', () => {
        if (this.turnManager.getState() !== 'PLAYER_TURN' || !this.selectedCharacter || this.selectedCharacter.hasMovedThisTurn || this.isGameOver) return;
        this.isMovementMode = !this.isMovementMode;
        this.isAttackMode = false;
        this.isSpellMode = false;
        this.isDirectionSelectMode = false;
        
        if (btnAttack) btnAttack.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');
        clearSpellHighlights();

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
        this.isSpellMode = false;
        this.isPostMoveDirectionSelect = false;

        if (btnMove) btnMove.classList.remove('highlight');
        if (btnAttack) btnAttack.classList.remove('highlight');
        clearSpellHighlights();

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
        this.isSpellMode = false;
        this.isDirectionSelectMode = false;
        
        if (btnMove) btnMove.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');
        clearSpellHighlights();

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
        this.selectedCharacter.ap = 0;
        this.selectedCharacter.hasMovedThisTurn = true;
        this.selectedCharacter.hasAttackedThisTurn = true; 
        this.isMovementMode = false;
        this.isAttackMode = false;
        this.isSpellMode = false;
        this.isDirectionSelectMode = false;
        
        if (btnMove) btnMove.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');
        if (btnAttack) btnAttack.classList.remove('highlight');
        clearSpellHighlights();
        
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
        this.isSpellMode = false;
        this.isDirectionSelectMode = false;
        if (btnMove) btnMove.classList.remove('highlight');
        if (btnTurn) btnTurn.classList.remove('highlight');
        if (btnAttack) btnAttack.classList.remove('highlight');
        clearSpellHighlights();
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

          // Change state limit (Force 0 to disable turn limits)
          this.turnTimeLimit = 0;

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

    const btnNext = document.getElementById('btn-next-stage');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const overlay = document.getElementById('stage-clear-overlay');
        if (overlay) overlay.classList.add('hidden');
        
        this.isGameOver = false;

        if (this.endgameResult === 'VICTORY') {
          if (this.isRuneModeEnabled) {
            this.showRuneSelectionModal(() => {
              this.openAcademyModal();
            });
          } else {
            this.openAcademyModal();
          }
        } else if (this.endgameResult === 'COMPLETE') {
          this.resetPermanentGrowth();
          this.loadStage(0);
        } else {
          this.loadStage(this.currentStageIndex);
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
    // 1. Drag Panning check with Left-Click
    if (pointer.isDown && !pointer.rightButtonDown()) {
      const dist = Phaser.Math.Distance.Between(this.startPointerX, this.startPointerY, pointer.x, pointer.y);
      if (dist > 6) {
        this.isDraggingCamera = true;
        this.isDragModeActive = true;
      }
    }

    if (this.isDraggingCamera) {
      const zoom = this.cameras.main.zoom;
      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;

      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;

      this.cameras.main.scrollX = this.cameras.main.scrollX - dx / zoom;
      this.cameras.main.scrollY = this.cameras.main.scrollY - dy / zoom;

      // Keep dynamic scroll clamping operational
      const maxScrollX = 300 + (this.gridWidth - 8) * 45;
      const maxScrollY = 250 + (this.gridHeight - 8) * 30;
      this.cameras.main.scrollX = Phaser.Math.Clamp(this.cameras.main.scrollX, -maxScrollX, maxScrollX);
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY, -maxScrollY, maxScrollY);
      return;
    }

    // Realtime orientation hover preview for Direction Selection Mode (Farland Tactics 360-degree sweep)
    if (this.isDirectionSelectMode && this.selectedCharacter && !this.selectedCharacter.isEnemy) {
      const char = this.selectedCharacter;
      const charScreenPos = this.gridToScreen(char.x, char.y);
      const dx = pointer.worldX - charScreenPos.x;
      const dy = pointer.worldY - (charScreenPos.y - 24); // Body offset

      let hoverDir: 'NE' | 'SE' | 'SW' | 'NW' = char.direction;
      if (dx > 0) {
        hoverDir = dy > 0 ? 'SE' : 'NE';
      } else {
        hoverDir = dy > 0 ? 'SW' : 'NW';
      }

      if (char.direction !== hoverDir) {
        char.direction = hoverDir;
        this.updateDirectionVisual(char);
        this.updateUIProfile(char);
      }
      this.hoverTile = null; 
      return;
    }

    const gridPos = this.screenToGrid(pointer.worldX, pointer.worldY);

    if (
      gridPos.x >= 0 && gridPos.x < this.gridWidth &&
      gridPos.y >= 0 && gridPos.y < this.gridHeight
    ) {
      this.hoverTile = gridPos;

      // (Realtime orientation preview during Attack Mode hover removed to prevent breaking established directions until clicking)


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
    const pointer = _pointer;
    const isRightClick = pointer.rightButtonDown() || pointer.button === 2;

    if (isRightClick) {
      // Right-Click is isolated strictly for Undo/Cancel actions!
      if (this.turnManager.getState() !== 'PLAYER_TURN' || this.isGameOver) return;
      
      // A. Right Click Undo handles (Cancel movement and restore coordinates before direction select)
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
      }
      return;
    }

    // Left-Click Down: Initialize click-vs-drag gesture thresholds
    this.isDraggingCamera = false;
    this.isDragModeActive = false;
    this.startPointerX = pointer.x;
    this.startPointerY = pointer.y;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.button === 0) { // Left Click Up
      const wasDragging = this.isDragModeActive;
      this.isDraggingCamera = false;
      this.isDragModeActive = false;

      // Trigger actual tactical tile click ONLY if the player was NOT dragging the viewport
      if (!wasDragging) {
        this.executeActualTileClick();
      }
    }
  }

  private executeActualTileClick() {
    if (this.turnManager.getState() !== 'PLAYER_TURN' || this.isGameOver) return;

    // A. Spell Casting execution click
    if (this.isSpellMode && this.selectedCharacter && !this.selectedCharacter.isEnemy) {
      if (this.hoverTile && this.isCoordSpellRange(this.selectedCharacter, this.hoverTile.x, this.hoverTile.y)) {
        const attacker = this.selectedCharacter;
        const targetTile = this.hoverTile;

        this.isSpellMode = false;
        const btnSpell1 = document.getElementById('btn-spell-1');
        const btnSpell2 = document.getElementById('btn-spell-2');
        if (btnSpell1) btnSpell1.classList.remove('highlight');
        if (btnSpell2) btnSpell2.classList.remove('highlight');

        this.executeSpell(attacker, targetTile);
        return;
      }
    }

    // Commitment check for Direction Select Mode (Left click completes direction selection)
    if (this.isDirectionSelectMode && this.selectedCharacter && !this.selectedCharacter.isEnemy) {
      const char = this.selectedCharacter;
      this.isDirectionSelectMode = false;

      const btnTurn = document.getElementById('btn-turn');
      if (btnTurn) btnTurn.classList.remove('highlight');

      if (this.isPostMoveDirectionSelect) {
        this.isPostMoveDirectionSelect = false;
        // Auto transition to attack mode after moving completes
        this.isAttackMode = true;
        const btnAttack = document.getElementById('btn-attack');
        if (btnAttack) btnAttack.classList.add('highlight');
        this.showDialogue(char.name, '공격 대상을 선택해라.', 1500);
      } else {
        this.checkCharacterTurnEnd(char);
      }

      this.updateDirectionVisual(char);
      this.updateActionButtonStates();
      return;
    }

    if (!this.hoverTile) return;

    // C. UX Fix: Clicking a living ally character ALWAYS switches selection immediately
    const clickedAlly = this.characters.find(
      c => !c.isEnemy && c.x === this.hoverTile!.x && c.y === this.hoverTile!.y && c.hp > 0
    );

    if (clickedAlly && !this.isDirectionSelectMode) {
      this.selectCharacter(clickedAlly);
      return;
    }

    // D-1. Auto-Chain Attack check when clicking an enemy in Move/Direction modes
    if ((this.isMovementMode || this.isDirectionSelectMode) && this.selectedCharacter && !this.selectedCharacter.isEnemy) {
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

    if (!this.selectedCharacter) return;

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

  private executeSpell(attacker: Character, targetTile: Point, spellIndex: number = this.selectedSpellIndex) {
    const spell = attacker.spells[spellIndex];
    if (!spell) return;

    this.previousState = this.turnManager.getState();
    this.turnManager.setState('ANIMATING');

    // Consume MP & AP (Consume AP/Cost based on spell cost)
    let finalCost = spell.cost;
    if (!attacker.isEnemy && this.activeRunes.includes('mp_accel')) {
      finalCost = Math.max(1, finalCost - 1);
    }
    attacker.mp = Math.max(0, attacker.mp - finalCost);
    attacker.ap = Math.max(0, attacker.ap - finalCost);
    attacker.hasAttackedThisTurn = true;

    // Face targeting direction
    const dx = targetTile.x - attacker.x;
    const dy = targetTile.y - attacker.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      attacker.direction = dx > 0 ? 'SE' : 'NW';
    } else if (Math.abs(dy) > Math.abs(dx)) {
      attacker.direction = dy > 0 ? 'SW' : 'NE';
    }
    this.updateDirectionVisual(attacker);
    this.updateUIProfile(attacker);
    this.updateMiniHUDBar(attacker);

    // 1. Spawning gorgeous expanding Neon Magic Circle at the target center
    const targetPos = this.gridToScreen(targetTile.x, targetTile.y);
    const magicCircle = this.add.graphics();
    magicCircle.setPosition(targetPos.x, targetPos.y);
    magicCircle.setDepth(targetPos.y - 2);

    const isEnemy = attacker.isEnemy;
    const isHealing = spell.effectType === 'heal';
    const color = isHealing ? 0x10b981 : (isEnemy ? 0xf97316 : 0xcc33ff);

    magicCircle.lineStyle(2.5, color, 0.9);
    magicCircle.strokeEllipse(0, 0, 48, 24);
    magicCircle.lineStyle(1.5, color, 0.6);
    magicCircle.strokeEllipse(0, 0, 24, 12);
    
    magicCircle.beginPath();
    magicCircle.moveTo(-24, 0);
    magicCircle.lineTo(24, 0);
    magicCircle.moveTo(0, -12);
    magicCircle.lineTo(0, 12);
    magicCircle.strokePath();

    magicCircle.setScale(0);
    
    // Play spellcast dialogue
    this.showDialogue(attacker.name, `[스킬] ${spell.name}!`, 1500);

    this.tweens.add({
      targets: magicCircle,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: { start: 0.1, to: 1.0 },
      duration: 380 * this.animationSpeedMultiplier,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.executeSpellImpactFX(attacker, targetTile, magicCircle, spellIndex);
      }
    });
  }

  private executeSpellImpactFX(attacker: Character, targetTile: Point, magicCircle: Phaser.GameObjects.Graphics, spellIndex: number = this.selectedSpellIndex) {
    const spell = attacker.spells[spellIndex];
    if (!spell) return;

    const splashTiles: Point[] = [];
    const hx = targetTile.x;
    const hy = targetTile.y;

    if (spell.name === '종말의 유성') {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          splashTiles.push({ x: hx + dx, y: hy + dy });
        }
      }
    } else if (spell.type === 'AoE') {
      splashTiles.push({ x: hx, y: hy });
      splashTiles.push({ x: hx + 1, y: hy });
      splashTiles.push({ x: hx - 1, y: hy });
      splashTiles.push({ x: hx, y: hy + 1 });
      splashTiles.push({ x: hx, y: hy - 1 });
    } else if (spell.type === 'Line') {
      const dx = hx - attacker.x;
      const dy = hy - attacker.y;
      if (dx === 0 || dy === 0) {
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);
        let cx = attacker.x + stepX;
        let cy = attacker.y + stepY;
        while (true) {
          splashTiles.push({ x: cx, y: cy });
          if (cx === hx && cy === hy) break;
          cx += stepX;
          cy += stepY;
        }
      } else {
        splashTiles.push({ x: hx, y: hy });
      }
    } else {
      splashTiles.push({ x: hx, y: hy });
    }

    const isHealing = spell && (spell.effectType === 'heal' || spell.name === '신의 수호');
    
    // 2. Play beautiful custom signature spell visual fx on each target cell
    if (spell && spell.name === '구원의 성가') {
      this.characters.forEach(c => {
        if (c.hp > 0 && c.isEnemy === attacker.isEnemy) {
          const scr = this.gridToScreen(c.x, c.y);
          this.createHealSpellFX(scr.x, scr.y);
        }
      });
    } else {
      splashTiles.forEach(tile => {
        if (tile.x >= 0 && tile.x < this.gridWidth && tile.y >= 0 && tile.y < this.gridHeight) {
          const cellPos = this.gridToScreen(tile.x, tile.y);
          
          if (spell && spell.name === '신의 수호') {
            this.createHealSpellFX(cellPos.x, cellPos.y);
          } else if (spell && spell.name === '종말의 유성') {
            this.createFireSpellFX(cellPos.x, cellPos.y);
          } else if (spell && spell.name === '폭풍의 벼락 화살') {
            this.createLightningSpellFX(cellPos.x, cellPos.y);
          } else if (isHealing) {
            this.createHealSpellFX(cellPos.x, cellPos.y);
          } else if (spell && spell.debuffType === 'burn') {
            this.createFireSpellFX(cellPos.x, cellPos.y);
          } else if (spell && spell.debuffType === 'stun') {
            this.createLightningSpellFX(cellPos.x, cellPos.y);
          } else if (spell && spell.debuffType === 'poison') {
            this.createPoisonSpellFX(cellPos.x, cellPos.y);
          } else if (spell && spell.name === '윈드 피어스') {
            const dx = Math.sign(tile.x - attacker.x);
            const dy = Math.sign(tile.y - attacker.y);
            this.createWindSpellFX(cellPos.x, cellPos.y, dx, dy);
          } else if (spell && spell.name === '프로스트 레이') {
            this.createIceSpellFX(cellPos.x, cellPos.y);
          } else {
            this.createLightningSpellFX(cellPos.x, cellPos.y);
          }
        }
      });
    }

    // 3. Process target damage (Friendly Fire check / Healing filter check)
    let targets = this.characters.filter(c => 
      c.hp > 0 && 
      (isHealing ? (c.isEnemy === attacker.isEnemy) : (c.isEnemy !== attacker.isEnemy)) && 
      splashTiles.some(t => t.x === c.x && t.y === c.y)
    );

    if (spell && spell.name === '구원의 성가') {
      targets = this.characters.filter(c => c.hp > 0 && c.isEnemy === attacker.isEnemy);
    }

    targets.forEach(defender => {
      if (isHealing) {
        if (spell.name === '신의 수호') {
          defender.isInvincible = true;
          const stText = this.add.text(defender.gameObject.x, defender.gameObject.y - 110, '🛡️ 신의 수호 (무적)', {
            fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
            fontSize: '13px',
            color: '#facc15',
            stroke: '#000000',
            strokeThickness: 3
          }).setOrigin(0.5).setDepth(defender.gameObject.depth + 102);

          this.tweens.add({
            targets: stText,
            y: stText.y - 20,
            alpha: 0,
            duration: 1200,
            onComplete: () => stText.destroy()
          });

          const shieldGlow = this.add.ellipse(defender.gameObject.x, defender.gameObject.y, 74, 37, 0xfacc15, 0.45);
          shieldGlow.setDepth(defender.gameObject.depth - 1);
          shieldGlow.scaleY = 0.5;
          this.tweens.add({
            targets: shieldGlow,
            scaleX: 1.45,
            scaleY: 0.72,
            alpha: 0,
            duration: 800,
            onComplete: () => shieldGlow.destroy()
          });
          return;
        }

        if (spell.name === '구원의 성가') {
          const healAmount = Math.floor(defender.maxHp * 0.50);
          defender.hp = Math.min(defender.maxHp, defender.hp + healAmount);
          defender.burnTurns = 0;
          defender.stunTurns = 0;
          defender.poisonTurns = 0;

          this.drawPedestal(defender);
          this.updateMiniHUDBar(defender);
          if (this.selectedCharacter === defender && !defender.isEnemy) {
            this.updateUIProfile(defender);
          }

          this.showDamagePopup(defender.gameObject, -healAmount, false, '#10b981');
          
          const cleanText = this.add.text(defender.gameObject.x, defender.gameObject.y - 110, '👼 구원 & 정화!', {
            fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
            fontSize: '13px',
            color: '#60a5fa',
            stroke: '#000000',
            strokeThickness: 3
          }).setOrigin(0.5).setDepth(defender.gameObject.depth + 102);

          this.tweens.add({
            targets: cleanText,
            y: cleanText.y - 20,
            alpha: 0,
            duration: 1200,
            onComplete: () => cleanText.destroy()
          });

          this.tweens.add({
            targets: defender.gameObject,
            scaleY: 1.15,
            scaleX: 0.88,
            duration: 80 * this.animationSpeedMultiplier,
            yoyo: true,
            repeat: 1
          });
          return;
        }

        // Standard Heal logic
        const healPercent = spell.name === '그레이스 에어' ? 0.25 : 0.40;
        const healAmount = Math.floor(defender.maxHp * healPercent);
        defender.hp = Math.min(defender.maxHp, defender.hp + healAmount);
        this.updateMiniHUDBar(defender);

        if (this.selectedCharacter === defender && !defender.isEnemy) {
          this.updateUIProfile(defender);
        }

        this.showDamagePopup(defender.gameObject, -healAmount, false, '#10b981');

        const effectText = this.add.text(defender.gameObject.x, defender.gameObject.y - 105, '💚 치유!', {
          fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
          fontSize: '14px',
          color: '#10b981',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(defender.gameObject.depth + 101);

        this.tweens.add({
          targets: effectText,
          y: effectText.y - 20,
          alpha: 0,
          duration: 1000,
          onComplete: () => effectText.destroy()
        });

        this.tweens.add({
          targets: defender.gameObject,
          scaleY: 1.15,
          scaleX: 0.88,
          duration: 80 * this.animationSpeedMultiplier,
          yoyo: true,
          repeat: 1
        });
        return;
      }

      if (spell.name === '암습의 난무') {
        let tx = defender.x;
        let ty = defender.y;
        if (defender.direction === 'NE') tx -= 1;
        else if (defender.direction === 'SE') ty -= 1;
        else if (defender.direction === 'SW') tx += 1;
        else if (defender.direction === 'NW') ty += 1;

        const isBlocked = tx < 0 || tx >= this.gridWidth || ty < 0 || ty >= this.gridHeight ||
                          this.obstacleGrid[ty][tx] ||
                          (this.cliffGrid[ty][tx] && !(this.bridgeGrid[ty] && this.bridgeGrid[ty][tx]));
        
        if (!isBlocked) {
          attacker.x = tx;
          attacker.y = ty;
        }

        const screenPos = this.gridToScreen(attacker.x, attacker.y);
        attacker.gameObject.setPosition(screenPos.x, screenPos.y);
        attacker.gameObject.setDepth(screenPos.y);
        this.drawPedestal(attacker);

        const baseDmg = 52 + (attacker.bonusDmg || 0);
        let backDmg = Math.floor(baseDmg * (0.9 + Math.random() * 0.2));
        backDmg = Math.floor(backDmg * 1.5); // Always Back Attack!

        if (defender.isInvincible) {
          backDmg = 0;
        }

        defender.hp = Math.max(0, defender.hp - backDmg);
        this.updateMiniHUDBar(defender);
        if (this.selectedCharacter === defender && !defender.isEnemy) {
          this.updateUIProfile(defender);
        }

        if (defender.isInvincible) {
          const blockText = this.add.text(defender.gameObject.x, defender.gameObject.y - 110, '🛡️ 무적!', {
            fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
            fontSize: '14px',
            color: '#facc15',
            stroke: '#000000',
            strokeThickness: 3.5
          }).setOrigin(0.5).setDepth(defender.gameObject.depth + 102);

          this.tweens.add({
            targets: blockText,
            y: blockText.y - 20,
            alpha: 0,
            duration: 1000,
            onComplete: () => blockText.destroy()
          });
        } else {
          this.showDamagePopup(defender.gameObject, backDmg, true, '#fbbf24');
          this.cameras.main.shake(150, 0.008);
        }
        
        if (defender.hp <= 0) {
          this.handleDeath(defender);
        }
        return;
      }

      const baseDamage = attacker.isEnemy ? 25 : (36 + (attacker.bonusDmg || 0));
      let finalDamage = Math.floor(baseDamage * (0.9 + Math.random() * 0.2));

      // iron_will: 40% dmg reduction for ally under 30% HP
      if (!defender.isEnemy && this.activeRunes.includes('iron_will') && (defender.hp / defender.maxHp <= 0.3)) {
        finalDamage = Math.floor(finalDamage * 0.6);
      }

      if (defender.isInvincible) {
        finalDamage = 0;
      }

      if (defender.isEnemy && defender.name.includes('[BOSS]') && defender.hp / defender.maxHp <= 0.5) {
        finalDamage = Math.floor(finalDamage * 0.7);
      }

      defender.hp = Math.max(0, defender.hp - finalDamage);
      this.updateMiniHUDBar(defender);

      if (this.selectedCharacter === defender && !defender.isEnemy) {
        this.updateUIProfile(defender);
      }

      this.showDamagePopup(defender.gameObject, finalDamage, false);

      // Trigger magic status effects based on spell config debuffType
      if (spell && spell.debuffType === 'burn') {
        defender.burnTurns = 3;
        this.drawPedestal(defender);

        const effectText = this.add.text(defender.gameObject.x, defender.gameObject.y - 105, '🔥 화상!', {
          fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
          fontSize: '14px',
          color: '#f97316',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(defender.gameObject.depth + 101);

        this.tweens.add({
          targets: effectText,
          y: effectText.y - 20,
          alpha: 0,
          duration: 1000,
          onComplete: () => effectText.destroy()
        });
      } else if (spell && spell.debuffType === 'stun') {
        defender.stunTurns = 1;
        this.drawPedestal(defender);

        const effectText = this.add.text(defender.gameObject.x, defender.gameObject.y - 105, '⚡ 기절!', {
          fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
          fontSize: '14px',
          color: '#00f3ff',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(defender.gameObject.depth + 101);

        this.tweens.add({
          targets: effectText,
          y: effectText.y - 20,
          alpha: 0,
          duration: 1000,
          onComplete: () => effectText.destroy()
        });
      } else if (spell && spell.debuffType === 'poison') {
        defender.poisonTurns = 3;
        this.drawPedestal(defender);

        const effectText = this.add.text(defender.gameObject.x, defender.gameObject.y - 105, '🤢 중독!', {
          fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
          fontSize: '14px',
          color: '#22c55e',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(defender.gameObject.depth + 101);

        this.tweens.add({
          targets: effectText,
          y: effectText.y - 20,
          alpha: 0,
          duration: 1000,
          onComplete: () => effectText.destroy()
        });
      }

      // toxic_breath: inflict 2 turns poison on spell hits
      if (!attacker.isEnemy && this.activeRunes.includes('toxic_breath') && finalDamage > 0) {
        defender.poisonTurns = Math.max(defender.poisonTurns, 2);
        this.drawPedestal(defender);
      }

      this.tweens.add({
        targets: defender.gameObject,
        x: defender.gameObject.x + (attacker.x < defender.x ? 6 : -6),
        duration: 50 * this.animationSpeedMultiplier,
        yoyo: true,
        repeat: 2,
        onStart: () => {
          this.cameras.main.flash(50 * this.animationSpeedMultiplier, 239, 68, 68, false);
        }
      });

      if (defender.hp <= 0) {
        this.handleDeath(defender);
      }
    });

    // 4. Wrap up magic state
    this.time.delayedCall(450 * this.animationSpeedMultiplier, () => {
      this.tweens.add({
        targets: magicCircle,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 150 * this.animationSpeedMultiplier,
        onComplete: () => {
          magicCircle.destroy();
        }
      });

      this.turnManager.setState(this.previousState);
      this.checkCharacterTurnEnd(attacker);
      this.updateActionButtonStates();
    });
  }

  private checkCharacterTurnEnd(char: Character) {
    const isFinished = char.ap <= 0 || char.hasAttackedThisTurn || (char.hasMovedThisTurn && char.hasAttackedThisTurn);

    if (isFinished && !this.isDirectionSelectMode) {
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

    const runStep = (index: number) => {
      if (index >= moveSteps.length) {
        this.turnManager.setState(this.previousState);
        onComplete();
        return;
      }

      const step = moveSteps[index];
      const prev = path[index];
      const screenPos = this.gridToScreen(step.x, step.y);

      // Force isometric direction alignment immediately BEFORE the movement step tween launches
      const dx = step.x - prev.x;
      const dy = step.y - prev.y;
      if (dx > 0) char.direction = 'SE';
      else if (dy > 0) char.direction = 'SW';
      else if (dx < 0) char.direction = 'NW';
      else if (dy < 0) char.direction = 'NE';
      
      this.updateDirectionVisual(char);

      this.tweens.add({
        targets: char.gameObject,
        x: screenPos.x,
        y: screenPos.y,
        duration: 250 * this.animationSpeedMultiplier,
        ease: 'Linear',
        onComplete: () => {
          char.x = step.x;
          char.y = step.y;
          if (!char.isEnemy) {
            this.tryPickupFieldItem(char);
          }
          char.gameObject.setDepth(screenPos.y + 10);
          runStep(index + 1);
        }
      });
    };

    runStep(0);
  }

  private tryPickupFieldItem(char: Character) {
    const idx = this.fieldItems.findIndex(f => f.x === char.x && f.y === char.y);
    if (idx === -1) return;
    const matched = this.fieldItems[idx];
    this.sharedInventory.push(matched.item);
    matched.gameObject.destroy();
    this.fieldItems.splice(idx, 1);
    this.showDialogue(char.name, `[${matched.item.name}] 획득!`, 1200);
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
      attacker.direction = dx > 0 ? 'SE' : 'NW';
    } else if (Math.abs(dy) > Math.abs(dx)) {
      attacker.direction = dy > 0 ? 'SW' : 'NE';
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
          duration: 150 * this.animationSpeedMultiplier,
          ease: 'Quad.easeOut'
        },
        {
          x: startPos.x,
          y: startPos.y,
          duration: 200 * this.animationSpeedMultiplier,
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
      duration: 350 * this.animationSpeedMultiplier,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Expansion explosion splash
        this.tweens.add({
          targets: proj,
          scaleX: 3,
          scaleY: 3,
          alpha: 0,
          duration: 150 * this.animationSpeedMultiplier,
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

    let damage = attacker.isEnemy ? Phaser.Math.Between(10, 16) : (Phaser.Math.Between(18, 26) + (attacker.bonusDmg || 0));
    if (attacker.isEnemy) {
      const chapterNum = Math.floor(this.currentStageIndex / 3) + 1;
      const stageNumWithinChapter = (this.currentStageIndex % 3) + 1;
      const difficultyMultiplier = 1.0 + (chapterNum - 1) * 0.25 + (stageNumWithinChapter - 1) * 0.15;
      damage = Math.floor(damage * difficultyMultiplier);
    }
    if (isBackAttack) {
      damage = Math.floor(damage * 1.5);
    }

    if (defender.isEnemy && defender.name.includes('[BOSS]') && defender.hp / defender.maxHp <= 0.5) {
      damage = Math.floor(damage * 0.7);
    }

    // iron_will: 40% dmg reduction for ally under 30% HP
    if (!defender.isEnemy && this.activeRunes.includes('iron_will') && (defender.hp / defender.maxHp <= 0.3)) {
      damage = Math.floor(damage * 0.6);
    }

    const wasInvincible = !!defender.isInvincible;
    if (wasInvincible) {
      damage = 0;
    }

    defender.hp = Math.max(0, defender.hp - damage);
    this.updateMiniHUDBar(defender);

    if (this.selectedCharacter === defender && !defender.isEnemy) {
      this.updateUIProfile(defender);
    }

    // vamp: 20% lifesteal on physical attack
    if (!attacker.isEnemy && this.activeRunes.includes('vamp') && damage > 0) {
      const healAmt = Math.floor(damage * 0.2);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
      this.updateMiniHUDBar(attacker);
      this.showDamagePopup(attacker.gameObject, -healAmt, false, '#10b981');
    }

    // fire_touch: inflict 2 turns burn on physical hit
    if (!attacker.isEnemy && this.activeRunes.includes('fire_touch') && damage > 0) {
      defender.burnTurns = Math.max(defender.burnTurns, 2);
      this.drawPedestal(defender);
    }

    if (wasInvincible) {
      const blockText = this.add.text(defender.gameObject.x, defender.gameObject.y - 110, '🛡️ 무적!', {
        fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
        fontSize: '14px',
        color: '#facc15',
        stroke: '#000000',
        strokeThickness: 3.5
      }).setOrigin(0.5).setDepth(defender.gameObject.depth + 102);

      this.tweens.add({
        targets: blockText,
        y: blockText.y - 20,
        alpha: 0,
        duration: 1000,
        onComplete: () => blockText.destroy()
      });
    } else {
      this.showDamagePopup(defender.gameObject, damage, isBackAttack);
    }

    this.tweens.add({
      targets: defender.gameObject,
      x: defender.gameObject.x + (attacker.x < defender.x ? 8 : -8),
      y: defender.gameObject.y + (attacker.y < defender.y ? 4 : -4),
      duration: 50 * this.animationSpeedMultiplier,
      yoyo: true,
      repeat: 2,
      onStart: () => {
        this.cameras.main.flash(50 * this.animationSpeedMultiplier, 239, 68, 68, false);
      }
    });

    if (defender.hp <= 0) {
      this.handleDeath(defender);
    }
  }

  private showDamagePopup(target: Phaser.GameObjects.Container, damage: number, isBackAttack = false, customColor?: string) {
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
    let textColor = '#ef4444';
    if (customColor) {
      textColor = customColor;
    } else if (isBackAttack) {
      textColor = '#fbbf24';
    }

    const popupText = this.add.text(target.x, target.y - 65, `-${damage}`, {
      fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
      fontSize: isBackAttack ? '25px' : '22px',
      color: textColor,
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
    if (!char.isEnemy) {
      this.stageRetreatedCount++;
    }
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
      if (this.currentStageIndex === STAGE_PRESETS.length - 1) {
        this.triggerEndGame('COMPLETE');
      } else {
        this.triggerEndGame('VICTORY');
      }
    } else if (livingPlayers.length === 0) {
      this.triggerEndGame('DEFEAT');
    }
  }

  private triggerEndGame(result: 'VICTORY' | 'DEFEAT' | 'COMPLETE') {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.clearTurnTimer();
    this.updateActionButtonStates();
    this.endgameResult = result;

    const overlay = document.getElementById('stage-clear-overlay');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');
    const btn = document.getElementById('btn-next-stage');

    if (overlay && title && desc && btn) {
      overlay.classList.remove('hidden');
      
      if (result === 'VICTORY') {
        const maxTurns = this.currentStageIndex < 3 ? 8 : (this.currentStageIndex < 6 ? 10 : (this.currentStageIndex < 9 ? 12 : 15));
        const isTimeStar = this.turnManager.getTurnNumber() <= maxTurns;
        const isGimmickStar = (this.currentStageIndex % 2 === 0) ? !this.stageLavaDamaged : (this.stageRetreatedCount === 0);
        
        let starCount = 1;
        if (isTimeStar) starCount++;
        if (isGimmickStar) starCount++;
        
        this.trainingSpheres += (1 + starCount);

        title.innerText = 'STAGE CLEAR';
        title.style.color = '#10b981';
        title.style.textShadow = '0 0 15px rgba(16, 185, 129, 0.6)';

        const starIcons = '★'.repeat(starCount) + '☆'.repeat(3 - starCount);
        const maxTurnsText = `${maxTurns}턴 내 돌파`;
        const gimmickText = (this.currentStageIndex % 2 === 0) ? '용암 회피' : '무퇴각 완승';

        desc.innerHTML = `<span style="font-family: DungGeunMo, monospace; font-size: 1.15rem; color: #fbbf24;">${STAGE_PRESETS[this.currentStageIndex].name} 클리어!</span><br><br>` +
                        `<span style="color: #e2e8f0; font-size: 0.9rem;">달성 평가: <strong style="color: #facc15; font-size: 1.1rem; text-shadow: 0 0 6px rgba(250,204,21,0.5);">${starIcons}</strong> (${starCount}/3성)</span><br>` +
                        `<span style="color: #94a3b8; font-size: 0.78rem; text-align: left; display: inline-block; margin-top: 5px;">` +
                        `• 스테이지 클리어: <span style="color: #34d399;">🌟 성공</span><br>` +
                        `• ${maxTurnsText}: ${isTimeStar ? '<span style="color: #34d399;">🌟 성공</span>' : '<span style="color: #f87171;">❌ 실패</span>'} (소요: ${this.turnManager.getTurnNumber()}턴)<br>` +
                        `• ${gimmickText}: ${isGimmickStar ? '<span style="color: #34d399;">🌟 성공</span>' : '<span style="color: #f87171;">❌ 실패</span>'}<br>` +
                        `</span><br><br>` +
                        `<span style="color: #60a5fa; font-weight: bold; font-size: 0.85rem;">보상으로 훈련 스피어 🌟 ${1 + starCount}개를 획득했습니다!</span>`;
        btn.innerText = '🛡️ 전술 훈련소로';
      } else if (result === 'COMPLETE') {
        title.innerText = 'GAME CLEAR!';
        title.style.color = '#facc15';
        title.style.textShadow = '0 0 20px rgba(250, 204, 21, 0.7)';
        desc.innerText = '축하합니다! 고블린 주술사의 요새를 완파하고\n모든 모험을 성공적으로 마쳤습니다!';
        btn.innerText = '🔄 처음부터 다시하기';
      } else if (result === 'DEFEAT') {
        title.innerText = 'DEFEAT';
        title.style.color = '#ef4444';
        title.style.textShadow = '0 0 15px rgba(239, 68, 68, 0.6)';
        desc.innerText = '아군이 모두 쓰러졌습니다.\n전략을 재정비하여 다시 도전하세요.';
        btn.innerText = '스테이지 재도전';
      }
    }

    this.showDialogue('SYSTEM', `전투가 종료되었습니다. 결과: ${result}`, 3500);
  }

  private showRuneSelectionModal(onComplete: () => void) {
    const overlay = document.getElementById('rune-selection-overlay');
    const container = document.getElementById('rune-cards-container');
    if (!overlay || !container) {
      onComplete();
      return;
    }

    container.innerHTML = '';
    overlay.classList.remove('hidden');

    const runesList = [
      { id: 'vamp', name: '🩸 흡혈의 문양', desc: '물리 공격 시 준 대미지의 20%를 아군의 HP로 즉시 흡수합니다.', icon: '🩸' },
      { id: 'mp_accel', name: '⚡ 마나 가속', desc: '모든 아군 마법 스펠의 소모 MP가 1 감소합니다. (최소 1)', icon: '⚡' },
      { id: 'iron_will', name: '🛡️ 불굴의 의지', desc: 'HP가 30% 이하일 때 받는 모든 피해가 40% 감소합니다.', icon: '🛡️' },
      { id: 'wind_walk', name: '👟 바람의 걸음', desc: '아군 전체의 기본 이동 범위가 1칸 영구히 늘어납니다.', icon: '👟' },
      { id: 'fire_touch', name: '🔥 화염 인챈트', desc: '물리 일반 공격 시 피격자에게 2턴간 화상 디버프를 부여합니다.', icon: '🔥' },
      { id: 'toxic_breath', name: '🤢 독무의 숨결', desc: '마법 주문 시전 시 피격자에게 2턴간 중독 디버프를 부여합니다.', icon: '🤢' }
    ];

    // Shuffle and pick 3 cards
    const shuffled = runesList.sort(() => 0.5 - Math.random());
    const selectedRunes = shuffled.slice(0, 3);

    selectedRunes.forEach(r => {
      const card = document.createElement('div');
      card.className = 'rune-card';
      card.innerHTML = `
        <div class="rune-icon">${r.icon}</div>
        <div class="rune-title" style="font-weight: bold; margin-bottom: 5px;">${r.name}</div>
        <div class="rune-desc" style="font-size: 0.74rem; color: #cbd5e1; line-height: 1.35; margin-top: 5px;">${r.desc}</div>
      `;

      card.addEventListener('click', () => {
        this.activeRunes.push(r.id);
        overlay.classList.add('hidden');
        this.showDialogue('SYSTEM', `[${r.name}] 룬을 획득하여 아군 전체에 영구 적용됩니다!`, 1800);
        onComplete();
      });

      container.appendChild(card);
    });
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

  private spawnBossMinion() {
    const borderPoints = [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 },
      { x: this.gridWidth - 2, y: 1 }, { x: 1, y: this.gridHeight - 2 }
    ];
    let spawnPt = borderPoints[0];
    for (let pt of borderPoints) {
      const isOccupied = this.characters.some(c => c.x === pt.x && c.y === pt.y && c.hp > 0);
      if (!isOccupied) {
        spawnPt = pt;
        break;
      }
    }

    const minionPreset = { type: 'gob_warrior', name: '요새 정예 수비병 [소환]', x: spawnPt.x, y: spawnPt.y };
    const spec = {
      isEnemy: true,
      maxHp: 90,
      maxAp: 3,
      maxMp: 0,
      moveRange: 4,
      minAttackRange: 1,
      maxAttackRange: 1,
      spriteKey: 'goblin_warrior',
      avatar: '🗡️',
      scale: 1.0,
      spells: []
    };

    const container = this.add.container(0, 0);
    container.add(this.add.ellipse(0, 0, 48, 24, 0x000000, 0.4));

    const glow = this.add.ellipse(0, 0, 68, 34, 0xf97316, 0.7).setVisible(false);
    container.add(glow);

    const sprite = this.add.image(0, -28, 'goblin').setScale(1.0).setOrigin(0.5, 0.95).setVisible(false);
    container.add(sprite);

    const pillar = this.add.graphics();
    container.add(pillar);

    const emblemStrokeColor = 0xf97316;
    const emblemBg = 0x450a0a;
    const emblem = this.add.circle(0, -24, 20, emblemBg).setStrokeStyle(2.5, emblemStrokeColor, 1);
    const text = this.add.text(0, -24, spec.avatar, { fontSize: '20px', fontFamily: 'Segoe UI Emoji, Arial' }).setOrigin(0.5);
    container.add(emblem);
    container.add(text);

    const dirGraphics = this.add.graphics();
    container.add(dirGraphics);

    const screenPos = this.gridToScreen(spawnPt.x, spawnPt.y);
    container.setPosition(screenPos.x, screenPos.y);

    const char: Character = {
      name: minionPreset.name,
      x: spawnPt.x,
      y: spawnPt.y,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      mp: 0,
      maxMp: 0,
      ap: 0,
      maxAp: spec.maxAp,
      avatar: spec.avatar,
      isEnemy: true,
      gameObject: container,
      moveRange: spec.moveRange,
      minAttackRange: spec.minAttackRange,
      maxAttackRange: spec.maxAttackRange,
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      bodyEmblem: emblem,
      bodyText: text,
      bodySprite: sprite,
      bodyParts: [pillar],
      glowRing: glow,
      direction: 'SE',
      dirGraphics: dirGraphics,
      skinType: 'gob_warrior',
      spells: [],
      burnTurns: 0,
      stunTurns: 0,
      poisonTurns: 0,
      bonusDmg: 0
    };

    this.drawPedestal(char);
    this.updateDirectionVisual(char);
    this.characters.push(char);

    const magicCircle = this.add.graphics();
    magicCircle.setDepth(container.depth + 1);
    magicCircle.lineStyle(2.5, 0xef4444, 0.8);
    magicCircle.strokeCircle(screenPos.x, screenPos.y, 35);
    magicCircle.scaleY = 0.5;

    this.tweens.add({
      targets: magicCircle,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 0.8,
      duration: 1000,
      onComplete: () => magicCircle.destroy()
    });

    for (let i = 0; i < 6; i++) {
      const line = this.add.graphics();
      line.lineStyle(1.5, 0xef4444, 0.9);
      line.lineBetween(screenPos.x + Phaser.Math.Between(-20, 20), screenPos.y + 40, screenPos.x + Phaser.Math.Between(-20, 20), screenPos.y - 80);
      this.tweens.add({
        targets: line,
        alpha: 0,
        y: line.y - 40,
        duration: 800,
        onComplete: () => line.destroy()
      });
    }

    this.showDialogue('부족장 그로그', '내 부하들아, 전장에 나서라!', 1500);
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
      const attemptBossSpecialSpell = (afterBossCallback: () => void) => {
        if (this.isGameOver || enemy.hp <= 0 || !enemy.name.includes('[BOSS]')) {
          afterBossCallback();
          return;
        }

        const distToPlayer = Math.abs(enemy.x - closestPlayer.x) + Math.abs(enemy.y - closestPlayer.y);

        // Skill 1: Chieftain's Wrath (Earthquake Smash) - Cost: 3 AP, 3 MP. Target in 3-tile range.
        if (enemy.ap >= 3 && enemy.mp >= 3 && distToPlayer <= 3) {
          enemy.ap -= 3;
          enemy.mp -= 3;
          enemy.hasAttackedThisTurn = true;

          this.showDialogue(enemy.name, '⚡ 군주의 진노! 지면 강타!', 1500);

          const targetCoords = [
            { x: closestPlayer.x, y: closestPlayer.y },
            { x: closestPlayer.x + 1, y: closestPlayer.y },
            { x: closestPlayer.x - 1, y: closestPlayer.y },
            { x: closestPlayer.x, y: closestPlayer.y + 1 },
            { x: closestPlayer.x, y: closestPlayer.y - 1 }
          ];

          this.cameras.main.shake(300, 0.012);

          targetCoords.forEach(pt => {
            if (pt.x >= 0 && pt.x < this.gridWidth && pt.y >= 0 && pt.y < this.gridHeight) {
              const scr = this.gridToScreen(pt.x, pt.y);
              
              const ring = this.add.graphics();
              ring.lineStyle(2.5, 0xef4444, 0.95);
              ring.strokeCircle(scr.x, scr.y, 10);
              ring.scaleY = 0.5;

              this.tweens.add({
                targets: ring,
                scaleX: 3.5,
                scaleY: 1.75,
                alpha: 0,
                duration: 600,
                onComplete: () => ring.destroy()
              });

              const hitPlayer = this.characters.find(c => c.x === pt.x && c.y === pt.y && !c.isEnemy && c.hp > 0);
              if (hitPlayer) {
                const dmg = Phaser.Math.Between(35, 45);
                hitPlayer.hp = Math.max(0, hitPlayer.hp - dmg);
                hitPlayer.stunTurns = Math.max(hitPlayer.stunTurns, 1);

                this.drawPedestal(hitPlayer);
                this.updateMiniHUDBar(hitPlayer);
                if (this.selectedCharacter === hitPlayer) {
                  this.updateUIProfile(hitPlayer);
                }

                this.showDamagePopup(hitPlayer.gameObject, dmg, false, '#ef4444');

                const stText = this.add.text(hitPlayer.gameObject.x, hitPlayer.gameObject.y - 120, '⚡ 기절 마비!', {
                  fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
                  fontSize: '13px',
                  color: '#38bdf8',
                  stroke: '#000000',
                  strokeThickness: 3.5
                }).setOrigin(0.5).setDepth(hitPlayer.gameObject.depth + 102);

                this.tweens.add({
                  targets: stText,
                  y: stText.y - 20,
                  alpha: 0,
                  duration: 1000,
                  onComplete: () => stText.destroy()
                });

                if (hitPlayer.hp <= 0) {
                  this.handleDeath(hitPlayer);
                }
              }
            }
          });

          this.time.delayedCall(1200 * this.animationSpeedMultiplier, () => {
            afterBossCallback();
          });
          return;
        }

        // Skill 2: Chieftain's Call (Roar & Spawn) - Cost: 2 AP, 2 MP. Target in 3.5 range.
        if (enemy.ap >= 2 && enemy.mp >= 2 && distToPlayer <= 3.5) {
          enemy.ap -= 2;
          enemy.mp -= 2;

          this.showDialogue(enemy.name, '😈 군주의 포효! 대지를 부른다!', 1500);

          const bossScr = this.gridToScreen(enemy.x, enemy.y);
          const roarRing = this.add.graphics();
          roarRing.lineStyle(3, 0xf97316, 0.85);
          roarRing.strokeCircle(bossScr.x, bossScr.y, 25);
          roarRing.scaleY = 0.5;

          this.tweens.add({
            targets: roarRing,
            scaleX: 5.0,
            scaleY: 2.5,
            alpha: 0,
            duration: 800,
            onComplete: () => roarRing.destroy()
          });

          this.characters.forEach(c => {
            if (c.hp > 0 && !c.isEnemy) {
              const d = Math.abs(enemy.x - c.x) + Math.abs(enemy.y - c.y);
              if (d <= 2.5) {
                const oldMp = c.mp;
                c.mp = Math.max(0, c.mp - 2);
                const lostMp = oldMp - c.mp;

                if (lostMp > 0) {
                  this.updateMiniHUDBar(c);
                  if (this.selectedCharacter === c) this.updateUIProfile(c);

                  const mnText = this.add.text(c.gameObject.x, c.gameObject.y - 110, `🔮 마나 소멸 -${lostMp}`, {
                    fontFamily: 'DungGeunMo, Pixelify Sans, monospace',
                    fontSize: '12px',
                    color: '#c084fc',
                    stroke: '#000000',
                    strokeThickness: 3
                  }).setOrigin(0.5).setDepth(c.gameObject.depth + 102);

                  this.tweens.add({
                    targets: mnText,
                    y: mnText.y - 20,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => mnText.destroy()
                  });
                }
              }
            }
          });

          this.spawnBossMinion();

          this.time.delayedCall(1200 * this.animationSpeedMultiplier, () => {
            afterBossCallback();
          });
          return;
        }

        afterBossCallback();
      };
      const attemptSpell = (afterSpellCallback: () => void) => {
        if (this.isGameOver || enemy.hp <= 0) {
          afterSpellCallback();
          return;
        }
        const chosenSelfHealIdx = enemy.spells.findIndex(s => s.effectType === 'heal');
        if (chosenSelfHealIdx !== -1) {
          const healSpell = enemy.spells[chosenSelfHealIdx];
          const canHeal = enemy.mp >= healSpell.cost && enemy.ap >= healSpell.cost && !enemy.hasAttackedThisTurn;
          const hpRatio = enemy.hp / enemy.maxHp;
          if (canHeal && hpRatio <= 0.6) {
            this.executeSpell(enemy, { x: enemy.x, y: enemy.y }, chosenSelfHealIdx);
            this.time.delayedCall(1200 * this.animationSpeedMultiplier, () => {
              afterSpellCallback();
            });
            return;
          }
        }

        let chosenSpellIndex = -1;
        let bestCost = -1;
        for (let i = 0; i < enemy.spells.length; i++) {
          const s = enemy.spells[i];
          if (s.effectType === 'damage' && enemy.mp >= s.cost && enemy.ap >= s.cost) {
            if (this.isCoordSpellRange(enemy, closestPlayer.x, closestPlayer.y, i)) {
              if (s.cost > bestCost) {
                bestCost = s.cost;
                chosenSpellIndex = i;
              }
            }
          }
        }

        if (chosenSpellIndex !== -1 && enemy.ap >= enemy.spells[chosenSpellIndex].cost && !enemy.hasAttackedThisTurn) {
          this.executeSpell(enemy, { x: closestPlayer.x, y: closestPlayer.y }, chosenSpellIndex);
          this.time.delayedCall(1200 * this.animationSpeedMultiplier, () => {
            afterSpellCallback();
          });
        } else {
          afterSpellCallback();
        }
      };

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

        // Already in straight line attack range or spell range, skip movement to conserve position
        const canAttackNow = this.isCoordAttackable(enemy, closestPlayer.x, closestPlayer.y);
        const canSpellNow = enemy.spells.some((s, idx) => 
          enemy.mp >= s.cost && this.isCoordSpellRange(enemy, closestPlayer.x, closestPlayer.y, idx)
        );
        if (canAttackNow || canSpellNow) {
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
          let walkTargetIndex = path.length - 1;
          for (let i = 0; i < path.length; i++) {
            const simulatedEnemyPos: Character = { ...enemy, x: path[i].x, y: path[i].y };
            const canAttackFromSim = this.isCoordAttackable(simulatedEnemyPos, closestPlayer.x, closestPlayer.y);
            const canSpellFromSim = enemy.spells.some((s, idx) => 
              enemy.mp >= s.cost && this.isCoordSpellRange(simulatedEnemyPos, closestPlayer.x, closestPlayer.y, idx)
            );
            if (canAttackFromSim || canSpellFromSim) {
              walkTargetIndex = i;
              break;
            }
          }

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
      attemptBossSpecialSpell(() => {
        attemptSpell(() => {
          attemptAttack(() => {
            attemptMovement(() => {
              attemptSpell(() => {
                attemptAttack(() => {
                  onComplete();
                });
              });
            });
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

    this.interactiveGraphics.lineStyle(2.5, color, 0.9);
    this.interactiveGraphics.fillStyle(color, 0.3);

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
          // Neon Sky Blue
          this.interactiveGraphics.fillStyle(0x00d2ff, 0.35);
          this.interactiveGraphics.lineStyle(2.5, 0x00d2ff, 0.85);
          
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
        if (this.isCoordAttackable(char, x, y)) {
          const screenPos = this.gridToScreen(x, y);
          // Neon Hot Pink
          this.interactiveGraphics.fillStyle(0xff0077, 0.38);
          this.interactiveGraphics.lineStyle(2.5, 0xff0077, 0.85);
          
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

  private isCoordSpellRange(char: Character, tx: number, ty: number, spellIndex: number = this.selectedSpellIndex): boolean {
    const spell = char.spells[spellIndex];
    if (!spell) return false;
    const dist = Math.abs(tx - char.x) + Math.abs(ty - char.y);
    return dist >= spell.rangeMin && dist <= spell.rangeMax;
  }

  private drawSpellRangeHighlight() {
    if (!this.isSpellMode || !this.selectedCharacter || this.selectedCharacter.isEnemy || this.turnManager.getState() !== 'PLAYER_TURN' || this.isGameOver) return;

    const char = this.selectedCharacter;

    // 1. Draw spell casting range (Purple or Green neon grids)
    const spell = char.spells[this.selectedSpellIndex];
    if (!spell) return;

    const isHealing = spell.effectType === 'heal';
    const rangeColor = isHealing ? 0x10b981 : 0xcc33ff;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.isCoordSpellRange(char, x, y)) {
          const screenPos = this.gridToScreen(x, y);
          this.interactiveGraphics.fillStyle(rangeColor, 0.28);
          this.interactiveGraphics.lineStyle(2.0, rangeColor, 0.75);
          
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

    // 2. Draw Element Splash targeting hover preview (Neon red splash indicator)
    if (this.hoverTile && this.isCoordSpellRange(char, this.hoverTile.x, this.hoverTile.y)) {
      const hx = this.hoverTile.x;
      const hy = this.hoverTile.y;
      const splashTiles: Point[] = [];

      if (spell.type === 'AoE') {
        splashTiles.push({ x: hx, y: hy });
        splashTiles.push({ x: hx + 1, y: hy });
        splashTiles.push({ x: hx - 1, y: hy });
        splashTiles.push({ x: hx, y: hy + 1 });
        splashTiles.push({ x: hx, y: hy - 1 });
      } else if (spell.type === 'Line') {
        const dx = hx - char.x;
        const dy = hy - char.y;
        if (dx === 0 || dy === 0) {
          const stepX = Math.sign(dx);
          const stepY = Math.sign(dy);
          let cx = char.x + stepX;
          let cy = char.y + stepY;
          while (true) {
            splashTiles.push({ x: cx, y: cy });
            if (cx === hx && cy === hy) break;
            cx += stepX;
            cy += stepY;
          }
        } else {
          splashTiles.push({ x: hx, y: hy });
        }
      } else {
        splashTiles.push({ x: hx, y: hy });
      }

      const splashColor = isHealing ? 0x00ff88 : 0xff0055;

      splashTiles.forEach(tile => {
        if (tile.x >= 0 && tile.x < this.gridWidth && tile.y >= 0 && tile.y < this.gridHeight) {
          const screenPos = this.gridToScreen(tile.x, tile.y);
          this.interactiveGraphics.fillStyle(splashColor, 0.45);
          this.interactiveGraphics.lineStyle(2.5, splashColor, 0.95);
          
          this.interactiveGraphics.beginPath();
          this.interactiveGraphics.moveTo(screenPos.x, screenPos.y - this.halfTileHeight);
          this.interactiveGraphics.lineTo(screenPos.x + this.halfTileWidth, screenPos.y);
          this.interactiveGraphics.lineTo(screenPos.x, screenPos.y + this.halfTileHeight);
          this.interactiveGraphics.lineTo(screenPos.x - this.halfTileWidth, screenPos.y);
          this.interactiveGraphics.closePath();
          
          this.interactiveGraphics.fillPath();
          this.interactiveGraphics.strokePath();
        }
      });
    }
  }

  // ==========================================
  // SIGNATURE SPELL GRAPHICS EFFECTS (VECTOR PARTICLES)
  // ==========================================

  private createFireSpellFX(x: number, y: number) {
    const fireGraphics = this.add.graphics();
    fireGraphics.setDepth(y + 100);

    // 1. Expanding flame ring
    fireGraphics.lineStyle(3, 0xef4444, 0.95);
    fireGraphics.fillStyle(0xf97316, 0.25);
    fireGraphics.beginPath();
    fireGraphics.strokeEllipse(x, y, 48, 24);
    fireGraphics.fillEllipse(x, y, 48, 24);

    this.tweens.add({
      targets: fireGraphics,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 320 * this.animationSpeedMultiplier,
      onComplete: () => fireGraphics.destroy()
    });

    // 2. Fire embers particles (12 flame dots flying outward)
    for (let i = 0; i < 12; i++) {
      const ember = this.add.graphics();
      ember.setDepth(y + 101);
      
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(40, 85);
      const tarX = x + Math.cos(angle) * speed;
      const tarY = y + Math.sin(angle) * speed * 0.5 - Phaser.Math.FloatBetween(10, 30); // Float upward
      
      const color = Phaser.Utils.Array.GetRandom([0xef4444, 0xf97316, 0xfacc15]);
      ember.fillStyle(color, 0.95);
      ember.fillCircle(x, y - 8, Phaser.Math.FloatBetween(3, 6));

      this.tweens.add({
        targets: ember,
        x: tarX - x,
        y: tarY - (y - 8),
        scaleX: 0.1,
        scaleY: 0.1,
        alpha: 0,
        ease: 'Cubic.easeOut',
        duration: Phaser.Math.Between(450, 700) * this.animationSpeedMultiplier,
        onComplete: () => ember.destroy()
      });
    }
  }

  private createLightningSpellFX(x: number, y: number) {
    const bolt = this.add.graphics();
    bolt.setDepth(y + 102);

    // 1. Draw triple zigzag lightning bolts
    bolt.lineStyle(3, 0xffffff, 1.0);
    bolt.beginPath();
    
    // Draw three random lightning forks
    for (let f = 0; f < 3; f++) {
      let curX = x + Phaser.Math.Between(-15, 15);
      let curY = y - 280;
      bolt.moveTo(curX, curY);

      const segments = 5;
      const segmentHeight = 280 / segments;
      for (let s = 1; s <= segments; s++) {
        const nextY = y - 280 + s * segmentHeight;
        const nextX = (s === segments) ? x : x + Phaser.Math.Between(-25, 25);
        bolt.lineTo(nextX, nextY);
      }
    }
    bolt.strokePath();

    // 2. Flashing electric discharge ring
    const ring = this.add.graphics();
    ring.setDepth(y + 100);
    ring.lineStyle(2.5, 0x00f3ff, 0.9);
    ring.strokeEllipse(x, y, 40, 20);

    this.tweens.add({
      targets: ring,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 250 * this.animationSpeedMultiplier,
      onComplete: () => ring.destroy()
    });

    this.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 180 * this.animationSpeedMultiplier,
      onComplete: () => bolt.destroy()
    });

    // 3. Shocking electric fragments flying outward
    for (let i = 0; i < 8; i++) {
      const spark = this.add.graphics();
      spark.setDepth(y + 101);
      spark.lineStyle(1.8, 0x00f3ff, 0.95);
      
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const rad = Phaser.Math.FloatBetween(25, 55);
      
      spark.beginPath();
      spark.moveTo(x, y - 10);
      spark.lineTo(x + Math.cos(angle) * rad, y - 10 + Math.sin(angle) * rad * 0.5);
      spark.strokePath();

      this.tweens.add({
        targets: spark,
        alpha: 0,
        scaleY: 0.2,
        duration: 300 * this.animationSpeedMultiplier,
        onComplete: () => spark.destroy()
      });
    }
  }

  private createHealSpellFX(x: number, y: number) {
    // 1. Rotating, floating Holy Cross
    const cross = this.add.graphics();
    cross.setDepth(y + 105);
    cross.fillStyle(0x10b981, 0.9);
    
    // Draw cross polygon centered
    cross.fillRect(-6, -20, 12, 40); // Vertical bar
    cross.fillRect(-18, -8, 36, 16); // Horizontal bar
    cross.setPosition(x, y - 25);

    this.tweens.add({
      targets: cross,
      y: y - 85,
      angle: 180,
      alpha: 0,
      scaleX: 0.7,
      scaleY: 0.7,
      duration: 750 * this.animationSpeedMultiplier,
      ease: 'Quad.easeOut',
      onComplete: () => cross.destroy()
    });

    // 2. Fairy Sparkle Particles (8 rising stars)
    for (let i = 0; i < 8; i++) {
      const sparkle = this.add.graphics();
      sparkle.setDepth(y + 104);
      sparkle.fillStyle(Phaser.Utils.Array.GetRandom([0x10b981, 0x34d399, 0xfacc15]), 0.95);
      sparkle.fillCircle(0, 0, Phaser.Math.FloatBetween(2, 4.5));
      
      const startAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const startRad = Phaser.Math.FloatBetween(10, 25);
      sparkle.setPosition(x + Math.cos(startAngle) * startRad, y + Math.sin(startAngle) * startRad * 0.5);

      this.tweens.add({
        targets: sparkle,
        y: sparkle.y - Phaser.Math.FloatBetween(35, 75),
        x: sparkle.x + Phaser.Math.FloatBetween(-15, 15),
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        ease: 'Sine.easeOut',
        duration: Phaser.Math.Between(600, 950) * this.animationSpeedMultiplier,
        onComplete: () => sparkle.destroy()
      });
    }
  }

  private createPoisonSpellFX(x: number, y: number) {
    // 1. Expanding toxic puddle (dark green)
    const puddle = this.add.graphics();
    puddle.setDepth(y - 1); // Draw on floor
    puddle.fillStyle(0x064e3b, 0.75);
    puddle.lineStyle(2.0, 0x10b981, 0.9);
    puddle.beginPath();
    puddle.strokeEllipse(x, y, 42, 21);
    puddle.fillEllipse(x, y, 42, 21);
    puddle.setScale(0);

    this.tweens.add({
      targets: puddle,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 350 * this.animationSpeedMultiplier,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: puddle,
      alpha: 0,
      delay: 600 * this.animationSpeedMultiplier,
      duration: 350 * this.animationSpeedMultiplier,
      onComplete: () => puddle.destroy()
    });

    // 2. Rising toxic bubbles (droplets)
    for (let i = 0; i < 6; i++) {
      const bubble = this.add.graphics();
      bubble.setDepth(y + 102);
      
      const bColor = Phaser.Utils.Array.GetRandom([0x22c55e, 0x8b5cf6]); // Toxic green or debuff purple
      bubble.fillStyle(bColor, 0.85);
      bubble.fillCircle(0, 0, Phaser.Math.FloatBetween(2.5, 5));
      
      const px = x + Phaser.Math.FloatBetween(-25, 25);
      const py = y + Phaser.Math.FloatBetween(-10, 10) * 0.5;
      bubble.setPosition(px, py);

      this.tweens.add({
        targets: bubble,
        y: py - Phaser.Math.FloatBetween(30, 60),
        alpha: 0,
        scaleX: 1.4, // expand bubble before pop
        scaleY: 1.4,
        ease: 'Quad.easeOut',
        duration: Phaser.Math.Between(500, 850) * this.animationSpeedMultiplier,
        onComplete: () => bubble.destroy()
      });
    }
  }

  private createIceSpellFX(x: number, y: number) {
    // 1. Jagged Ice Spikes shooting from ground
    const ice = this.add.graphics();
    ice.setDepth(y + 103);
    ice.fillStyle(0x00f3ff, 0.8);
    ice.lineStyle(1.5, 0xffffff, 0.95);

    // Draw three sharp shards pointing outwards
    ice.beginPath();
    
    // Shard 1: Center top
    ice.moveTo(x - 8, y);
    ice.lineTo(x, y - 48);
    ice.lineTo(x + 8, y);
    ice.lineTo(x - 8, y);

    // Shard 2: Left tilt
    ice.moveTo(x - 18, y + 4);
    ice.lineTo(x - 30, y - 32);
    ice.lineTo(x - 4, y);
    
    // Shard 3: Right tilt
    ice.moveTo(x + 4, y);
    ice.lineTo(x + 30, y - 32);
    ice.lineTo(x + 18, y + 4);

    ice.closePath();
    ice.fillPath();
    ice.strokePath();
    
    ice.setScale(0);

    this.tweens.add({
      targets: ice,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 250 * this.animationSpeedMultiplier,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: ice,
      alpha: 0,
      delay: 500 * this.animationSpeedMultiplier,
      duration: 250 * this.animationSpeedMultiplier,
      onComplete: () => ice.destroy()
    });

    // 2. Falling snowflake dusts
    for (let i = 0; i < 8; i++) {
      const flake = this.add.graphics();
      flake.setDepth(y + 104);
      flake.fillStyle(0xe0f2fe, 0.9);
      flake.fillCircle(0, 0, Phaser.Math.FloatBetween(2, 3.5));
      
      const fx = x + Phaser.Math.FloatBetween(-30, 30);
      const fy = y - 45 + Phaser.Math.FloatBetween(-15, 15);
      flake.setPosition(fx, fy);

      this.tweens.add({
        targets: flake,
        y: fy + Phaser.Math.FloatBetween(20, 45), // fall downwards
        x: fx + Phaser.Math.FloatBetween(-10, 10),
        alpha: 0,
        duration: Phaser.Math.Between(550, 850) * this.animationSpeedMultiplier,
        onComplete: () => flake.destroy()
      });
    }
  }

  private createWindSpellFX(x: number, y: number, dx: number, dy: number) {
    // 1. Spinning Spiral wind waves
    const wind = this.add.graphics();
    wind.setDepth(y + 101);
    wind.lineStyle(2.0, 0xf8fafc, 0.9);
    
    // Draw 3 spiral arcs
    wind.beginPath();
    wind.arc(0, 0, 18, 0, Math.PI * 0.7);
    wind.arc(0, 0, 28, Math.PI * 0.6, Math.PI * 1.5);
    wind.arc(0, 0, 38, Math.PI * 1.2, Math.PI * 2.0);
    wind.strokePath();

    wind.setPosition(x, y - 10);
    wind.setAngle(0);

    this.tweens.add({
      targets: wind,
      angle: 360,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 400 * this.animationSpeedMultiplier,
      onComplete: () => wind.destroy()
    });

    // 2. Fast breeze vectors following the direction of wind pierce
    for (let i = 0; i < 5; i++) {
      const line = this.add.graphics();
      line.setDepth(y + 102);
      line.lineStyle(1.5, 0xffffff, 0.85);

      const offsetAngle = Phaser.Math.FloatBetween(-0.2, 0.2);
      const baseAngle = Math.atan2(dy * 0.5, dx) + offsetAngle;
      
      const rx = x + Phaser.Math.FloatBetween(-15, 15);
      const ry = y - 10 + Phaser.Math.FloatBetween(-8, 8);
      line.setPosition(rx, ry);

      line.beginPath();
      line.moveTo(0, 0);
      line.lineTo(Math.cos(baseAngle) * 45, Math.sin(baseAngle) * 45);
      line.strokePath();

      this.tweens.add({
        targets: line,
        x: rx + Math.cos(baseAngle) * 60,
        y: ry + Math.sin(baseAngle) * 60,
        alpha: 0,
        duration: 350 * this.animationSpeedMultiplier,
        onComplete: () => line.destroy()
      });
    }
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

  // ==========================================
  // TACTICAL TRAINING ACADEMY & EQUIPMENT SYSTEM
  // ==========================================

  private openAcademyModal() {
    const modal = document.getElementById('academy-modal');
    if (!modal) return;

    modal.classList.remove('hidden');

    // 1. Reset Tab display state to default (Training Tab active)
    const tabTrainBtn = document.getElementById('tab-btn-train');
    const tabEquipBtn = document.getElementById('tab-btn-equip');
    const tabTrainView = document.getElementById('academy-tab-train');
    const tabEquipView = document.getElementById('academy-tab-equip');

    if (tabTrainBtn && tabEquipBtn && tabTrainView && tabEquipView) {
      tabTrainBtn.classList.add('active');
      tabEquipBtn.classList.remove('active');
      tabTrainView.classList.remove('hidden');
      tabEquipView.classList.add('hidden');
    }

    this.updateAcademyUI();

    // 2. Bind Tab Switch Buttons
    if (tabTrainBtn && tabEquipBtn && tabTrainView && tabEquipView) {
      tabTrainBtn.onclick = () => {
        tabTrainBtn.classList.add('active');
        tabEquipBtn.classList.remove('active');
        tabTrainView.classList.remove('hidden');
        tabEquipView.classList.add('hidden');
        this.updateAcademyUI();
      };
      tabEquipBtn.onclick = () => {
        tabTrainBtn.classList.remove('active');
        tabEquipBtn.classList.add('active');
        tabTrainView.classList.add('hidden');
        tabEquipView.classList.remove('hidden');
        this.updateAcademyEquipTab();
      };
    }

    // 3. Bind Hero selector buttons inside Equipment Tab
    const heroBtns = document.querySelectorAll('.hero-sel-btn');
    heroBtns.forEach(btn => {
      const element = btn as HTMLButtonElement;
      element.onclick = () => {
        heroBtns.forEach(b => b.classList.remove('active'));
        element.classList.add('active');
        this.selectedAcademyHeroKey = element.getAttribute('data-hero') || 'warrior';
        this.updateAcademyEquipTab();
      };
    });

    // 4. Bind Slot Unequip actions
    const btnUnequipWep = document.getElementById('btn-unequip-weapon');
    if (btnUnequipWep) {
      btnUnequipWep.onclick = () => this.unequipItem('weapon');
    }
    const btnUnequipArm = document.getElementById('btn-unequip-armor');
    if (btnUnequipArm) {
      btnUnequipArm.onclick = () => this.unequipItem('armor');
    }

    // 5. Bind Academy Exit button
    const btnExit = document.getElementById('btn-academy-exit');
    if (btnExit) {
      const newExit = btnExit.cloneNode(true) as HTMLButtonElement;
      btnExit.parentNode!.replaceChild(newExit, btnExit);
      newExit.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (this.currentStageIndex < STAGE_PRESETS.length - 1) {
          this.loadStage(this.currentStageIndex + 1);
        } else {
          this.resetPermanentGrowth();
          this.loadStage(0);
        }
      });
    }
  }

  private updateAcademyUI() {
    const spheresVal = document.getElementById('academy-spheres-val');
    if (spheresVal) {
      spheresVal.textContent = `🌟 ${this.trainingSpheres}`;
    }

    const container = document.getElementById('academy-cards-container');
    if (!container) return;

    container.innerHTML = '';

    const heroes = [
      { key: 'warrior', name: '레온 (Leon)', avatar: '🛡️', baseHp: 160, baseMp: 4, baseMove: 4 },
      { key: 'mage', name: '아이샤 (Aisha)', avatar: '🔥', baseHp: 90, baseMp: 6, baseMove: 3 },
      { key: 'archer', name: '로이 (Roy)', avatar: '🏹', baseHp: 110, baseMp: 4, baseMove: 4 },
      { key: 'cleric', name: '세라 (Sera)', avatar: '💚', baseHp: 100, baseMp: 5, baseMove: 3 },
      { key: 'rogue', name: '카엘 (Kael)', avatar: '🗡️', baseHp: 120, baseMp: 4, baseMove: 5 }
    ].filter(h => this.spawnedAllyKeys.length === 0 || this.spawnedAllyKeys.includes(h.key));

    heroes.forEach(h => {
      const growth = this.allyGrowthStats[h.key] || { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false };
      
      let curHp = h.baseHp + growth.bonusHp;
      let curDmg = growth.bonusDmg;
      let curMove = h.baseMove + growth.bonusMove;
      let curMp = h.baseMp + growth.bonusMp;

      let charName = h.name;
      let charAvatar = h.avatar;
      
      // Dynamic class title overrides if promoted
      if (growth.isPromoted) {
        if (h.key === 'warrior') { charName = '성기사 레온'; charAvatar = '👑'; }
        else if (h.key === 'mage') { charName = '대마도사 아이샤'; charAvatar = '🔮'; }
        else if (h.key === 'archer') { charName = '신궁 로이'; charAvatar = '🎯'; }
        else if (h.key === 'cleric') { charName = '대주교 세라'; charAvatar = '👼'; }
        else if (h.key === 'rogue') { charName = '그림자 카엘'; charAvatar = '👤'; }
      }

      const trainCount = Math.floor(growth.bonusHp / 15) + Math.floor(growth.bonusDmg / 5) + growth.bonusMove + growth.bonusMp;

      let promoteAction = '';
      if (!growth.isPromoted) {
        const isLocked = this.trainingSpheres < 3 || trainCount < 4;
        promoteAction = `<button class="btn-upgrade btn-promote-hero" ${isLocked ? 'disabled' : ''}>👑 전직 (${trainCount}/4회) (🌟3)</button>`;
      } else {
        promoteAction = `<div class="promoted-badge" style="grid-column: 1/-1; text-align: center; color: #facc15; font-size: 0.82rem; padding: 4px; border: 1.5px dashed rgba(250,204,21,0.5); border-radius: 4px; margin-top: 5px; background: rgba(250,204,21,0.06); font-family: DungGeunMo, Pixelify Sans, monospace;">👑 전직완료 (3스킬 개방)</div>`;
      }

      const card = document.createElement('div');
      card.className = `academy-card ${h.key}`;
      card.innerHTML = `
        <div class="card-avatar">${charAvatar}</div>
        <div class="card-name">${charName}</div>
        
        <div class="card-stat-row">
          <span class="card-stat-label">❤️ 최대 체력</span>
          <span class="card-stat-val">${curHp}</span>
        </div>
        <div class="card-stat-row">
          <span class="card-stat-label">⚔️ 가산 공격력</span>
          <span class="card-stat-val">+${curDmg}</span>
        </div>
        <div class="card-stat-row">
          <span class="card-stat-label">👟 이동 범위</span>
          <span class="card-stat-val">${curMove}칸</span>
        </div>
        <div class="card-stat-row">
          <span class="card-stat-label">🔮 최대 마나</span>
          <span class="card-stat-val">${curMp}</span>
        </div>
        
        <div class="card-actions">
          <button class="btn-upgrade btn-up-hp" ${this.trainingSpheres < 1 ? 'disabled' : ''}>HP 강화 (🌟1)</button>
          <button class="btn-upgrade btn-up-dmg" ${this.trainingSpheres < 1 ? 'disabled' : ''}>공격력 강화 (🌟1)</button>
          <button class="btn-upgrade btn-up-move" ${(this.trainingSpheres < 2 || curMove >= 6) ? 'disabled' : ''}>이동력 +1 (🌟2)</button>
          <button class="btn-upgrade btn-up-mp" ${(this.trainingSpheres < 2 || curMp >= 7) ? 'disabled' : ''}>최대 MP +1 (🌟2)</button>
          ${promoteAction}
        </div>
      `;

      card.querySelector('.btn-up-hp')!.addEventListener('click', () => {
        if (this.trainingSpheres >= 1) {
          this.trainingSpheres -= 1;
          growth.bonusHp += 15;
          this.updateAcademyUI();
        }
      });
      card.querySelector('.btn-up-dmg')!.addEventListener('click', () => {
        if (this.trainingSpheres >= 1) {
          this.trainingSpheres -= 1;
          growth.bonusDmg += 5;
          this.updateAcademyUI();
        }
      });
      card.querySelector('.btn-up-move')!.addEventListener('click', () => {
        if (this.trainingSpheres >= 2 && curMove < 6) {
          this.trainingSpheres -= 2;
          growth.bonusMove += 1;
          this.updateAcademyUI();
        }
      });
      card.querySelector('.btn-up-mp')!.addEventListener('click', () => {
        if (this.trainingSpheres >= 2 && curMp < 7) {
          this.trainingSpheres -= 2;
          growth.bonusMp += 1;
          this.updateAcademyUI();
        }
      });

      if (!growth.isPromoted) {
        const btnPromote = card.querySelector('.btn-promote-hero');
        if (btnPromote) {
          btnPromote.addEventListener('click', () => {
            if (this.trainingSpheres >= 3 && trainCount >= 4) {
              this.trainingSpheres -= 3;
              growth.isPromoted = true;
              this.updateAcademyUI();
              this.showDialogue('SYSTEM', `[${charName}] 승급 전직 완료!`, 1800);
            }
          });
        }
      }

      container.appendChild(card);
    });
  }

  private updateAcademyEquipTab() {
    const selBtns = document.querySelectorAll('.hero-sel-btn');
    selBtns.forEach(btn => {
      const heroKey = btn.getAttribute('data-hero');
      if (heroKey) {
        const isSpawned = this.spawnedAllyKeys.length === 0 || this.spawnedAllyKeys.includes(heroKey);
        (btn as HTMLElement).style.display = isSpawned ? 'inline-block' : 'none';
      }
    });

    if (this.spawnedAllyKeys.length > 0 && !this.spawnedAllyKeys.includes(this.selectedAcademyHeroKey)) {
      this.selectedAcademyHeroKey = this.spawnedAllyKeys[0];
      selBtns.forEach(btn => {
        const hk = btn.getAttribute('data-hero');
        if (hk === this.selectedAcademyHeroKey) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    const growth = this.allyGrowthStats[this.selectedAcademyHeroKey];
    if (!growth) return;

    const heroesInfo: Record<string, { name: string; avatar: string }> = {
      warrior: { name: '레온 (Leon)', avatar: '🛡️' },
      mage: { name: '아이샤 (Aisha)', avatar: '🔥' },
      archer: { name: '로이 (Roy)', avatar: '🏹' },
      cleric: { name: '세라 (Sera)', avatar: '💚' },
      rogue: { name: '카엘 (Kael)', avatar: '🗡️' }
    };

    let charName = heroesInfo[this.selectedAcademyHeroKey]?.name || '영웅';
    let charAvatar = heroesInfo[this.selectedAcademyHeroKey]?.avatar || '🛡️';

    if (growth.isPromoted) {
      if (this.selectedAcademyHeroKey === 'warrior') { charName = '성기사 레온'; charAvatar = '👑'; }
      else if (this.selectedAcademyHeroKey === 'mage') { charName = '대마도사 아이샤'; charAvatar = '🔮'; }
      else if (this.selectedAcademyHeroKey === 'archer') { charName = '신궁 로이'; charAvatar = '🎯'; }
      else if (this.selectedAcademyHeroKey === 'cleric') { charName = '대주교 세라'; charAvatar = '👼'; }
      else if (this.selectedAcademyHeroKey === 'rogue') { charName = '그림자 카엘'; charAvatar = '👤'; }
    }

    const avatarDisplay = document.getElementById('equip-hero-visual-avatar');
    const nameDisplay = document.getElementById('equip-hero-name-label');
    const weaponDisplay = document.getElementById('slot-weapon-display');
    const armorDisplay = document.getElementById('slot-armor-display');
    const btnUnequipWep = document.getElementById('btn-unequip-weapon') as HTMLButtonElement;
    const btnUnequipArm = document.getElementById('btn-unequip-armor') as HTMLButtonElement;

    if (avatarDisplay) avatarDisplay.textContent = charAvatar;
    if (nameDisplay) nameDisplay.textContent = charName;

    if (weaponDisplay && btnUnequipWep) {
      if (growth.equippedWeapon) {
        weaponDisplay.innerHTML = `<span style="color: #60a5fa;">${growth.equippedWeapon.name}</span> (+${growth.equippedWeapon.dmgBonus} ATK)`;
        btnUnequipWep.disabled = false;
      } else {
        weaponDisplay.textContent = '장착된 무기 없음';
        btnUnequipWep.disabled = true;
      }
    }

    if (armorDisplay && btnUnequipArm) {
      if (growth.equippedArmor) {
        armorDisplay.innerHTML = `<span style="color: #34d399;">${growth.equippedArmor.name}</span> (+${growth.equippedArmor.hpBonus} HP)`;
        btnUnequipArm.disabled = false;
      } else {
        armorDisplay.textContent = '장착된 갑옷 없음';
        btnUnequipArm.disabled = true;
      }
    }

    const invContainer = document.getElementById('inventory-grid-container');
    if (!invContainer) return;

    invContainer.innerHTML = '';

    if (this.sharedInventory.length === 0) {
      invContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #64748b; font-size: 0.9rem; margin-top: 50px;">🎒 보관된 미장착 장비가 없습니다.</div>`;
      return;
    }

    this.sharedInventory.forEach((item, index) => {
      const tile = document.createElement('div');
      tile.className = 'inventory-item-tile';

      const typeLabel = item.type === 'weapon' ? '⚔️' : '🛡️';
      const statLabel = item.type === 'weapon' ? `+${item.dmgBonus} ATK` : `+${item.hpBonus} HP`;
      
      const classKorean: Record<string, string> = {
        warrior: '전사', mage: '법사', archer: '궁수', cleric: '사제', rogue: '도적'
      };
      const limitLabel = classKorean[item.classLimit] || '공용';

      tile.innerHTML = `
        <div class="inv-item-name">${typeLabel} ${item.name}</div>
        <div class="inv-item-class">직업: ${limitLabel}</div>
        <div class="inv-item-stat">${statLabel}</div>
      `;

      tile.onclick = () => {
        if (item.classLimit !== this.selectedAcademyHeroKey) {
          this.showDialogue('SYSTEM', `해당 아이템은 [${limitLabel}] 클래스만 장착할 수 있습니다!`, 2000);
          return;
        }
        this.equipItem(item, index);
      };

      invContainer.appendChild(tile);
    });
  }

  private equipItem(item: Item, index: number) {
    const growth = this.allyGrowthStats[this.selectedAcademyHeroKey];
    if (!growth) return;

    if (item.type === 'weapon') {
      if (growth.equippedWeapon) {
        this.sharedInventory.push(growth.equippedWeapon);
      }
      growth.equippedWeapon = item;
    } else {
      if (growth.equippedArmor) {
        this.sharedInventory.push(growth.equippedArmor);
      }
      growth.equippedArmor = item;
    }

    this.sharedInventory.splice(index, 1);
    this.updateAcademyEquipTab();
    this.showDialogue('SYSTEM', `[${item.name}] 장착 완료!`, 1200);
  }

  private unequipItem(slotType: 'weapon' | 'armor') {
    const growth = this.allyGrowthStats[this.selectedAcademyHeroKey];
    if (!growth) return;

    if (slotType === 'weapon' && growth.equippedWeapon) {
      this.sharedInventory.push(growth.equippedWeapon);
      this.showDialogue('SYSTEM', `[${growth.equippedWeapon.name}] 해제 완료!`, 1200);
      growth.equippedWeapon = null;
    } else if (slotType === 'armor' && growth.equippedArmor) {
      this.sharedInventory.push(growth.equippedArmor);
      this.showDialogue('SYSTEM', `[${growth.equippedArmor.name}] 해제 완료!`, 1200);
      growth.equippedArmor = null;
    }

    this.updateAcademyEquipTab();
  }

  private resetPermanentGrowth() {
    this.trainingSpheres = 0;
    this.sharedInventory = [];
    this.activeRunes = [];
    this.allyGrowthStats = {
      warrior: { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false },
      mage: { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false },
      archer: { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false },
      cleric: { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false },
      rogue: { bonusHp: 0, bonusDmg: 0, bonusMove: 0, bonusMp: 0, equippedWeapon: null, equippedArmor: null, isPromoted: false }
    };
    document.getElementById('mode-selection-overlay')?.classList.remove('hidden');
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
