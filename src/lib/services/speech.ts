// Web Speech API ラッパー

let synthesis: SpeechSynthesis | null = null;
let japaneseVoice: SpeechSynthesisVoice | null = null;

// 初期化
export function initSpeech(): boolean {
	if (typeof window === 'undefined') return false;
	
	synthesis = window.speechSynthesis;
	if (!synthesis) return false;
	
	// 日本語ボイスを探す
	const loadVoices = () => {
		const voices = synthesis!.getVoices();
		japaneseVoice = voices.find(v => v.lang.startsWith('ja')) || null;
	};
	
	loadVoices();
	
	// 一部のブラウザでは非同期で読み込まれる
	if (synthesis.onvoiceschanged !== undefined) {
		synthesis.onvoiceschanged = loadVoices;
	}
	
	return true;
}

// 読み上げ
export function speak(text: string, rate: number = 0.8): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!synthesis) {
			reject(new Error('Speech synthesis not available'));
			return;
		}
		
		// 既存の読み上げをキャンセル
		synthesis.cancel();
		
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = 'ja-JP';
		utterance.rate = rate;
		utterance.pitch = 1.1; // 少し高めで子供向け
		
		if (japaneseVoice) {
			utterance.voice = japaneseVoice;
		}
		
		utterance.onend = () => resolve();
		utterance.onerror = (e) => reject(e);
		
		synthesis.speak(utterance);
	});
}

// 読み上げ停止
export function stopSpeaking() {
	if (synthesis) {
		synthesis.cancel();
	}
}

// 読み上げ可能か
export function isSpeechAvailable(): boolean {
	return synthesis !== null;
}
