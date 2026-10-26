// User-supplied fixed colors, mapped to the game's nine palette regions.
const regions = ['Coat Top', 'Coat Bottom', 'Hair', 'Hoof', 'Nose', 'Sock', 'Keratin', 'Paint', 'Pattern'];
export const mutatedPalettes = [
  ['Solar', ['#FFDF44', '#FECC32', '#B72908', '#FFFFFF', '#FEECA0', '#FFFAC5', '#FFFFFF', '#FF9E30', '#FF4800']],
  ['Lunar', ['#9AC6E1', '#CCE0FF', '#E2F7FF', '#0B0E28', '#7693B4', '#303C61', '#FFFFFF', '#5860A3', '#7693B4']],
  ['Astral', ['#E0AAFE', '#E0AAFE', '#E0AAFE', '#C67DFF', '#EBC8FE', '#EBC8FE', '#CFB8FC', '#C67DFF', '#C67DFF']],
  ['Heavenly', Array(9).fill('#FFFFFF')],
  ['Void', Array(9).fill('#000000')]
].map(([name, colors]) => ({
  id: `mutated-palette-${name.toLowerCase()}`,
  name,
  group: 'Mutated',
  natural: false,
  complete: true,
  description: `Fixed ${name} colors across all nine horse regions. Special-spawn rolls and mutation effects are not enabled by selecting this palette.`,
  colors: Object.fromEntries(regions.map((region, index) => [region, colors[index]]))
}));
