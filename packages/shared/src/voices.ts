/**
 * Voice, personality and language catalogues.
 *
 * Voice ids must match the identifiers accepted by the configured OpenAI
 * Realtime model. They are listed here (rather than hard-coded across the app)
 * so a provider voice change is a one-file edit. `available: false` hides a
 * voice from the picker without breaking organisations already using it.
 */

export interface VoiceOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Rough character sketch shown under the name in the picker. */
  readonly traits: readonly string[];
  readonly available: boolean;
}

export const VOICE_CATALOG: readonly VoiceOption[] = [
  {
    id: 'marin',
    label: 'Marin',
    description: 'Warm and articulate. A natural default for most businesses.',
    traits: ['warm', 'clear', 'neutral'],
    available: true,
  },
  {
    id: 'cedar',
    label: 'Cedar',
    description: 'Calm and grounded with an even pace. Good for technical trades.',
    traits: ['calm', 'steady', 'lower pitch'],
    available: true,
  },
  {
    id: 'alloy',
    label: 'Alloy',
    description: 'Balanced and businesslike. Neutral and easy to understand.',
    traits: ['neutral', 'professional'],
    available: true,
  },
  {
    id: 'echo',
    label: 'Echo',
    description: 'Crisp and direct. Keeps calls moving briskly.',
    traits: ['direct', 'crisp'],
    available: true,
  },
  {
    id: 'shimmer',
    label: 'Shimmer',
    description: 'Bright and upbeat. Suits consumer-facing service businesses.',
    traits: ['bright', 'energetic'],
    available: true,
  },
  {
    id: 'ash',
    label: 'Ash',
    description: 'Relaxed and conversational with a friendly edge.',
    traits: ['relaxed', 'friendly'],
    available: true,
  },
  {
    id: 'ballad',
    label: 'Ballad',
    description: 'Expressive and personable. Good for hospitality-style greetings.',
    traits: ['expressive', 'personable'],
    available: true,
  },
  {
    id: 'coral',
    label: 'Coral',
    description: 'Approachable and reassuring. Works well for emergency intake.',
    traits: ['reassuring', 'approachable'],
    available: true,
  },
  {
    id: 'sage',
    label: 'Sage',
    description: 'Measured and thoughtful. Reads as experienced and senior.',
    traits: ['measured', 'thoughtful'],
    available: true,
  },
  {
    id: 'verse',
    label: 'Verse',
    description: 'Lively with natural intonation. Avoids sounding scripted.',
    traits: ['lively', 'natural'],
    available: true,
  },
];

export const DEFAULT_VOICE_ID = 'marin';

export function getVoice(id: string | null | undefined): VoiceOption {
  return (
    VOICE_CATALOG.find((v) => v.id === id) ??
    VOICE_CATALOG.find((v) => v.id === DEFAULT_VOICE_ID)!
  );
}

export function availableVoices(): VoiceOption[] {
  return VOICE_CATALOG.filter((v) => v.available);
}

export function isValidVoice(id: string): boolean {
  return VOICE_CATALOG.some((v) => v.id === id && v.available);
}

/* -------------------------------------------------------------------------- */
/* Personality presets                                                        */
/* -------------------------------------------------------------------------- */

export type PersonalityId =
  | 'professional'
  | 'friendly'
  | 'warm'
  | 'energetic'
  | 'calm'
  | 'direct';

export interface PersonalityPreset {
  readonly id: PersonalityId;
  readonly label: string;
  readonly summary: string;
  /** Injected verbatim into the realtime system prompt. */
  readonly promptFragment: string;
}

export const PERSONALITY_PRESETS: readonly PersonalityPreset[] = [
  {
    id: 'professional',
    label: 'Professional',
    summary: 'Polished and efficient. Business-first phrasing.',
    promptFragment:
      'Speak in a polished, professional register. Be efficient and precise. Avoid slang and filler. Keep pleasantries brief and move the caller toward what they need.',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    summary: 'Conversational and easy-going without being casual.',
    promptFragment:
      'Speak in a friendly, conversational register. Use natural contractions and short acknowledgements ("got it", "sure thing"). Stay professional — you represent the business.',
  },
  {
    id: 'warm',
    label: 'Warm',
    summary: 'Reassuring. Good when callers are stressed or dealing with damage.',
    promptFragment:
      'Speak warmly and reassuringly. Acknowledge the caller\'s situation before moving on ("that sounds stressful, let\'s get someone out to you"). Never rush a distressed caller.',
  },
  {
    id: 'energetic',
    label: 'Energetic',
    summary: 'Upbeat and quick. Suits high-volume consumer services.',
    promptFragment:
      'Speak with upbeat energy and a brisk pace. Be enthusiastic but never pushy, and never oversell.',
  },
  {
    id: 'calm',
    label: 'Calm',
    summary: 'Steady and unhurried. Suits technical or high-ticket work.',
    promptFragment:
      'Speak calmly and at an unhurried pace. Leave small pauses so the caller can think. Never sound rushed, even when collecting several details.',
  },
  {
    id: 'direct',
    label: 'Direct',
    summary: 'Minimal small talk. Straight to gathering what is needed.',
    promptFragment:
      'Be direct and economical. Skip small talk. Ask one clear question at a time and confirm answers succinctly.',
  },
];

export const DEFAULT_PERSONALITY: PersonalityId = 'friendly';

export function getPersonality(id: string | null | undefined): PersonalityPreset {
  return (
    PERSONALITY_PRESETS.find((p) => p.id === id) ??
    PERSONALITY_PRESETS.find((p) => p.id === DEFAULT_PERSONALITY)!
  );
}

/* -------------------------------------------------------------------------- */
/* Speaking style                                                             */
/* -------------------------------------------------------------------------- */

export type SpeakingPace = 'slow' | 'natural' | 'brisk';
export type ResponseLength = 'concise' | 'balanced' | 'thorough';

export const PACE_OPTIONS: ReadonlyArray<{ id: SpeakingPace; label: string; fragment: string }> = [
  { id: 'slow', label: 'Slower', fragment: 'Speak noticeably slowly and enunciate clearly.' },
  { id: 'natural', label: 'Natural', fragment: 'Speak at a natural conversational pace.' },
  { id: 'brisk', label: 'Brisk', fragment: 'Speak at a brisk but still clearly intelligible pace.' },
];

export const LENGTH_OPTIONS: ReadonlyArray<{ id: ResponseLength; label: string; fragment: string }> = [
  {
    id: 'concise',
    label: 'Concise',
    fragment: 'Keep every reply to one or two short sentences. Never monologue.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    fragment: 'Keep replies to two or three sentences unless the caller asks for detail.',
  },
  {
    id: 'thorough',
    label: 'Thorough',
    fragment:
      'You may give fuller explanations when the caller asks a substantive question, but still pause frequently for the caller to respond.',
  },
];

/* -------------------------------------------------------------------------- */
/* Languages                                                                  */
/* -------------------------------------------------------------------------- */

export type LanguageId = 'en' | 'es' | 'auto';

export interface LanguageOption {
  readonly id: LanguageId;
  readonly label: string;
  readonly description: string;
  readonly promptFragment: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    id: 'en',
    label: 'English',
    description: 'The receptionist always speaks English.',
    promptFragment: 'Always speak English, regardless of the language the caller uses.',
  },
  {
    id: 'es',
    label: 'Spanish',
    description: 'The receptionist always speaks Spanish.',
    promptFragment: 'Habla siempre en español, sin importar el idioma que use la persona que llama.',
  },
  {
    id: 'auto',
    label: 'Multilingual (auto-detect)',
    description:
      'The receptionist replies in the caller\'s language when the underlying model supports it. English and Spanish are verified; other languages are best-effort.',
    promptFragment:
      "Detect the caller's language from their first utterance and reply in that language for the rest of the call. English and Spanish are fully supported. If you cannot understand or reliably speak the caller's language, say so in English and offer to transfer or take a message.",
  },
];

export const DEFAULT_LANGUAGE: LanguageId = 'en';

export function getLanguage(id: string | null | undefined): LanguageOption {
  return (
    LANGUAGE_OPTIONS.find((l) => l.id === id) ??
    LANGUAGE_OPTIONS.find((l) => l.id === DEFAULT_LANGUAGE)!
  );
}

/* -------------------------------------------------------------------------- */
/* AI disclosure                                                              */
/* -------------------------------------------------------------------------- */

export type DisclosureSetting = 'upfront' | 'on_request';

export const DISCLOSURE_OPTIONS: ReadonlyArray<{
  id: DisclosureSetting;
  label: string;
  description: string;
}> = [
  {
    id: 'upfront',
    label: 'Announce in the greeting',
    description:
      'The greeting states that the caller has reached a virtual/AI receptionist. Recommended, and required in some jurisdictions.',
  },
  {
    id: 'on_request',
    label: 'Answer truthfully if asked',
    description:
      'The greeting does not lead with it, but the receptionist always answers truthfully when a caller asks whether they are speaking to a person. It will never claim to be human.',
  },
];
