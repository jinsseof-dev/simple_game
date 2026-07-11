export interface StageUnitPreset {
  type: string;
  name: string;
  x: number;
  y: number;
}

export interface StageConfig {
  id: number;
  name: string;
  theme: 'grass' | 'desert' | 'town' | 'dungeon';
  width: number;
  height: number;
  obstacles: { x: number; y: number }[];
  allies: StageUnitPreset[];
  enemies: StageUnitPreset[];
  description: string;
}

export const STAGE_PRESETS: StageConfig[] = [
  // ==================== CHAPTER 1: 숲 (theme: grass) ====================
  {
    id: 1,
    name: "숲속 전초기지 정찰",
    theme: "grass",
    width: 10,
    height: 10,
    obstacles: [
      { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
      { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 1, y: 7 }, { x: 8, y: 2 }
    ],
    allies: [
      { type: "warrior", name: "레온 (Leon)", x: 8, y: 8 },
      { type: "mage", name: "에이샤 (Aisha)", x: 8, y: 7 },
      { type: "archer", name: "로이 (Roy)", x: 7, y: 8 }
    ],
    enemies: [
      { type: "gob_warrior", name: "고블린 선발대 A", x: 1, y: 1 },
      { type: "gob_archer", name: "고블린 저격수 B", x: 1, y: 2 },
      { type: "gob_assassin", name: "고블린 기습자 C", x: 2, y: 1 },
      { type: "gob_defender", name: "고블린 대방패병 D", x: 1, y: 3 }
    ],
    description: "고블린 선발대 정예군이 숲 입구에 진을 쳤습니다. 바위 틈 엄폐물 뒤의 적 소총수와 우회하는 기습병을 차단하십시오!"
  },
  {
    id: 2,
    name: "수풀의 거울 미로",
    theme: "grass",
    width: 11,
    height: 11,
    obstacles: [
      { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
      { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 6 },
      { x: 5, y: 2 }, { x: 5, y: 8 }
    ],
    allies: [
      { type: "warrior", name: "레온 (Leon)", x: 9, y: 9 },
      { type: "mage", name: "에이샤 (Aisha)", x: 9, y: 8 },
      { type: "archer", name: "로이 (Roy)", x: 8, y: 9 }
    ],
    enemies: [
      { type: "gob_warrior", name: "고블린 병사 A", x: 1, y: 1 },
      { type: "gob_archer", name: "고블린 저격수 B", x: 1, y: 2 },
      { type: "gob_assassin", name: "고블린 자객 C", x: 2, y: 1 },
      { type: "gob_defender", name: "고블린 방패수 D", x: 1, y: 3 }
    ],
    description: "시야가 좁아지는 미로 숲입니다. 돌아서 침투해 오는 고블린 자객을 경계하십시오."
  },
  {
    id: 3,
    name: "고블린 요새 입구",
    theme: "grass",
    width: 12,
    height: 12,
    obstacles: [
      { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
      { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 6 },
      { x: 2, y: 8 }, { x: 9, y: 3 }
    ],
    allies: [
      { type: "warrior", name: "레온 (Leon)", x: 10, y: 10 },
      { type: "mage", name: "에이샤 (Aisha)", x: 10, y: 9 },
      { type: "archer", name: "로이 (Roy)", x: 9, y: 10 },
      { type: "cleric", name: "렌 (Ren)", x: 9, y: 9 }
    ],
    enemies: [
      { type: "gob_warrior", name: "정예 고블린 A", x: 1, y: 1 },
      { type: "gob_warrior", name: "정예 고블린 B", x: 1, y: 2 },
      { type: "gob_archer", name: "요새 궁수 C", x: 2, y: 1 },
      { type: "gob_assassin", name: "요새 잠입수 D", x: 2, y: 2 },
      { type: "gob_defender", name: "요새 철벽병 E", x: 1, y: 3 }
    ],
    description: "요새 정문 앞 돌파전입니다. 성벽 엄폐물에 기댄 방패수들을 에이샤의 화염 마법으로 무너뜨리세요!"
  },

  // ==================== CHAPTER 2: 사막 (theme: desert) ====================
  {
    id: 4,
    name: "사막 협곡 봉쇄선",
    theme: "desert",
    width: 12,
    height: 12,
    obstacles: [
      { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
      { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 7 },
      { x: 2, y: 2 }, { x: 9, y: 9 }
    ],
    allies: [
      { type: "warrior", name: "레온 (Leon)", x: 10, y: 10 },
      { type: "mage", name: "에이샤 (Aisha)", x: 10, y: 9 },
      { type: "archer", name: "로이 (Roy)", x: 9, y: 10 },
      { type: "cleric", name: "렌 (Ren)", x: 9, y: 9 }
    ],
    enemies: [
      { type: "gob_warrior", name: "모래바람 병사 A", x: 1, y: 1 },
      { type: "gob_archer", name: "모래바람 저격수 B", x: 1, y: 2 },
      { type: "gob_assassin", name: "모래바람 자객 C", x: 2, y: 1 },
      { type: "gob_defender", name: "모래바람 철벽수 D", x: 1, y: 3 }
    ],
    description: "뜨거운 사막 협곡 봉쇄지역입니다. 갈라진 sandstone 바위 기둥들 사이로 포위망을 돌파하십시오."
  },
  {
    id: 5,
    name: "오아시스 중앙 격전",
    theme: "desert",
    width: 13,
    height: 13,
    obstacles: [
      { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 },
      { x: 8, y: 6 }, { x: 8, y: 7 }, { x: 8, y: 8 },
      { x: 3, y: 9 }, { x: 9, y: 3 }
    ],
    allies: [
      { type: "warrior", name: "레온 (Leon)", x: 11, y: 11 },
      { type: "mage", name: "에이샤 (Aisha)", x: 11, y: 10 },
      { type: "archer", name: "로이 (Roy)", x: 10, y: 11 },
      { type: "cleric", name: "렌 (Ren)", x: 10, y: 10 },
      { type: "rogue", name: "카일 (Kyle)", x: 11, y: 9 }
    ],
    enemies: [
      { type: "gob_warrior", name: "사막 고블린 A", x: 1, y: 1 },
      { type: "gob_warrior", name: "사막 고블린 B", x: 1, y: 2 },
      { type: "gob_archer", name: "사막 명사수 C", x: 2, y: 1 },
      { type: "gob_assassin", name: "사막 자객 D", x: 2, y: 2 },
      { type: "gob_defender", name: "사막 방패수 E", x: 1, y: 3 }
    ],
    description: "오아시스 주변의 대규모 공방전입니다. 카일의 높은 기동력을 살려 수풀 속 적 자객을 암살하십시오."
  },
  {
    id: 6,
    name: "황량한 사막 사도",
    theme: "desert",
    width: 14,
    height: 14,
    obstacles: [
      { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
      { x: 8, y: 10 }, { x: 9, y: 10 }, { x: 10, y: 10 },
      { x: 5, y: 7 }, { x: 8, y: 6 }
    ],
    allies: [
      { type: "warrior", name: "레온 (Leon)", x: 12, y: 12 },
      { type: "mage", name: "에이샤 (Aisha)", x: 12, y: 11 },
      { type: "archer", name: "로이 (Roy)", x: 11, y: 12 },
      { type: "cleric", name: "렌 (Ren)", x: 11, y: 11 },
      { type: "rogue", name: "카일 (Kyle)", x: 12, y: 10 }
    ],
    enemies: [
      { type: "gob_warrior", name: "모래부대 격투병 A", x: 1, y: 1 },
      { type: "gob_warrior", name: "모래부대 격투병 B", x: 1, y: 2 },
      { type: "gob_archer", name: "모래부대 저격수 C", x: 2, y: 1 },
      { type: "gob_assassin", name: "모래부대 습격수 D", x: 2, y: 2 },
      { type: "gob_defender", name: "모래부대 수호수 E", x: 1, y: 3 },
      { type: "gob_shaman", name: "사막 부족주술사 F", x: 2, y: 3 }
    ],
    description: "사막 부족의 정예들이 퇴로를 차단했습니다. 부족 주술사의 범위 약화 저주를 신속히 정화하십시오."
  },

  // ==================== CHAPTER 3: 마을 (theme: town) ====================
  {
    id: 7,
    name: "약탈당한 시장 광장",
    theme: "town",
    width: 12,
    height: 12,
    obstacles: [
      { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 4 },
      { x: 7, y: 7 }, { x: 7, y: 8 }, { x: 8, y: 7 },
      { x: 1, y: 8 }, { x: 10, y: 3 }
    ],
    allies: [
      { type: "warrior", name: "레온 (Leon)", x: 10, y: 10 },
      { type: "mage", name: "에이샤 (Aisha)", x: 10, y: 9 },
      { type: "archer", name: "로이 (Roy)", x: 9, y: 10 },
      { type: "cleric", name: "렌 (Ren)", x: 9, y: 9 }
    ],
    enemies: [
      { type: "gob_warrior", name: "고블린 습격대 A", x: 1, y: 1 },
      { type: "gob_archer", name: "고블린 약탈소총 C", x: 1, y: 2 },
      { type: "gob_assassin", name: "고블린 복병 D", x: 2, y: 1 },
      { type: "gob_defender", name: "고블린 철방패 E", x: 1, y: 3 }
    ],
    description: "약탈당한 마을 입구 시장터입니다. 배치된 오크 나무통을 방어막 삼아 적 전선을 밀어내십시오."
  },
  {
    id: 8,
    name: "마을 분수대 골목",
    theme: "town",
    width: 13,
    height: 13,
    obstacles: [
      { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
      { x: 7, y: 8 }, { x: 8, y: 8 }, { x: 9, y: 8 },
      { x: 6, y: 2 }, { x: 6, y: 10 }
    ],
    allies: [
      { type: "warrior", name: "레온 (Leon)", x: 11, y: 11 },
      { type: "mage", name: "에이샤 (Aisha)", x: 11, y: 10 },
      { type: "archer", name: "로이 (Roy)", x: 10, y: 11 },
      { type: "cleric", name: "렌 (Ren)", x: 10, y: 10 },
      { type: "rogue", name: "카일 (Kyle)", x: 11, y: 9 }
    ],
    enemies: [
      { type: "gob_warrior", name: "고블린 시가병 A", x: 1, y: 1 },
      { type: "gob_warrior", name: "고블린 시가병 B", x: 1, y: 2 },
      { type: "gob_archer", name: "고블린 저격궁 C", x: 2, y: 1 },
      { type: "gob_assassin", name: "고블린 지붕습격수 D", x: 2, y: 2 },
      { type: "gob_defender", name: "고블린 가로방패병 E", x: 1, y: 3 }
    ],
    description: "협소한 분수대 골목길 시가전입니다. 나무 울타리와 오크통 Choke Point를 사수하십시오."
  },
  {
    id: 9,
    name: "불타는 요새 외곽 성문",
    theme: "town",
    width: 14,
    height: 14,
    obstacles: [
      { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 5, y: 5 },
      { x: 8, y: 8 }, { x: 8, y: 9 }, { x: 9, y: 9 },
      { x: 2, y: 10 }, { x: 11, y: 3 }
    ],
    allies: [
      { type: "warrior", name: "레온 (Leon)", x: 12, y: 12 },
      { type: "mage", name: "에이샤 (Aisha)", x: 12, y: 11 },
      { type: "archer", name: "로이 (Roy)", x: 11, y: 12 },
      { type: "cleric", name: "렌 (Ren)", x: 11, y: 11 },
      { type: "rogue", name: "카일 (Kyle)", x: 12, y: 10 }
    ],
    enemies: [
      { type: "gob_warrior", name: "고블린 수비대원 A", x: 1, y: 1 },
      { type: "gob_warrior", name: "고블린 수비대원 B", x: 1, y: 2 },
      { type: "gob_archer", name: "고블린 타워소총 C", x: 2, y: 1 },
      { type: "gob_assassin", name: "고블린 성곽자객 D", x: 2, y: 2 },
      { type: "gob_defender", name: "고블린 대형방패 E", x: 1, y: 3 },
      { type: "gob_shaman", name: "요새 수호주술사 F", x: 2, y: 3 }
    ],
    description: "보스 요새의 외곽 마지막 관문입니다. 요새 주술사의 버프를 끊고 성문을 돌파하십시오."
  },

  // ==================== CHAPTER 4: 보스전 (theme: dungeon) ====================
  {
    id: 10,
    name: "대주술사의 알현실",
    theme: "dungeon",
    width: 16,
    height: 16,
    obstacles: [
      { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 }, { x: 3, y: 6 },
      { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 6 },
      { x: 9, y: 9 }, { x: 9, y: 10 }, { x: 9, y: 11 }, { x: 9, y: 12 },
      { x: 12, y: 9 }, { x: 12, y: 10 }, { x: 12, y: 11 }, { x: 12, y: 12 },
      { x: 7, y: 14 }, { x: 8, y: 14 }
    ],
    allies: [
      { type: "warrior", name: "레온 (Leon)", x: 13, y: 13 },
      { type: "mage", name: "에이샤 (Aisha)", x: 13, y: 12 },
      { type: "archer", name: "로이 (Roy)", x: 12, y: 13 },
      { type: "cleric", name: "렌 (Ren)", x: 12, y: 12 },
      { type: "rogue", name: "카일 (Kyle)", x: 13, y: 11 }
    ],
    enemies: [
      { type: "gob_warrior", name: "고블린 정예병 A", x: 2, y: 2 },
      { type: "gob_warrior", name: "고블린 정예병 B", x: 1, y: 3 },
      { type: "gob_archer", name: "고블린 소총수 A", x: 2, y: 4 },
      { type: "gob_archer", name: "고블린 소총수 B", x: 3, y: 2 },
      { type: "gob_defender", name: "고블린 대방패병 A", x: 3, y: 3 },
      { type: "gob_defender", name: "고블린 대방패병 B", x: 2, y: 3 },
      { type: "gob_shaman", name: "고블린 대주술사 [BOSS]", x: 1, y: 1 }
    ],
    description: "요새의 대주술사 대광장입니다. 모든 수호 석상을 파괴하고 고블린 주술사의 화염 저주 폭격을 잠재우십시오!"
  }
];
