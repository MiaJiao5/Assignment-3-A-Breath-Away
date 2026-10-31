import type { Language } from '../i18n/translations';

// Owner-supplied headphone-interlude recordings. WAV and MP3 both work.
// Replace these local URLs for future recordings, or use null to opt into
// gentle system speech over the ambient pad without requesting missing files.
export const INTRO_VOICE_URLS: Record<Language, string | null> = {
  en: '/audio/intro-voice-en.wav',
  zh: '/audio/intro-voice-zh.mp3',
};
