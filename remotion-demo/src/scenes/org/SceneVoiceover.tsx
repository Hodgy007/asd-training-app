import { Audio, staticFile } from "remotion";

export const SceneVoiceover: React.FC<{
  src?: string;
  durationInFrames: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}> = ({ src, durationInFrames, fadeInFrames = 6, fadeOutFrames = 12 }) => {
  if (!src) return null;
  return (
    <Audio
      src={staticFile(src)}
      volume={(f) => {
        const fadeIn = Math.min(Math.max(f / fadeInFrames, 0), 1);
        const fadeOut = Math.min(
          Math.max((durationInFrames - f) / fadeOutFrames, 0),
          1,
        );
        return Math.min(fadeIn, fadeOut);
      }}
    />
  );
};
