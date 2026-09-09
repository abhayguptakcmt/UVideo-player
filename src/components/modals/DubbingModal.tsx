import React, { useState, useEffect } from 'react';
import {
  X,
  Mic,
  Volume2,
  Sparkles,
  Play,
  Check,
  User,
  Users,
  Sliders,
  RefreshCw,
  Plus,
  Trash2,
  AudioWaveform
} from 'lucide-react';
import { DubbingSettings, SubtitleCue, CharacterVoiceProfile, CharacterVibe } from '../../types';
import { SUPPORTED_LANGUAGES } from '../../services/languages';
import {
  speakSubtitleCue,
  stopDubbingSpeech,
  unlockSpeechSynthesis,
  previewCharacterVoice,
  getVoicesForLanguage
} from '../../services/speechSynthesisService';
import {
  CHARACTER_VIBES,
  buildDefaultCharacterProfiles,
  analyzeAndTagCueCharacters
} from '../../services/characterVoiceService';

interface DubbingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DubbingSettings;
  onUpdateSettings: (newSettings: Partial<DubbingSettings>) => void;
  activeCue: SubtitleCue | null;
  cues?: SubtitleCue[];
}

export const DubbingModal: React.FC<DubbingModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  activeCue,
  cues = []
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'naturalEngine'>('characters');
  const [testPlaying, setTestPlaying] = useState(false);
  const [playingCharacterId, setPlayingCharacterId] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [showAddCharacter, setShowAddCharacter] = useState(false);

  // Load voices for current target language
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const v = getVoicesForLanguage(settings.targetLanguage);
        setAvailableVoices(v);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [settings.targetLanguage]);

  // Auto-initialize character profiles if none exist and cues are present
  useEffect(() => {
    if (isOpen) {
      const currentProfiles = settings.characterProfiles || {};
      const profileKeys = Object.keys(currentProfiles);

      if (profileKeys.length === 0) {
        const analysis = analyzeAndTagCueCharacters(cues);
        const speakers = analysis.detectedSpeakers.length > 0 ? analysis.detectedSpeakers : ['Narrator'];
        const built = buildDefaultCharacterProfiles(speakers, availableVoices, settings.targetLanguage);
        onUpdateSettings({ characterProfiles: built });
      }
    }
  }, [isOpen, cues, settings.characterProfiles, availableVoices, settings.targetLanguage, onUpdateSettings]);

  if (!isOpen) return null;

  const characterList: CharacterVoiceProfile[] = Object.values(settings.characterProfiles || {});

  const handleTestGlobalVoice = () => {
    unlockSpeechSynthesis();
    setTestPlaying(true);
    setPlayingCharacterId(null);

    const sampleText =
      activeCue?.translation ||
      activeCue?.text ||
      'This is a preview of natural AI voice dubbing synchronized with playback.';

    speakSubtitleCue(
      {
        id: 'sample-test',
        startTime: 0,
        endTime: 5,
        text: sampleText,
        translation: sampleText
      },
      settings,
      () => setTestPlaying(true),
      () => setTestPlaying(false)
    );
  };

  const handleStopTest = () => {
    stopDubbingSpeech();
    setTestPlaying(false);
    setPlayingCharacterId(null);
  };

  const handlePreviewCharacter = (profile: CharacterVoiceProfile) => {
    unlockSpeechSynthesis();
    setPlayingCharacterId(profile.id);
    setTestPlaying(true);

    previewCharacterVoice(
      profile,
      settings.targetLanguage,
      () => {
        setPlayingCharacterId(profile.id);
        setTestPlaying(true);
      },
      () => {
        setPlayingCharacterId(null);
        setTestPlaying(false);
      }
    );
  };

  const handleUpdateCharacter = (name: string, updates: Partial<CharacterVoiceProfile>) => {
    const current = { ...(settings.characterProfiles || {}) };
    if (current[name]) {
      current[name] = { ...current[name], ...updates };
      onUpdateSettings({ characterProfiles: current });
    }
  };

  const handleAddCharacter = () => {
    const trimmed = newCharacterName.trim();
    if (!trimmed) return;

    const current = { ...(settings.characterProfiles || {}) };
    const index = Object.keys(current).length;
    const defaultVibes: CharacterVibe[] = ['warm', 'excited', 'calm', 'dramatic', 'authoritative', 'playful'];
    const vibe = defaultVibes[index % defaultVibes.length];
    const vibeDef = CHARACTER_VIBES[vibe];

    current[trimmed] = {
      id: `char-${Date.now()}`,
      name: trimmed,
      gender: 'neutral',
      vibe,
      pitchOffset: vibeDef.pitchOffset,
      rateOffset: vibeDef.rateOffset,
      color: vibeDef.color
    };

    onUpdateSettings({ characterProfiles: current });
    setNewCharacterName('');
    setShowAddCharacter(false);
  };

  const handleDeleteCharacter = (name: string) => {
    const current = { ...(settings.characterProfiles || {}) };
    delete current[name];
    onUpdateSettings({ characterProfiles: current });
  };

  const handleAutoDetectFromCues = () => {
    const analysis = analyzeAndTagCueCharacters(cues);
    const speakers = analysis.detectedSpeakers.length > 0 ? analysis.detectedSpeakers : ['Narrator', 'Speaker 2'];
    const built = buildDefaultCharacterProfiles(speakers, availableVoices, settings.targetLanguage);
    onUpdateSettings({ characterProfiles: built });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/40">
              <AudioWaveform className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>AI Voice Dubbing &amp; Character Studio</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Multi-Voice &amp; Vibes
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Every video character speaks in their own unique voice, emotional vibe &amp; feel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master AI Dubbing Switch */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-purple-950/60 to-indigo-950/40 border border-purple-700/50">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-purple-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Enable AI Dubbing Playback</span>
              </div>
              <p className="text-[11px] text-purple-300/80">
                When ON: Video original audio stops completely and dubbed character voices play. When OFF: Original audio automatically restores.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => onUpdateSettings({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'characters'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Character Voices &amp; Vibes ({characterList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('naturalEngine')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'naturalEngine'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Natural Prosody &amp; Cadence Engine</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'characters' ? (
            <div className="space-y-4">
              {/* Actions Header */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-300 font-medium">
                  Configured Video Character Profiles:
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoDetectFromCues}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    title="Auto-detect speakers and dialogue turns from subtitles"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Auto-Detect Characters</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCharacter(!showAddCharacter)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600/80 hover:bg-purple-600 text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Character</span>
                  </button>
                </div>
              </div>

              {/* Add Character Form */}
              {showAddCharacter && (
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-purple-500/40 flex items-center gap-2 animate-in fade-in">
                  <User className="w-4 h-4 text-purple-400" />
                  <input
                    type="text"
                    placeholder="Enter character name (e.g. Alex, Narrator, Sarah)"
                    value={newCharacterName}
                    onChange={(e) => setNewCharacterName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCharacter()}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCharacter}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCharacter(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Character Cards List */}
              <div className="space-y-3">
                {characterList.map((character) => {
                  const vibeDef = CHARACTER_VIBES[character.vibe] || CHARACTER_VIBES.natural;
                  const isThisPlaying = testPlaying && playingCharacterId === character.id;

                  return (
                    <div
                      key={character.id}
                      className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3 hover:border-slate-600/80 transition-all"
                    >
                      {/* Character Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full ring-2 ring-white/10"
                            style={{ backgroundColor: character.color || vibeDef.color }}
                          />
                          <span className="font-bold text-sm text-white">{character.name}</span>
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold border"
                            style={{
                              backgroundColor: vibeDef.badgeBg,
                              color: vibeDef.color,
                              borderColor: `${vibeDef.color}40`
                            }}
                          >
                            {vibeDef.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={() => (isThisPlaying ? handleStopTest() : handlePreviewCharacter(character))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isThisPlaying
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-slate-700/80 hover:bg-slate-700 text-purple-300 hover:text-white'
                            }`}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{isThisPlaying ? 'Stop' : 'Preview Feel'}</span>
                          </button>

                          {/* Delete button (if more than 1 character) */}
                          {characterList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCharacter(character.name)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                              title="Delete character"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Character Voice & Vibe Config Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        {/* Vibe & Feel Selector */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Character Vibe &amp; Feel
                          </label>
                          <select
                            value={character.vibe}
                            onChange={(e) => {
                              const v = e.target.value as CharacterVibe;
                              const def = CHARACTER_VIBES[v];
                              handleUpdateCharacter(character.name, {
                                vibe: v,
                                pitchOffset: def.pitchOffset,
                                rateOffset: def.rateOffset,
                                color: def.color
                              });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                          >
                            {Object.values(CHARACTER_VIBES).map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Assigned Voice */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Assigned Voice
                          </label>
                          <select
                            value={character.voiceURI || ''}
                            onChange={(e) => {
                              const found = availableVoices.find((v) => v.voiceURI === e.target.value);
                              handleUpdateCharacter(character.name, {
                                voiceURI: found?.voiceURI,
                                voiceName: found?.name
                              });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 truncate"
                          >
                            <option value="">Default Natural Voice</option>
                            {availableVoices.map((v) => (
                              <option key={v.voiceURI} value={v.voiceURI}>
                                {v.name} ({v.lang})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Pitch Offset Fine-Tune */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
                            <span>Pitch Formant</span>
                            <span className="font-mono text-[10px] text-purple-300">
                              {character.pitchOffset >= 0 ? `+${character.pitchOffset}` : character.pitchOffset}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-0.3}
                            max={0.3}
                            step={0.05}
                            value={character.pitchOffset}
                            onChange={(e) =>
                              handleUpdateCharacter(character.name, {
                                pitchOffset: parseFloat(e.target.value)
                              })
                            }
                            className="w-full accent-purple-500 h-1 bg-slate-700 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Natural Engine Tab */
            <div className="space-y-4">
              {/* Natural Prosody Engine Toggle */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <AudioWaveform className="w-4 h-4 text-cyan-400" />
                    <span>Human Natural Prosody &amp; Cadence Engine</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dynamically modulates speaking cadence to fit subtitle timing without cutoffs, inserts realistic breath pauses at commas, and strips out bracketed stage notes (e.g. [Music], [Laughter]) so voices sound completely natural.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.naturalProsody !== false}
                  onChange={(e) => onUpdateSettings({ naturalProsody: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600 accent-purple-500 cursor-pointer mt-1"
                />
              </div>

              {/* Target Language */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dubbing Voice Language
                </label>
                <select
                  value={settings.targetLanguage}
                  onChange={(e) => onUpdateSettings({ targetLanguage: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={`dub-${lang.code}`} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Ducking Slider */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Original Video Audio Ducking</span>
                  </span>
                  <span className="font-mono text-xs text-purple-300">
                    {Math.round((settings.duckingVolume || 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.05}
                  value={settings.duckingVolume || 0}
                  onChange={(e) =>
                    onUpdateSettings({ duckingVolume: parseFloat(e.target.value) })
                  }
                  className="w-full accent-purple-500 h-1 bg-slate-700 rounded cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  When set to 0%, original video audio is silenced completely during dubbing for crystal-clear character voice isolation.
                </p>
              </div>

              {/* Global Speed & Pitch Base */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Base Speed / Cadence</span>
                    <span className="font-mono text-purple-300">{settings.rate || 1.0}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={1.4}
                    step={0.05}
                    value={settings.rate || 1.0}
                    onChange={(e) =>
                      onUpdateSettings({ rate: parseFloat(e.target.value) })
                    }
                    className="w-full accent-purple-500 h-1 bg-slate-700 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Base Voice Pitch</span>
                    <span className="font-mono text-purple-300">{settings.pitch || 1.0}</span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={1.2}
                    step={0.05}
                    value={settings.pitch || 1.0}
                    onChange={(e) =>
                      onUpdateSettings({ pitch: parseFloat(e.target.value) })
                    }
                    className="w-full accent-purple-500 h-1 bg-slate-700 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={testPlaying ? handleStopTest : handleTestGlobalVoice}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              testPlaying
                ? 'bg-rose-600/90 text-white border-rose-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{testPlaying ? 'Stop Voice Test' : 'Test Active Subtitle Cue'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-md shadow-purple-900/30"
          >
            Save &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );
};
