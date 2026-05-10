import bluePufferUrl from './fish/blue-puffer-fish.png?url';
import longBlueUrl from './fish/long-blue-fish.png?url';
import nimoUrl from './fish/nimo.png?url';
import orangeSquidUrl from './fish/orange-squid.png?url';
import redRoundUrl from './fish/red-round-fish.png?url';
import sharkUrl from './fish/shark.png?url';
import deco1Url from './deco/deco-1.png?url';
import deco2Url from './deco/deco-2.png?url';
import deco3Url from './deco/deco-3.png?url';
import deco4Url from './deco/deco-4.png?url';
import deco5Url from './deco/deco-5.png?url';

const FISH_DEFAULT_SIZE = 96;
const DECO_DEFAULT_SIZE = 110;

export const DEFAULT_OBJECTS_MANIFEST = [
  {
    id: 'fish-blue-puffer',
    type: 'fish',
    name: '복어',
    spriteUrl: bluePufferUrl,
    defaultSize: FISH_DEFAULT_SIZE,
    defaultMovementEnabled: true,
    defaultSpeedMultiplier: 0.9,
  },
  {
    id: 'fish-long-blue',
    type: 'fish',
    name: '파랑이',
    spriteUrl: longBlueUrl,
    defaultSize: FISH_DEFAULT_SIZE,
    defaultMovementEnabled: true,
    defaultSpeedMultiplier: 1.1,
  },
  {
    id: 'fish-nimo',
    type: 'fish',
    name: '니모',
    spriteUrl: nimoUrl,
    defaultSize: FISH_DEFAULT_SIZE,
    defaultMovementEnabled: true,
    defaultSpeedMultiplier: 1.0,
  },
  {
    id: 'fish-orange-squid',
    type: 'fish',
    name: '오징어',
    spriteUrl: orangeSquidUrl,
    defaultSize: FISH_DEFAULT_SIZE,
    defaultMovementEnabled: true,
    defaultSpeedMultiplier: 0.8,
  },
  {
    id: 'fish-red-round',
    type: 'fish',
    name: '빨강이',
    spriteUrl: redRoundUrl,
    defaultSize: FISH_DEFAULT_SIZE,
    defaultMovementEnabled: true,
    defaultSpeedMultiplier: 0.9,
  },
  {
    id: 'fish-shark',
    type: 'fish',
    name: '상어',
    spriteUrl: sharkUrl,
    defaultSize: FISH_DEFAULT_SIZE,
    defaultMovementEnabled: true,
    defaultSpeedMultiplier: 1.2,
  },
  {
    id: 'deco-1',
    type: 'deco',
    name: '장식 1',
    spriteUrl: deco1Url,
    defaultSize: DECO_DEFAULT_SIZE,
    defaultMovementEnabled: false,
  },
  {
    id: 'deco-2',
    type: 'deco',
    name: '장식 2',
    spriteUrl: deco2Url,
    defaultSize: DECO_DEFAULT_SIZE,
    defaultMovementEnabled: false,
  },
  {
    id: 'deco-3',
    type: 'deco',
    name: '장식 3',
    spriteUrl: deco3Url,
    defaultSize: DECO_DEFAULT_SIZE,
    defaultMovementEnabled: false,
  },
  {
    id: 'deco-4',
    type: 'deco',
    name: '장식 4',
    spriteUrl: deco4Url,
    defaultSize: DECO_DEFAULT_SIZE,
    defaultMovementEnabled: false,
  },
  {
    id: 'deco-5',
    type: 'deco',
    name: '장식 5',
    spriteUrl: deco5Url,
    defaultSize: DECO_DEFAULT_SIZE,
    defaultMovementEnabled: false,
  },
];
