// Sound feedback for live match events
// Using Web Audio API for instant, lightweight sounds

type SoundType = 'goal' | 'assist' | 'card' | 'save' | 'stat' | 'enter' | 'exit' | 'error';

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

export function playSound(type: SoundType) {
  switch (type) {
    case 'goal':
      // Triumphant chord - C major (C4, E4, G4, C5)
      playChord([261.63, 329.63, 392.00, 523.25], 0.5, 'triangle', 0.2);
      break;
    
    case 'assist':
      // Ascending two notes
      playTone(392.00, 0.15, 'triangle', 0.25); // G4
      setTimeout(() => playTone(523.25, 0.2, 'triangle', 0.25), 100); // C5
      break;
    
    case 'card':
      // Warning sound - low buzz
      playTone(220, 0.3, 'sawtooth', 0.15);
      break;
    
    case 'save':
      // Quick positive sound
      playTone(440, 0.1, 'sine', 0.2);
      setTimeout(() => playTone(554.37, 0.15, 'sine', 0.2), 80);
      break;
    
    case 'stat':
      // Subtle click/tap
      playTone(880, 0.05, 'sine', 0.1);
      break;
    
    case 'enter':
      // Rising arpeggio
      playTone(330, 0.1, 'triangle', 0.15);
      setTimeout(() => playTone(392, 0.1, 'triangle', 0.15), 70);
      setTimeout(() => playTone(494, 0.15, 'triangle', 0.15), 140);
      break;
    
    case 'exit':
      // Descending notes
      playTone(494, 0.1, 'triangle', 0.15);
      setTimeout(() => playTone(392, 0.1, 'triangle', 0.15), 70);
      setTimeout(() => playTone(330, 0.15, 'triangle', 0.15), 140);
      break;
    
    case 'error':
      // Low buzz
      playTone(150, 0.2, 'sawtooth', 0.1);
      break;
  }
}

// Map event types to sound types
export function getSoundForEvent(eventType: string): SoundType {
  switch (eventType) {
    case 'goal':
      return 'goal';
    case 'assist':
      return 'assist';
    case 'yellow':
    case 'red':
      return 'card';
    case 'save':
    case 'penalty_saved':
    case 'clean_sheet':
      return 'save';
    default:
      return 'stat';
  }
}
