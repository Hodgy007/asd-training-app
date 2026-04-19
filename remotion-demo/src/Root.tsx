import { Composition } from "remotion";
import { DemoComposition } from "./Composition";
import { DEFAULT_VOICEOVER, OrgPitchComposition } from "./OrgPitchComposition";
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
        durationInFrames={2280}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ theme: aaaDark, voiceover: undefined }}
      />
      <Composition
        id="OrgPitchLight"
        component={OrgPitchComposition}
        durationInFrames={2280}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ theme: aaaLight, voiceover: undefined }}
      />
      <Composition
        id="OrgPitchDarkVO"
        component={OrgPitchComposition}
        durationInFrames={2280}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ theme: aaaDark, voiceover: DEFAULT_VOICEOVER }}
      />
      <Composition
        id="OrgPitchLightVO"
        component={OrgPitchComposition}
        durationInFrames={2280}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ theme: aaaLight, voiceover: DEFAULT_VOICEOVER }}
      />
    </>
  );
};
