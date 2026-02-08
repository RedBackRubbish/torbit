/**
 * TORBIT SOUND ENGINE
 * Procedural audio synthesis for a futuristic AI coding experience
 * 
 * Uses Web Audio API - no external sound files needed
 * All sounds are generated mathematically for that sci-fi feel
 */

export type SoundType = 
  | 'generation-start'
  | 'generation-hum'
  | 'generation-complete'
  | 'file-create'
  | 'file-edit'
  | 'terminal-command'
  | 'agent-architect'
  | 'agent-frontend'
  | 'agent-backend'
  | 'agent-auditor'
  | 'error'
  | 'warning'
  | 'success'
  | 'notification'
  | 'fuel-low'
  | 'fuel-refuel'
  | 'click'
  | 'hover'

interface SoundEngineOptions {
  masterVolume?: number
  enabled?: boolean
}

class SoundEngine {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private activeHum: { oscillators: OscillatorNode[]; gains: GainNode[] } | null = null
  private enabled: boolean = true
  private masterVolume: number = 0.3

  constructor(options: SoundEngineOptions = {}) {
    this.masterVolume = options.masterVolume ?? 0.3
    this.enabled = options.enabled ?? true
  }

  /**
   * Initialize AudioContext (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (this.audioContext) return

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) throw new Error('Web Audio API not supported')
      this.audioContext = new AudioCtx()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = this.masterVolume
      this.masterGain.connect(this.audioContext.destination)
    } catch (e) {
      console.warn('Web Audio API not supported:', e)
    }
  }

  /**
   * Resume audio context if suspended (browser autoplay policy)
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext!.currentTime)
    }
  }

  /**
   * Enable/disable all sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled && this.activeHum) {
      this.stopGenerationHum()
    }
  }

  /**
   * Play a sound effect
   */
  async play(type: SoundType): Promise<void> {
    if (!this.enabled) return
    await this.init()
    await this.resume()
    if (!this.audioContext || !this.masterGain) return

    switch (type) {
      case 'generation-start':
        this.playGenerationStart()
        break
      case 'generation-complete':
        this.playGenerationComplete()
        break
      case 'file-create':
        this.playFileCreate()
        break
      case 'file-edit':
        this.playFileEdit()
        break
      case 'terminal-command':
        this.playTerminalCommand()
        break
      case 'agent-architect':
        this.playAgentSound('architect')
        break
      case 'agent-frontend':
        this.playAgentSound('frontend')
        break
      case 'agent-backend':
        this.playAgentSound('backend')
        break
      case 'agent-auditor':
        this.playAgentSound('auditor')
        break
      case 'error':
        this.playError()
        break
      case 'warning':
        this.playWarning()
        break
      case 'success':
        this.playSuccess()
        break
      case 'notification':
        this.playNotification()
        break
      case 'fuel-low':
        this.playFuelLow()
        break
      case 'fuel-refuel':
        this.playFuelRefuel()
        break
      case 'click':
        this.playClick()
        break
      case 'hover':
        this.playHover()
        break
    }
  }

  /**
   * Start the ambient generation hum
   * Premium meditation-style ambient with evolving harmonics and spatial audio
   */
  async startGenerationHum(): Promise<void> {
    if (!this.enabled || this.activeHum) return
    await this.init()
    await this.resume()
    if (!this.audioContext || !this.masterGain) return

    const ctx = this.audioContext
    const now = ctx.currentTime

    const oscillators: OscillatorNode[] = []
    const gains: GainNode[] = []

    // ========================================
    // 1. WARM PAD LAYER (Evolving harmonics)
    // ========================================
    const padFreqs = [
      { freq: 130.81, vol: 0.025 },  // C3 - root
      { freq: 164.81, vol: 0.02 },   // E3 - major 3rd
      { freq: 196.00, vol: 0.018 },  // G3 - perfect 5th
      { freq: 246.94, vol: 0.012 },  // B3 - major 7th (dreamy)
    ]

    // Master filter for warmth
    const padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.setValueAtTime(600, now)
    padFilter.Q.value = 0.5
    padFilter.connect(this.masterGain!)

    padFreqs.forEach((layer, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(layer.freq, now)
      
      // Slow pitch drift (evolving, never static)
      const pitchLfo = ctx.createOscillator()
      const pitchLfoGain = ctx.createGain()
      pitchLfo.type = 'sine'
      pitchLfo.frequency.setValueAtTime(0.02 + Math.random() * 0.02, now) // 0.02-0.04 Hz
      pitchLfoGain.gain.setValueAtTime(layer.freq * 0.003, now) // Subtle ±0.3% pitch
      pitchLfo.connect(pitchLfoGain)
      pitchLfoGain.connect(osc.frequency)
      pitchLfo.start(now)

      // Breathing volume (randomized phase)
      const volLfo = ctx.createOscillator()
      const volLfoGain = ctx.createGain()
      volLfo.type = 'sine'
      volLfo.frequency.setValueAtTime(0.06 + i * 0.015, now) // Staggered breathing
      volLfoGain.gain.setValueAtTime(layer.vol * 0.4, now)
      volLfo.connect(volLfoGain)
      volLfoGain.connect(gain.gain)
      volLfo.start(now + Math.random() * 5) // Random start phase

      // Fade in
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(layer.vol, now + 4)

      osc.connect(gain)
      gain.connect(padFilter)
      osc.start(now)
      oscillators.push(osc)
      gains.push(gain)
    })

    // ========================================
    // 2. SUB BASS (Grounding)
    // ========================================
    const subOsc = ctx.createOscillator()
    const subGain = ctx.createGain()
    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(65.41, now) // C2 - deep sub
    subGain.gain.setValueAtTime(0, now)
    subGain.gain.linearRampToValueAtTime(0.03, now + 5)
    subOsc.connect(subGain)
    subGain.connect(this.masterGain!)
    subOsc.start(now)
    oscillators.push(subOsc)
    gains.push(subGain)

    // ========================================
    // 3. FILTERED NOISE (Texture like distant rain)
    // ========================================
    const noiseNode = ctx.createBufferSource()
    const noiseLength = 4 * ctx.sampleRate
    const noiseBuffer = ctx.createBuffer(2, noiseLength, ctx.sampleRate) // Stereo
    
    // Generate brown noise (smoother than white/pink)
    for (let channel = 0; channel < 2; channel++) {
      const channelData = noiseBuffer.getChannelData(channel)
      let lastOut = 0
      for (let i = 0; i < noiseLength; i++) {
        const white = Math.random() * 2 - 1
        lastOut = (lastOut + (0.02 * white)) / 1.02 // Brown noise formula
        channelData[i] = lastOut * 3.5
      }
    }
    noiseNode.buffer = noiseBuffer
    noiseNode.loop = true

    // Bandpass for "rain-like" texture
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.setValueAtTime(800, now)
    noiseFilter.Q.value = 0.3

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0, now)
    noiseGain.gain.linearRampToValueAtTime(0.015, now + 6) // Very subtle

    noiseNode.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(this.masterGain!)
    noiseNode.start(now)

    // ========================================
    // 4. STEREO SHIMMER (Spatial movement)
    // ========================================
    const shimmerOsc = ctx.createOscillator()
    const shimmerGain = ctx.createGain()
    const shimmerPanner = ctx.createStereoPanner()
    
    shimmerOsc.type = 'sine'
    shimmerOsc.frequency.setValueAtTime(523.25, now) // C5 - high shimmer
    
    // Slow stereo panning
    const panLfo = ctx.createOscillator()
    const panLfoGain = ctx.createGain()
    panLfo.type = 'sine'
    panLfo.frequency.setValueAtTime(0.05, now) // 20-second sweep
    panLfoGain.gain.setValueAtTime(0.6, now) // Pan range ±60%
    panLfo.connect(panLfoGain)
    panLfoGain.connect(shimmerPanner.pan)
    panLfo.start(now)

    shimmerGain.gain.setValueAtTime(0, now)
    shimmerGain.gain.linearRampToValueAtTime(0.008, now + 8) // Very quiet

    shimmerOsc.connect(shimmerGain)
    shimmerGain.connect(shimmerPanner)
    shimmerPanner.connect(this.masterGain!)
    shimmerOsc.start(now)
    oscillators.push(shimmerOsc)
    gains.push(shimmerGain)

    // ========================================
    // 5. BINAURAL BEAT (Alpha waves - 10Hz)
    // ========================================
    const binauralL = ctx.createOscillator()
    const binauralR = ctx.createOscillator()
    const binauralMerger = ctx.createChannelMerger(2)
    const binauralGain = ctx.createGain()
    
    binauralL.type = 'sine'
    binauralR.type = 'sine'
    binauralL.frequency.setValueAtTime(200, now)
    binauralR.frequency.setValueAtTime(210, now) // 10Hz difference = alpha waves
    
    binauralGain.gain.setValueAtTime(0, now)
    binauralGain.gain.linearRampToValueAtTime(0.012, now + 5)
    
    binauralL.connect(binauralMerger, 0, 0) // Left channel
    binauralR.connect(binauralMerger, 0, 1) // Right channel
    binauralMerger.connect(binauralGain)
    binauralGain.connect(this.masterGain!)
    
    binauralL.start(now)
    binauralR.start(now)
    oscillators.push(binauralL, binauralR)
    gains.push(binauralGain)

    this.activeHum = { oscillators, gains }
  }

  /**
   * Stop the ambient generation hum
   * Gentle 2-second fade out
   */
  stopGenerationHum(): void {
    if (!this.activeHum || !this.audioContext) return

    const now = this.audioContext.currentTime
    
    // Gentle fade out over 2 seconds
    this.activeHum.gains.forEach((gain) => {
      gain.gain.linearRampToValueAtTime(0, now + 2)
    })

    setTimeout(() => {
      this.activeHum?.oscillators.forEach(osc => {
        try { osc.stop() } catch {}
      })
      this.activeHum = null
    }, 2100)
  }

  // ============================================
  // INDIVIDUAL SOUND GENERATORS
  // ============================================

  private playGenerationStart(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    // Rising synth sweep
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(100, now)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.3)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(200, now)
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3)
    filter.Q.value = 5

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(now)
    osc.stop(now + 0.5)
  }

  private playGenerationComplete(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    // Triumphant chord progression
    const notes = [261.63, 329.63, 392, 523.25] // C4, E4, G4, C5
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      const startTime = now + i * 0.08
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8)

      osc.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(startTime)
      osc.stop(startTime + 0.8)
    })
  }

  private playFileCreate(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    // Soft "whoosh" + click
    const noise = ctx.createBufferSource()
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate)
    const output = noiseBuffer.getChannelData(0)
    for (let i = 0; i < output.length; i++) {
      output[i] = Math.random() * 2 - 1
    }
    noise.buffer = noiseBuffer

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.setValueAtTime(2000, now)
    noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 0.1)
    noiseFilter.Q.value = 1

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.1, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(this.masterGain!)
    noise.start(now)

    // Click
    const click = ctx.createOscillator()
    const clickGain = ctx.createGain()
    click.type = 'sine'
    click.frequency.setValueAtTime(1200, now + 0.05)
    click.frequency.exponentialRampToValueAtTime(600, now + 0.1)
    clickGain.gain.setValueAtTime(0.15, now + 0.05)
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
    click.connect(clickGain)
    clickGain.connect(this.masterGain!)
    click.start(now + 0.05)
    click.stop(now + 0.15)
  }

  private playFileEdit(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    // Softer, shorter click
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 0.1)
  }

  private playTerminalCommand(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    // Retro terminal beep sequence
    const freqs = [800, 1000, 800]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, now + i * 0.05)
      gain.gain.setValueAtTime(0.05, now + i * 0.05)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.04)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(now + i * 0.05)
      osc.stop(now + i * 0.05 + 0.05)
    })
  }

  private playAgentSound(agent: 'architect' | 'frontend' | 'backend' | 'auditor'): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    const configs = {
      architect: { freq: 80, type: 'sine' as OscillatorType, duration: 0.4 },
      frontend: { freq: 440, type: 'triangle' as OscillatorType, duration: 0.25 },
      backend: { freq: 200, type: 'square' as OscillatorType, duration: 0.2 },
      auditor: { freq: 880, type: 'sine' as OscillatorType, duration: 0.3 },
    }

    const config = configs[agent]
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = config.type
    osc.frequency.setValueAtTime(config.freq, now)

    if (agent === 'architect') {
      osc.frequency.exponentialRampToValueAtTime(config.freq * 1.5, now + 0.1)
      osc.frequency.exponentialRampToValueAtTime(config.freq, now + 0.2)
    } else if (agent === 'frontend') {
      // Arpeggio
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.setValueAtTime(554.37, now + 0.08)
      osc.frequency.setValueAtTime(659.25, now + 0.16)
    }

    filter.type = 'lowpass'
    filter.frequency.value = 3000

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(now)
    osc.stop(now + config.duration)
  }

  private playError(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    // Dissonant warning tone
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sawtooth'
    osc2.type = 'sawtooth'
    osc1.frequency.setValueAtTime(150, now)
    osc2.frequency.setValueAtTime(155, now) // Slight detuning for unease

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.setValueAtTime(0.02, now + 0.1)
    gain.gain.setValueAtTime(0.08, now + 0.2)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(this.masterGain!)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.4)
    osc2.stop(now + 0.4)
  }

  private playWarning(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.setValueAtTime(400, now + 0.15)

    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(now)
    osc.stop(now + 0.3)
  }

  private playSuccess(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    // Happy ascending tone
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, now) // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1) // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2) // G5

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(now)
    osc.stop(now + 0.4)
  }

  private playNotification(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    // Soft bell-like tone
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(now)
    osc.stop(now + 0.5)
  }

  private playFuelLow(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    // Subtle alarm ping
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(500, now + i * 0.2)

      gain.gain.setValueAtTime(0.1, now + i * 0.2)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.1)

      osc.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(now + i * 0.2)
      osc.stop(now + i * 0.2 + 0.15)
    }
  }

  private playFuelRefuel(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    // Power-up sound
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(100, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.5)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(200, now)
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.5)

    gain.gain.setValueAtTime(0.1, now)
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(now)
    osc.stop(now + 0.6)
  }

  private playClick(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1000, now)
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.02)

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(now)
    osc.stop(now + 0.05)
  }

  private playHover(): void {
    const ctx = this.audioContext!
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, now)

    gain.gain.setValueAtTime(0.03, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(now)
    osc.stop(now + 0.06)
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopGenerationHum()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// Singleton instance
let soundEngineInstance: SoundEngine | null = null

export function getSoundEngine(): SoundEngine {
  if (!soundEngineInstance) {
    soundEngineInstance = new SoundEngine()
  }
  return soundEngineInstance
}

export default SoundEngine
