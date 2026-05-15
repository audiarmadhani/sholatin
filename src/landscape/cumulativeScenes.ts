import type { ImageSourcePropType } from 'react-native';

/**
 * Cumulative full-frame art: index matches unlock tier order in `unlock_catalog.json`.
 * Example: `assets/landscape/default/cumulative/02-mountains_1/mountain_1.png`
 */
const CUMULATIVE_SCENES: ImageSourcePropType[] = [
  require('../../assets/landscape/default/cumulative/01-terrain/terrain.png'),
  require('../../assets/landscape/default/cumulative/02-mountains_1/mountain_1.png'),
  require('../../assets/landscape/default/cumulative/03-mountains_2/mountain_2.png'),
  require('../../assets/landscape/default/cumulative/04-mountains_3/mountain_3.png'),
  require('../../assets/landscape/default/cumulative/05-mosque/mosque.png'),
  require('../../assets/landscape/default/cumulative/06-river/river.png'),
  require('../../assets/landscape/default/cumulative/07-bridge/bridge.png'),
  require('../../assets/landscape/default/cumulative/08-grass_1/grass_1.png'),
  require('../../assets/landscape/default/cumulative/09-grass_2/grass_2.png'),
  require('../../assets/landscape/default/cumulative/10-grass_3/grass_3.png'),
  require('../../assets/landscape/default/cumulative/11-grass_4/grass_4.png'),
  require('../../assets/landscape/default/cumulative/12-trees_1/trees_1.png'),
  require('../../assets/landscape/default/cumulative/13-trees_2/trees_2.png'),
  require('../../assets/landscape/default/cumulative/14-trees_3/trees_3.png'),
  require('../../assets/landscape/default/cumulative/15-trees_4/trees_4.png'),
  require('../../assets/landscape/default/cumulative/16-stones_1/stone_1.png'),
  require('../../assets/landscape/default/cumulative/17-stones_2/stone_2.png'),
  require('../../assets/landscape/default/cumulative/18-birds_1/birds_1.png'),
  require('../../assets/landscape/default/cumulative/19-birds_2/birds_2.png'),
  require('../../assets/landscape/default/cumulative/20-clouds_1/clouds_1.png'),
  require('../../assets/landscape/default/cumulative/21-clouds_2/clouds_2.png'),
];

export function getCumulativeSceneCount(): number {
  return CUMULATIVE_SCENES.length;
}

export function getCumulativeSceneSource(highestUnlockedTierIndex: number): ImageSourcePropType | undefined {
  if (CUMULATIVE_SCENES.length === 0) return undefined;
  const i = Math.max(0, Math.min(highestUnlockedTierIndex, CUMULATIVE_SCENES.length - 1));
  return CUMULATIVE_SCENES[i];
}
