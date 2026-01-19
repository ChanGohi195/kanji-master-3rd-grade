// ひらがな中心のUIテキスト

export const UI = {
	// アプリ名
	appName: 'かんじマスター',
	grade: '2ねんせい',
	
	// ナビゲーション
	back: 'もどる',
	next: 'つぎへ',
	home: 'ホーム',
	
	// メインメニュー
	practice: 'れんしゅう',
	zukan: 'ずかん',
	bunshoYomi: 'よみ',
	bunshoKaki: 'かき',
	settings: 'せってい',
	
	// 図鑑
	zukanTitle: 'かんじずかん',
	notFound: 'みつかりません',
	
	// 練習
	clear: 'けす',
	check: 'できた？',
	hint: 'ヒント',
	showExample: 'おてほんをみる',
	
	// 結果
	correct: 'よくできました！',
	close: 'もうすこし！',
	incorrect: 'もういちどかいてみよう',
	
	// 成長レベル
	growth: {
		0: 'まだ',
		1: 'はじめて',
		2: 'れんしゅうちゅう',
		3: 'とくい',
		4: 'マスター',
		5: 'かんぺき'
	},
	
	// 読み込み
	loading: 'よみこみちゅう...',
	
	// 設定
	soundOn: 'おとをだす',
	soundOff: 'おとをけす',
	strokeWidth: 'せんのふとさ',
	
	// ほごしゃモード
	parentMode: 'ほごしゃモード',
	enterPin: 'あんしょうばんごう',
	stats: 'がくしゅうきろく',
	
	// 練習モード
	freeMode: 'じゆうれんしゅう',
	quizMode: 'ひつじゅんクイズ',
} as const;
