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

export type Voiceover = {
  hero?: string;
  who?: string;
  opportunity?: string;
  training?: string;
  internship?: string;
  platform?: string;
  partnership?: string;
  cta?: string;
};

const DURATIONS = {
  hero: 210,
  who: 300,
  opportunity: 315,
  training: 330,
  internship: 330,
  platform: 300,
  partnership: 300,
  cta: 300,
};

export const OrgPitchComposition: React.FC<{
  theme: Theme;
  voiceover?: Voiceover;
}> = ({ theme, voiceover }) => {
  const vo = voiceover ?? {};
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={DURATIONS.hero}>
          <SceneOrgHero theme={theme} voiceoverSrc={vo.hero} durationInFrames={DURATIONS.hero} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={DURATIONS.who}>
          <SceneOrgWho theme={theme} voiceoverSrc={vo.who} durationInFrames={DURATIONS.who} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={DURATIONS.opportunity}>
          <SceneOrgOpportunity
            theme={theme}
            voiceoverSrc={vo.opportunity}
            durationInFrames={DURATIONS.opportunity}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={DURATIONS.training}>
          <SceneOrgTraining
            theme={theme}
            voiceoverSrc={vo.training}
            durationInFrames={DURATIONS.training}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={DURATIONS.internship}>
          <SceneOrgInternship
            theme={theme}
            voiceoverSrc={vo.internship}
            durationInFrames={DURATIONS.internship}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={DURATIONS.platform}>
          <SceneOrgPlatform
            theme={theme}
            voiceoverSrc={vo.platform}
            durationInFrames={DURATIONS.platform}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={DURATIONS.partnership}>
          <SceneOrgPartnership
            theme={theme}
            voiceoverSrc={vo.partnership}
            durationInFrames={DURATIONS.partnership}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={DURATIONS.cta}>
          <SceneOrgCTA theme={theme} voiceoverSrc={vo.cta} durationInFrames={DURATIONS.cta} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const DEFAULT_VOICEOVER: Voiceover = {
  hero: "voiceover/scene1-hero.mp3",
  who: "voiceover/scene2-who.mp3",
  opportunity: "voiceover/scene3-opportunity.mp3",
  training: "voiceover/scene4-training.mp3",
  internship: "voiceover/scene5-internship.mp3",
  platform: "voiceover/scene6-platform.mp3",
  partnership: "voiceover/scene7-partnership.mp3",
  cta: "voiceover/scene8-cta.mp3",
};
