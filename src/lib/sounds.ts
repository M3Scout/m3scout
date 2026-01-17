// Sound feedback for live match events
// Using Web Audio API for instant, lightweight sounds

type SoundType = 
  | 'goal' 
  | 'assist' 
  | 'card_yellow' 
  | 'card_red' 
  | 'save' 
  | 'tackle' 
  | 'dribble' 
  | 'shot' 
  | 'pass' 
  | 'interception'
  | 'recovery'
  | 'foul'
  | 'stat' 
  | 'enter' 
  | 'exit' 
  | 'error'
  | 'whistle'
  | 'success';

const audioContext = typeof window !== 'undefined' 
  ? new (window.AudioContext || (window as any).webkitAudioContext)()
  : null;

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  if (!audioContext) return;
  
  // Resume context if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

function playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  frequencies.forEach(freq => playTone(freq, duration, type, volume));
}

// Play a sequence of notes with delays
function playSequence(notes: Array<{ freq: number; delay: number; duration: number; type?: OscillatorType; volume?: number }>) {
  notes.forEach(note => {
    setTimeout(() => {
      playTone(note.freq, note.duration, note.type || 'triangle', note.volume || 0.2);
    }, note.delay);
  });
}

export function playSound(type: SoundType) {
  switch (type) {
    case 'goal':
      // Triumphant fanfare - rising celebratory chord
      playChord([261.63, 329.63, 392.00, 523.25], 0.6, 'triangle', 0.25);
      setTimeout(() => playChord([329.63, 392.00, 523.25, 659.25], 0.4, 'triangle', 0.2), 150);
      break;
    
    case 'assist':
      // Bright ascending two notes - supportive feel
      playSequence([
        { freq: 392.00, delay: 0, duration: 0.12, volume: 0.22 },
        { freq: 493.88, delay: 80, duration: 0.12, volume: 0.22 },
        { freq: 587.33, delay: 160, duration: 0.18, volume: 0.25 },
      ]);
      break;
    
    case 'card_yellow':
      // Warning tone - mid-range buzz
      playTone(349.23, 0.25, 'sawtooth', 0.12);
      setTimeout(() => playTone(349.23, 0.15, 'sawtooth', 0.08), 200);
      break;
    
    case 'card_red':
      // Serious warning - low double buzz
      playTone(196.00, 0.3, 'sawtooth', 0.15);
      setTimeout(() => playTone(146.83, 0.4, 'sawtooth', 0.18), 250);
      break;
    
    case 'save':
      // Quick heroic sound - goalkeeper save
      playSequence([
        { freq: 440, delay: 0, duration: 0.08, volume: 0.2 },
        { freq: 554.37, delay: 60, duration: 0.1, volume: 0.22 },
        { freq: 659.25, delay: 120, duration: 0.15, volume: 0.25 },
      ]);
      break;
    
    case 'tackle':
      // Sharp impact sound
      playTone(220, 0.08, 'square', 0.15);
      setTimeout(() => playTone(165, 0.06, 'square', 0.1), 50);
      break;
    
    case 'dribble':
      // Quick flick sound - agile
      playSequence([
        { freq: 523.25, delay: 0, duration: 0.06, volume: 0.15 },
        { freq: 659.25, delay: 40, duration: 0.08, volume: 0.18 },
      ]);
      break;
    
    case 'shot':
      // Powerful kick sound
      playTone(130.81, 0.12, 'triangle', 0.2);
      setTimeout(() => playTone(261.63, 0.1, 'triangle', 0.15), 60);
      break;
    
    case 'pass':
      // Subtle swoosh - clean pass
      playTone(587.33, 0.06, 'sine', 0.1);
      break;
    
    case 'interception':
      // Alert cut sound
      playSequence([
        { freq: 440, delay: 0, duration: 0.05, volume: 0.12 },
        { freq: 330, delay: 40, duration: 0.08, volume: 0.15 },
      ]);
      break;
    
    case 'recovery':
      // Positive reclaim sound
      playTone(392, 0.1, 'triangle', 0.12);
      setTimeout(() => playTone(440, 0.08, 'triangle', 0.1), 60);
      break;
    
    case 'foul':
      // Low thud - negative action
      playTone(180, 0.15, 'sawtooth', 0.1);
      break;
    
    case 'stat':
      // Generic subtle click/tap
      playTone(880, 0.04, 'sine', 0.08);
      break;
    
    case 'enter':
      // Rising arpeggio - player entering
      playSequence([
        { freq: 330, delay: 0, duration: 0.08, volume: 0.12 },
        { freq: 392, delay: 50, duration: 0.08, volume: 0.14 },
        { freq: 494, delay: 100, duration: 0.12, volume: 0.16 },
      ]);
      break;
    
    case 'exit':
      // Descending notes - player exiting
      playSequence([
        { freq: 494, delay: 0, duration: 0.08, volume: 0.12 },
        { freq: 392, delay: 50, duration: 0.08, volume: 0.1 },
        { freq: 330, delay: 100, duration: 0.12, volume: 0.08 },
      ]);
      break;
    
    case 'whistle':
      // Referee whistle sound
      playTone(1200, 0.3, 'sine', 0.15);
      setTimeout(() => playTone(1400, 0.2, 'sine', 0.12), 150);
      break;
    
    case 'success':
      // General success confirmation
      playSequence([
        { freq: 523.25, delay: 0, duration: 0.08, volume: 0.15 },
        { freq: 659.25, delay: 60, duration: 0.12, volume: 0.18 },
      ]);
      break;
    
    case 'error':
      // Low error buzz
      playTone(150, 0.2, 'sawtooth', 0.1);
      break;
  }
}

// Map event types to sound types - comprehensive mapping
export function getSoundForEvent(eventType: string): SoundType {
  switch (eventType) {
    // Goals & Scoring
    case 'goal':
      return 'goal';
    case 'assist':
      return 'assist';
    
    // Shots
    case 'shot':
    case 'shot_on_target':
      return 'shot';
    
    // Passing & Creation
    case 'pass_success':
    case 'pass_total':
    case 'key_pass':
    case 'chance_created':
      return 'pass';
    
    // Dribbling
    case 'dribble_success':
    case 'dribble_attempt':
      return 'dribble';
    
    // Defense
    case 'tackle':
      return 'tackle';
    case 'interception':
      return 'interception';
    case 'recovery':
    case 'clearance':
      return 'recovery';
    case 'duel_won':
    case 'duel_total':
    case 'aerial_duel_won':
      return 'tackle';
    
    // Discipline
    case 'yellow':
      return 'card_yellow';
    case 'red':
      return 'card_red';
    case 'foul_committed':
      return 'foul';
    case 'foul_suffered':
      return 'whistle';
    
    // Goalkeeper
    case 'save':
    case 'box_save':
    case 'penalty_saved':
      return 'save';
    case 'goal_conceded':
      return 'error';
    case 'clean_sheet':
    case 'high_claim':
    case 'punch':
    case 'sweeper_action':
      return 'success';
    
    // Substitution
    case 'substitution':
      return 'whistle';
    
    // Possession
    case 'possession_lost':
      return 'foul';
    
    // Default
    default:
      return 'stat';
  }
}
