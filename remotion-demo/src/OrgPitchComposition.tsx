import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill } from "remotion";
import { SceneOrgCTA } from "./scenes/org/SceneOrgCTA";
import { SceneOrgHero } from "./scenes/org/SceneOrgHero";
import { SceneOrgInternship } from "./scenes/org/SceneOrgInternship";
import { SceneOrgOpportunity } from "./scenes/org/SceneOrgOpportunity";
import { SceneOrgPartnership } from "./scenes/org/SceneOrgPartnership";
import { SceneOrgPlatform } from "./scenes/org/SceneOrgPlatform";
import { SceneOrgTraining } from "./scenes/org/SceneOrgTraining";
import { SceneOrgWho } from "./scenes/org/SceneOrgWho";
import { Theme } from "./theme";

const TRANSITION_FRAMES = 15;

export const OrgPitchComposition: React.FC<{ theme: Theme }> = ({ theme }) => {
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}>
          <SceneOrgHero theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={240}>
          <SceneOrgWho theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={255}>
          <SceneOrgOpportunity theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={270}>
          <SceneOrgTraining theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={270}>
          <SceneOrgInternship theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={240}>
          <SceneOrgPlatform theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={240}>
          <SceneOrgPartnership theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={240}>
          <SceneOrgCTA theme={theme} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
