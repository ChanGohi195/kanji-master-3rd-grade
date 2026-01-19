// 効果音サービス（フリー素材MP3 + Web Audio API）
// 素材提供: OtoLogic (https://otologic.jp) CC BY 4.0

let correctAudio: HTMLAudioElement | null = null;
let closeAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;

// 正解音（ピンポン♪）
export function playCorrectSound(): void {
  try {
    if (!correctAudio) {
      correctAudio = new Audio('/sounds/correct.mp3');
      correctAudio.volume = 0.5;
    }
    correctAudio.currentTime = 0;
    correctAudio.play();
  } catch (e) {
    // 再生エラーは無視
  }
}

// 惜しい音（ポン♪）
export function playCloseSound(): void {
  try {
    if (!closeAudio) {
      closeAudio = new Audio('/sounds/close.mp3');
      closeAudio.volume = 0.4;
    }
    closeAudio.currentTime = 0;
    closeAudio.play();
  } catch (e) {
    // 再生エラーは無視
  }
}

// 不正解音（ブッ）- Web Audio APIで生成
export function playIncorrectSound(): void {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 低めのブザー音
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.1);

    // 音量設定（フェードアウト）
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);
  } catch (e) {
    // 再生エラーは無視
  }
}
