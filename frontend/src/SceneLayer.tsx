import React from 'react';
import { renderScene, type SceneSpec } from './surfaceSceneArt';

// Illustrated day/night scene for pixel-art Surface Themes — a
// fixed, horizon-anchored overlay, structurally identical to
// SurfaceFx.tsx's SurfaceFxLayer (same `position: fixed; inset: 0; z-index:
// -1` composition so it layers under the UI exactly like the existing
// motion-fx layer does, see App.tsx's SurfaceFxLayer mount). The normal
// gradient background (getSurfaceBackgroundStyle) still renders underneath,
// unmodified — this is a horizon illustration painted on top of it, faded
// out toward the top of the viewport so it reads as "distant scenery"
// rather than a wallpaper.

interface SceneLayerProps {
  scene: SceneSpec;
  isDark: boolean;
}

export const SceneLayer: React.FC<SceneLayerProps> = ({ scene, isDark }) => {
  return (
    <div className={`scene-layer${isDark ? '' : ' scene-layer-light'}`} aria-hidden>
      <div className="scene-layer-art">{renderScene(scene, isDark)}</div>
    </div>
  );
};
