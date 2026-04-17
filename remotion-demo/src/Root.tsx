import { Composition } from "remotion";
import { DemoComposition } from "./Composition";
import "./index.css";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AsdDemo"
      component={DemoComposition}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
