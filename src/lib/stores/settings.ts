import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Settings {
	soundEnabled: boolean;
	strokeWidth: number;
	parentPin: string;
}

const defaultSettings: Settings = {
	soundEnabled: true,
	strokeWidth: 4,
	parentPin: '1234'
};

const SETTINGS_KEY = 'kanji-kids-g4-settings';
const LEGACY_SETTINGS_KEY = 'kanji-kids-g3-settings';

function createSettings() {
	// ローカルストレージから読み込み
	const stored = browser
		? localStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem(LEGACY_SETTINGS_KEY)
		: null;
	const initial = stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
	
	const { subscribe, set, update } = writable<Settings>(initial);
	
	return {
		subscribe,
		set: (value: Settings) => {
			if (browser) {
				localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
			}
			set(value);
		},
		update: (fn: (s: Settings) => Settings) => {
			update((s) => {
				const newValue = fn(s);
				if (browser) {
					localStorage.setItem(SETTINGS_KEY, JSON.stringify(newValue));
				}
				return newValue;
			});
		},
		reset: () => {
			if (browser) {
				localStorage.removeItem(SETTINGS_KEY);
				localStorage.removeItem(LEGACY_SETTINGS_KEY);
			}
			set(defaultSettings);
		}
	};
}

export const settings = createSettings();
