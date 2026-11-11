export type TextureMap = 'color' | 'normal' | 'rough' | 'thumb';

export const textureUrl = (set: string, map: TextureMap): string =>
  `/assets/textures/${set}/${map}.jpg`;
