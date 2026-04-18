import { Composition } from "remotion";
import { DemoComposition } from "./Composition";
import { OrgPitchComposition } from "./OrgPitchComposition";
import { aaaDark, aaaLight } from "./theme";
import "./index.css";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AsdDemo"
        component={DemoComposition}
        durationInFrames={1350}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="OrgPitchDark"
        component={OrgPitchComposition}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ theme: aaaDark }}
      />
      <Composition
        id="OrgPitchLight"
        component={OrgPitchComposition}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ theme: aaaLight }}
      />
    </>
  );
};
