import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill } from "remotion";
import { SceneAudiences } from "./scenes/SceneAudiences";
import { SceneCareers } from "./scenes/SceneCareers";
import { SceneCTA } from "./scenes/SceneCTA";
import { SceneFeaturesGrid } from "./scenes/SceneFeaturesGrid";
import { SceneHero } from "./scenes/SceneHero";
import { SceneTrainingAI } from "./scenes/SceneTrainingAI";
import { SceneTrust } from "./scenes/SceneTrust";
import { theme } from "./theme";

export const TRANSITION_FRAMES = 15;

export const DemoComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={130}>
          <SceneHero />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={220}>
          <SceneAudiences />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={240}>
          <SceneTrainingAI />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={240}>
          <SceneCareers />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={240}>
          <SceneFeaturesGrid />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={195}>
          <SceneTrust />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={175}>
          <SceneCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
