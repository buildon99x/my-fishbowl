export const FOOD_CONFIGS = {
  flake: {
    type: 'flake',
    label: '바삭바삭 플레이크',
    color: '#F5C842',
    assets: ['assets/food/flake-1.svg', 'assets/food/flake-2.svg', 'assets/food/flake-3.svg'],
    fallSpeedRange: [3, 6],
    swayAmplitude: 1.0,
    hungerReduction: 5,
    countPerClick: [3, 5],
    landedTtl: 5000,
    rotates: false,
  },
  pellet: {
    type: 'pellet',
    label: '오독오독 펠릿',
    color: '#F07820',
    assets: ['assets/food/pellet.svg'],
    fallSpeedRange: [8, 12],
    swayAmplitude: 0,
    hungerReduction: 15,
    countPerClick: [1, 2],
    landedTtl: 8000,
    rotates: false,
  },
  bloodworm: {
    type: 'bloodworm',
    label: '냉동 장구벌레',
    color: '#C0392B',
    assets: ['assets/food/bloodworm.svg'],
    fallSpeedRange: [6, 8],
    swayAmplitude: 0,
    hungerReduction: 25,
    countPerClick: [1, 1],
    landedTtl: 5000,
    rotates: true,
  },
};

export const DEFAULT_FOOD_TYPE = 'pellet';
export const FOOD_TYPES = /** @type {const} */ (['flake', 'pellet', 'bloodworm']);
