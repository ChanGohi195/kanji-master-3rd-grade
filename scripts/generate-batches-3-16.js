// バッチ3-16（漢字21-160）の例文生成スクリプト
// 小学2年生が理解できる簡単な文を生成

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// kanji-list.jsonを読み込む
const kanjiList = JSON.parse(fs.readFileSync(path.join(__dirname, 'kanji-list.json'), 'utf8'));

// 漢字21-160のデータを取得（配列インデックスは20-159）
const targetKanjis = kanjiList.slice(20, 160);

// 例文データ定義（漢字21-160）
const exampleData = {
  // バッチ3: 漢字21-30
  "U+89D2": [ // 角
    { reading: "かど", type: "kun", sentence: "角で まがる。" },
    { reading: "つの", type: "kun", sentence: "しかの 角。" },
    { reading: "かど", type: "kun", sentence: "その 角を ひだりに いく。" }
  ],
  "U+697D": [ // 楽
    { reading: "たの", type: "kun", sentence: "楽しく あそぶ。" },
    { reading: "がく", type: "on", sentence: "おん楽の じゅぎょう。" },
    { reading: "たの", type: "kun", sentence: "楽しい しゅうまつ。" }
  ],
  "U+6D3B": [ // 活
    { reading: "かつ", type: "on", sentence: "生活 する。" },
    { reading: "かつ", type: "on", sentence: "活字を よむ。" },
    { reading: "かつ", type: "on", sentence: "活どうする。" }
  ],
  "U+9593": [ // 間
    { reading: "あいだ", type: "kun", sentence: "家の 間に いる。" },
    { reading: "かん", type: "on", sentence: "二日間 やすむ。" },
    { reading: "ま", type: "kun", sentence: "間に あう。" }
  ],
  "U+4E38": [ // 丸
    { reading: "まる", type: "kun", sentence: "丸い ボール。" },
    { reading: "まる", type: "kun", sentence: "丸を かく。" },
    { reading: "まる", type: "kun", sentence: "丸い おさらに のせる。" }
  ],
  "U+5CA9": [ // 岩
    { reading: "いわ", type: "kun", sentence: "大きな 岩が ある。" },
    { reading: "いわ", type: "kun", sentence: "岩に のぼる。" },
    { reading: "いわ", type: "kun", sentence: "岩の うえに すわる。" }
  ],
  "U+9854": [ // 顔
    { reading: "かお", type: "kun", sentence: "顔を あらう。" },
    { reading: "かお", type: "kun", sentence: "にこにこの 顔。" },
    { reading: "かお", type: "kun", sentence: "顔が あかい。" }
  ],
  "U+6C7D": [ // 汽
    { reading: "き", type: "on", sentence: "汽車に のる。" },
    { reading: "き", type: "on", sentence: "汽しゃは はやい。" },
    { reading: "き", type: "on", sentence: "汽ぶえが なる。" }
  ],
  "U+8A18": [ // 記
    { reading: "き", type: "on", sentence: "日記を かく。" },
    { reading: "き", type: "on", sentence: "記ろくする。" },
    { reading: "き", type: "on", sentence: "記ねんの しゃしん。" }
  ],
  "U+5E30": [ // 帰
    { reading: "かえる", type: "kun", sentence: "いえに 帰る。" },
    { reading: "かえ", type: "kun", sentence: "帰り道。" },
    { reading: "かえる", type: "kun", sentence: "はやく 帰る。" }
  ],

  // バッチ4: 漢字31-40
  "U+5F13": [ // 弓
    { reading: "ゆみ", type: "kun", sentence: "弓を ひく。" },
    { reading: "ゆみ", type: "kun", sentence: "大きな 弓。" },
    { reading: "ゆみ", type: "kun", sentence: "弓で やを うつ。" }
  ],
  "U+725B": [ // 牛
    { reading: "うし", type: "kun", sentence: "牛が いる。" },
    { reading: "ぎゅう", type: "on", sentence: "牛にゅうを のむ。" },
    { reading: "うし", type: "kun", sentence: "牛を みる。" }
  ],
  "U+9B5A": [ // 魚
    { reading: "さかな", type: "kun", sentence: "魚を つる。" },
    { reading: "さかな", type: "kun", sentence: "大きな 魚。" },
    { reading: "ぎょ", type: "on", sentence: "金魚が およぐ。" }
  ],
  "U+4EAC": [ // 京
    { reading: "きょう", type: "on", sentence: "東京に いく。" },
    { reading: "きょう", type: "on", sentence: "京とに すむ。" },
    { reading: "きょう", type: "on", sentence: "上京する。" }
  ],
  "U+5F37": [ // 強
    { reading: "つよい", type: "kun", sentence: "強い ちから。" },
    { reading: "きょう", type: "on", sentence: "べん強する。" },
    { reading: "つよ", type: "kun", sentence: "強く なる。" }
  ],
  "U+6559": [ // 教
    { reading: "おしえる", type: "kun", sentence: "かん字を 教える。" },
    { reading: "きょう", type: "on", sentence: "教しつに いく。" },
    { reading: "おし", type: "kun", sentence: "教えて もらう。" }
  ],
  "U+8FD1": [ // 近
    { reading: "ちかい", type: "kun", sentence: "えきは 近い。" },
    { reading: "ちか", type: "kun", sentence: "近くの こうえん。" },
    { reading: "きん", type: "on", sentence: "さい近の できごと。" }
  ],
  "U+5144": [ // 兄
    { reading: "あに", type: "kun", sentence: "兄と あそぶ。" },
    { reading: "きょう", type: "on", sentence: "兄だいで いく。" },
    { reading: "あに", type: "kun", sentence: "兄が いる。" }
  ],
  "U+5F62": [ // 形
    { reading: "かたち", type: "kun", sentence: "丸い 形。" },
    { reading: "けい", type: "on", sentence: "三角形を かく。" },
    { reading: "かた", type: "kun", sentence: "形を つくる。" }
  ],
  "U+8A08": [ // 計
    { reading: "けい", type: "on", sentence: "時計を みる。" },
    { reading: "はか", type: "kun", sentence: "計る。" },
    { reading: "けい", type: "on", sentence: "けい算する。" }
  ],

  // バッチ5: 漢字41-50
  "U+5143": [ // 元
    { reading: "げん", type: "on", sentence: "元気に あそぶ。" },
    { reading: "もと", type: "kun", sentence: "元に もどす。" },
    { reading: "げん", type: "on", sentence: "元日に おまいりする。" }
  ],
  "U+8A00": [ // 言
    { reading: "いう", type: "kun", sentence: "ほんとうの ことを 言う。" },
    { reading: "こと", type: "kun", sentence: "言ばを おぼえる。" },
    { reading: "げん", type: "on", sentence: "げん語を まなぶ。" }
  ],
  "U+539F": [ // 原
    { reading: "はら", type: "kun", sentence: "草原で あそぶ。" },
    { reading: "げん", type: "on", sentence: "原いんを さがす。" },
    { reading: "はら", type: "kun", sentence: "広い 原。" }
  ],
  "U+6238": [ // 戸
    { reading: "と", type: "kun", sentence: "戸を しめる。" },
    { reading: "と", type: "kun", sentence: "戸を あける。" },
    { reading: "こ", type: "on", sentence: "こ戸で くらす。" }
  ],
  "U+53E4": [ // 古
    { reading: "ふるい", type: "kun", sentence: "古い ほん。" },
    { reading: "こ", type: "on", sentence: "古今の はなし。" },
    { reading: "ふる", type: "kun", sentence: "古く なる。" }
  ],
  "U+5348": [ // 午
    { reading: "ご", type: "on", sentence: "午前に べん強する。" },
    { reading: "ご", type: "on", sentence: "午後から あそぶ。" },
    { reading: "ご", type: "on", sentence: "正午に なる。" }
  ],
  "U+5F8C": [ // 後
    { reading: "あと", type: "kun", sentence: "後で あう。" },
    { reading: "うし", type: "kun", sentence: "後ろを みる。" },
    { reading: "ご", type: "on", sentence: "ごはんの 後。" }
  ],
  "U+8A9E": [ // 語
    { reading: "かた", type: "kun", sentence: "語る。" },
    { reading: "ご", type: "on", sentence: "日本語を はなす。" },
    { reading: "ご", type: "on", sentence: "外国語を まなぶ。" }
  ],
  "U+516C": [ // 公
    { reading: "こう", type: "on", sentence: "公えんで あそぶ。" },
    { reading: "こう", type: "on", sentence: "公ちゅう電話を つかう。" },
    { reading: "おおやけ", type: "kun", sentence: "公に する。" }
  ],
  "U+5DE5": [ // 工
    { reading: "こう", type: "on", sentence: "工じょうで はたらく。" },
    { reading: "こう", type: "on", sentence: "工さくする。" },
    { reading: "く", type: "on", sentence: "大工さんが くる。" }
  ],

  // バッチ6: 漢字51-60
  "U+5E83": [ // 広
    { reading: "ひろい", type: "kun", sentence: "広い にわ。" },
    { reading: "ひろ", type: "kun", sentence: "広げる。" },
    { reading: "こう", type: "on", sentence: "広こくを みる。" }
  ],
  "U+4EA4": [ // 交
    { reading: "こう", type: "on", sentence: "交つうに きを つける。" },
    { reading: "まじ", type: "kun", sentence: "交わる。" },
    { reading: "こう", type: "on", sentence: "交かんする。" }
  ],
  "U+5149": [ // 光
    { reading: "ひかり", type: "kun", sentence: "光が まぶしい。" },
    { reading: "ひか", type: "kun", sentence: "光る ほし。" },
    { reading: "こう", type: "on", sentence: "かん光に いく。" }
  ],
  "U+8003": [ // 考
    { reading: "かんが", type: "kun", sentence: "考える。" },
    { reading: "こう", type: "on", sentence: "さん考する。" },
    { reading: "かんがえ", type: "kun", sentence: "いい 考えだね。" }
  ],
  "U+884C": [ // 行
    { reading: "いく", type: "kun", sentence: "がっこうに 行く。" },
    { reading: "ゆ", type: "kun", sentence: "行き。" },
    { reading: "こう", type: "on", sentence: "りょ行に でかける。" }
  ],
  "U+9AD8": [ // 高
    { reading: "たかい", type: "kun", sentence: "高い やま。" },
    { reading: "たか", type: "kun", sentence: "高さを はかる。" },
    { reading: "こう", type: "on", sentence: "高こうの せんぱい。" }
  ],
  "U+9EC4": [ // 黄
    { reading: "き", type: "kun", sentence: "黄色い はな。" },
    { reading: "こう", type: "on", sentence: "黄金の かざり。" },
    { reading: "き", type: "kun", sentence: "黄いろに なる。" }
  ],
  "U+5408": [ // 合
    { reading: "あう", type: "kun", sentence: "ちからを 合わせる。" },
    { reading: "ごう", type: "on", sentence: "ごう計する。" },
    { reading: "あ", type: "kun", sentence: "合う ふく。" }
  ],
  "U+8C37": [ // 谷
    { reading: "たに", type: "kun", sentence: "谷に おりる。" },
    { reading: "たに", type: "kun", sentence: "深い 谷。" },
    { reading: "こく", type: "on", sentence: "たに谷を わたる。" }
  ],
  "U+56FD": [ // 国
    { reading: "くに", type: "kun", sentence: "日本の 国。" },
    { reading: "こく", type: "on", sentence: "外国に いく。" },
    { reading: "くに", type: "kun", sentence: "国を あいする。" }
  ],

  // バッチ7: 漢字61-70
  "U+9ED2": [ // 黒
    { reading: "くろ", type: "kun", sentence: "黒い ねこ。" },
    { reading: "くろい", type: "kun", sentence: "黒い くつ。" },
    { reading: "こく", type: "on", sentence: "黒ばんに かく。" }
  ],
  "U+4ECA": [ // 今
    { reading: "いま", type: "kun", sentence: "今から でかける。" },
    { reading: "こん", type: "on", sentence: "今日は いい てんき。" },
    { reading: "いま", type: "kun", sentence: "今 なにを している？" }
  ],
  "U+624D": [ // 才
    { reading: "さい", type: "on", sentence: "七才に なる。" },
    { reading: "さい", type: "on", sentence: "天才だね。" },
    { reading: "さい", type: "on", sentence: "才のうが ある。" }
  ],
  "U+7D30": [ // 細
    { reading: "ほそい", type: "kun", sentence: "細い いと。" },
    { reading: "ほそ", type: "kun", sentence: "細く する。" },
    { reading: "さい", type: "on", sentence: "くわ細に しらべる。" }
  ],
  "U+4F5C": [ // 作
    { reading: "つく", type: "kun", sentence: "作る。" },
    { reading: "さく", type: "on", sentence: "作ぶんを かく。" },
    { reading: "つく", type: "kun", sentence: "おべんとうを 作る。" }
  ],
  "U+7B97": [ // 算
    { reading: "さん", type: "on", sentence: "算数の もんだい。" },
    { reading: "さん", type: "on", sentence: "けい算する。" },
    { reading: "さん", type: "on", sentence: "たし算を する。" }
  ],
  "U+6B62": [ // 止
    { reading: "とまる", type: "kun", sentence: "バスが 止まる。" },
    { reading: "と", type: "kun", sentence: "止める。" },
    { reading: "し", type: "on", sentence: "中止する。" }
  ],
  "U+5E02": [ // 市
    { reading: "し", type: "on", sentence: "市やくしょに いく。" },
    { reading: "いち", type: "kun", sentence: "市で かいものする。" },
    { reading: "し", type: "on", sentence: "市みんの ために。" }
  ],
  "U+77E2": [ // 矢
    { reading: "や", type: "kun", sentence: "矢を うつ。" },
    { reading: "や", type: "kun", sentence: "矢が とぶ。" },
    { reading: "し", type: "on", sentence: "ほう矢を さだめる。" }
  ],
  "U+59C9": [ // 姉
    { reading: "あね", type: "kun", sentence: "姉と かいものする。" },
    { reading: "し", type: "on", sentence: "姉まいで いく。" },
    { reading: "あね", type: "kun", sentence: "姉が いる。" }
  ],

  // バッチ8: 漢字71-80
  "U+601D": [ // 思
    { reading: "おも", type: "kun", sentence: "思う。" },
    { reading: "おもい", type: "kun", sentence: "思い出。" },
    { reading: "し", type: "on", sentence: "意思を つたえる。" }
  ],
  "U+7D19": [ // 紙
    { reading: "かみ", type: "kun", sentence: "白い 紙。" },
    { reading: "し", type: "on", sentence: "紙ばんを つかう。" },
    { reading: "かみ", type: "kun", sentence: "紙を おる。" }
  ],
  "U+5BFA": [ // 寺
    { reading: "てら", type: "kun", sentence: "お寺に おまいりする。" },
    { reading: "じ", type: "on", sentence: "金ぞう寺を みる。" },
    { reading: "てら", type: "kun", sentence: "寺の かねが なる。" }
  ],
  "U+6642": [ // 時
    { reading: "とき", type: "kun", sentence: "その 時に あった。" },
    { reading: "じ", type: "on", sentence: "三時に なる。" },
    { reading: "とき", type: "kun", sentence: "楽しい 時。" }
  ],
  "U+5BA4": [ // 室
    { reading: "しつ", type: "on", sentence: "教室に はいる。" },
    { reading: "しつ", type: "on", sentence: "おん室で あたたまる。" },
    { reading: "むろ", type: "kun", sentence: "室に しまう。" }
  ],
  "U+4E8B": [ // 事
    { reading: "こと", type: "kun", sentence: "大事な 事。" },
    { reading: "じ", type: "on", sentence: "じこが おきる。" },
    { reading: "こと", type: "kun", sentence: "うれしい 事。" }
  ],
  "U+81EA": [ // 自
    { reading: "じ", type: "on", sentence: "自分で やる。" },
    { reading: "みずか", type: "kun", sentence: "自ら すすんで てつだう。" },
    { reading: "じ", type: "on", sentence: "自てん車に のる。" }
  ],
  "U+5B57": [ // 字
    { reading: "じ", type: "on", sentence: "字を かく。" },
    { reading: "あざ", type: "kun", sentence: "字が きれい。" },
    { reading: "じ", type: "on", sentence: "かん字を よむ。" }
  ],
  "U+5F0F": [ // 式
    { reading: "しき", type: "on", sentence: "にゅう学式に でる。" },
    { reading: "しき", type: "on", sentence: "けい算の 式。" },
    { reading: "しき", type: "on", sentence: "式を たてる。" }
  ],
  "U+793A": [ // 示
    { reading: "しめす", type: "kun", sentence: "みちを 示す。" },
    { reading: "じ", type: "on", sentence: "てん示する。" },
    { reading: "しめ", type: "kun", sentence: "示し あわせる。" }
  ],

  // バッチ9: 漢字81-90
  "U+793E": [ // 社
    { reading: "しゃ", type: "on", sentence: "会社で はたらく。" },
    { reading: "やしろ", type: "kun", sentence: "神社に おまいりする。" },
    { reading: "しゃ", type: "on", sentence: "社会の べん強。" }
  ],
  "U+8005": [ // 者
    { reading: "もの", type: "kun", sentence: "はたらく 者。" },
    { reading: "しゃ", type: "on", sentence: "がく者に なる。" },
    { reading: "もの", type: "kun", sentence: "わかい 者。" }
  ],
  "U+9996": [ // 首
    { reading: "くび", type: "kun", sentence: "首を まわす。" },
    { reading: "しゅ", type: "on", sentence: "首とに すむ。" },
    { reading: "くび", type: "kun", sentence: "首が いたい。" }
  ],
  "U+79CB": [ // 秋
    { reading: "あき", type: "kun", sentence: "秋に なる。" },
    { reading: "しゅう", type: "on", sentence: "しゅう分の 日。" },
    { reading: "あき", type: "kun", sentence: "秋の はっぴょう会。" }
  ],
  "U+9031": [ // 週
    { reading: "しゅう", type: "on", sentence: "一週間が おわる。" },
    { reading: "しゅう", type: "on", sentence: "来週 あう。" },
    { reading: "しゅう", type: "on", sentence: "まい週 ならう。" }
  ],
  "U+6625": [ // 春
    { reading: "はる", type: "kun", sentence: "春に なる。" },
    { reading: "しゅん", type: "on", sentence: "せい春の とき。" },
    { reading: "はる", type: "kun", sentence: "春の はな。" }
  ],
  "U+66F8": [ // 書
    { reading: "かく", type: "kun", sentence: "てがみを 書く。" },
    { reading: "しょ", type: "on", sentence: "図書かんに いく。" },
    { reading: "か", type: "kun", sentence: "書き ものを する。" }
  ],
  "U+5C11": [ // 少
    { reading: "すくない", type: "kun", sentence: "人が 少ない。" },
    { reading: "すこ", type: "kun", sentence: "少し やすむ。" },
    { reading: "しょう", type: "on", sentence: "少年が はしる。" }
  ],
  "U+5834": [ // 場
    { reading: "ば", type: "kun", sentence: "あそび場に いく。" },
    { reading: "じょう", type: "on", sentence: "うん動場で あそぶ。" },
    { reading: "ば", type: "kun", sentence: "その 場で まつ。" }
  ],
  "U+8272": [ // 色
    { reading: "いろ", type: "kun", sentence: "きれいな 色。" },
    { reading: "しょく", type: "on", sentence: "とく色を いかす。" },
    { reading: "いろ", type: "kun", sentence: "色を ぬる。" }
  ],

  // バッチ10: 漢字91-100
  "U+98DF": [ // 食
    { reading: "たべる", type: "kun", sentence: "ごはんを 食べる。" },
    { reading: "しょく", type: "on", sentence: "食じを する。" },
    { reading: "た", type: "kun", sentence: "食べ物が おいしい。" }
  ],
  "U+5FC3": [ // 心
    { reading: "こころ", type: "kun", sentence: "やさしい 心。" },
    { reading: "しん", type: "on", sentence: "中心を さがす。" },
    { reading: "こころ", type: "kun", sentence: "心が あたたかい。" }
  ],
  "U+65B0": [ // 新
    { reading: "あたらしい", type: "kun", sentence: "新しい ほん。" },
    { reading: "あたら", type: "kun", sentence: "新しく する。" },
    { reading: "しん", type: "on", sentence: "新かんせん。" }
  ],
  "U+89AA": [ // 親
    { reading: "おや", type: "kun", sentence: "親に あう。" },
    { reading: "した", type: "kun", sentence: "親しい ともだち。" },
    { reading: "しん", type: "on", sentence: "父親と でかける。" }
  ],
  "U+56F3": [ // 図
    { reading: "ず", type: "on", sentence: "ちずを みる。" },
    { reading: "と", type: "on", sentence: "図がらが ある。" },
    { reading: "ず", type: "on", sentence: "図かんで しらべる。" }
  ],
  "U+6570": [ // 数
    { reading: "かず", type: "kun", sentence: "数を かぞえる。" },
    { reading: "すう", type: "on", sentence: "数字を かく。" },
    { reading: "かぞ", type: "kun", sentence: "数える。" }
  ],
  "U+897F": [ // 西
    { reading: "にし", type: "kun", sentence: "西の ほうに いく。" },
    { reading: "せい", type: "on", sentence: "西よう料理。" },
    { reading: "にし", type: "kun", sentence: "西から ひが出る。" }
  ],
  "U+58F0": [ // 声
    { reading: "こえ", type: "kun", sentence: "大きな 声。" },
    { reading: "せい", type: "on", sentence: "声がくを まなぶ。" },
    { reading: "こえ", type: "kun", sentence: "声を だす。" }
  ],
  "U+661F": [ // 星
    { reading: "ほし", type: "kun", sentence: "きれいな 星。" },
    { reading: "せい", type: "on", sentence: "わく星を みる。" },
    { reading: "ほし", type: "kun", sentence: "星が ひかる。" }
  ],
  "U+6674": [ // 晴
    { reading: "はれる", type: "kun", sentence: "そらが 晴れる。" },
    { reading: "はれ", type: "kun", sentence: "晴れの 日。" },
    { reading: "せい", type: "on", sentence: "快晴だね。" }
  ],

  // バッチ11: 漢字101-110
  "U+6E05": [ // 清
    { reading: "きよい", type: "kun", sentence: "清い みず。" },
    { reading: "きよ", type: "kun", sentence: "清める。" },
    { reading: "せい", type: "on", sentence: "清そうする。" }
  ],
  "U+5207": [ // 切
    { reading: "きる", type: "kun", sentence: "かみを 切る。" },
    { reading: "き", type: "kun", sentence: "切って つかう。" },
    { reading: "せつ", type: "on", sentence: "大切な もの。" }
  ],
  "U+96EA": [ // 雪
    { reading: "ゆき", type: "kun", sentence: "雪が ふる。" },
    { reading: "せつ", type: "on", sentence: "大雪に なる。" },
    { reading: "ゆき", type: "kun", sentence: "白い 雪。" }
  ],
  "U+8239": [ // 船
    { reading: "ふね", type: "kun", sentence: "船に のる。" },
    { reading: "せん", type: "on", sentence: "船いんさんが くる。" },
    { reading: "ふね", type: "kun", sentence: "大きな 船。" }
  ],
  "U+7DDA": [ // 線
    { reading: "せん", type: "on", sentence: "線を ひく。" },
    { reading: "せん", type: "on", sentence: "電車の 線ろ。" },
    { reading: "せん", type: "on", sentence: "直線を かく。" }
  ],
  "U+524D": [ // 前
    { reading: "まえ", type: "kun", sentence: "前に すすむ。" },
    { reading: "ぜん", type: "on", sentence: "午前に べん強する。" },
    { reading: "まえ", type: "kun", sentence: "駅の 前で あう。" }
  ],
  "U+7D44": [ // 組
    { reading: "くみ", type: "kun", sentence: "一組に なる。" },
    { reading: "くむ", type: "kun", sentence: "つみきを 組む。" },
    { reading: "そ", type: "on", sentence: "組しきを まなぶ。" }
  ],
  "U+8D70": [ // 走
    { reading: "はしる", type: "kun", sentence: "はやく 走る。" },
    { reading: "そう", type: "on", sentence: "走しゃする。" },
    { reading: "はし", type: "kun", sentence: "走り つづける。" }
  ],
  "U+591A": [ // 多
    { reading: "おおい", type: "kun", sentence: "人が 多い。" },
    { reading: "た", type: "on", sentence: "多くの ともだち。" },
    { reading: "おお", type: "kun", sentence: "多く なる。" }
  ],
  "U+592A": [ // 太
    { reading: "ふとい", type: "kun", sentence: "太い えだ。" },
    { reading: "ふと", type: "kun", sentence: "太く かく。" },
    { reading: "たい", type: "on", sentence: "太よう。" }
  ],

  // バッチ12: 漢字111-120
  "U+4F53": [ // 体
    { reading: "からだ", type: "kun", sentence: "体を うごかす。" },
    { reading: "たい", type: "on", sentence: "たい育の じゅぎょう。" },
    { reading: "からだ", type: "kun", sentence: "体が つよい。" }
  ],
  "U+53F0": [ // 台
    { reading: "だい", type: "on", sentence: "台の うえに のせる。" },
    { reading: "だい", type: "on", sentence: "だい所で つくる。" },
    { reading: "だい", type: "on", sentence: "ぶ台に たつ。" }
  ],
  "U+5730": [ // 地
    { reading: "ち", type: "on", sentence: "地めんに おちる。" },
    { reading: "じ", type: "on", sentence: "地しんが くる。" },
    { reading: "ち", type: "on", sentence: "地図を みる。" }
  ],
  "U+6C60": [ // 池
    { reading: "いけ", type: "kun", sentence: "池で さかなを みる。" },
    { reading: "ち", type: "on", sentence: "電池を かえる。" },
    { reading: "いけ", type: "kun", sentence: "大きな 池。" }
  ],
  "U+77E5": [ // 知
    { reading: "しる", type: "kun", sentence: "ことばを 知る。" },
    { reading: "ち", type: "on", sentence: "知しきを ふやす。" },
    { reading: "し", type: "kun", sentence: "知って いる。" }
  ],
  "U+8336": [ // 茶
    { reading: "ちゃ", type: "on", sentence: "お茶を のむ。" },
    { reading: "ちゃ", type: "on", sentence: "茶いろの ふく。" },
    { reading: "ちゃ", type: "on", sentence: "こう茶を いれる。" }
  ],
  "U+663C": [ // 昼
    { reading: "ひる", type: "kun", sentence: "昼ごはんを たべる。" },
    { reading: "ちゅう", type: "on", sentence: "昼間に あそぶ。" },
    { reading: "ひる", type: "kun", sentence: "昼やすみ。" }
  ],
  "U+9577": [ // 長
    { reading: "ながい", type: "kun", sentence: "長い ながい でんわ。" },
    { reading: "なが", type: "kun", sentence: "長く なる。" },
    { reading: "ちょう", type: "on", sentence: "校長せんせい。" }
  ],
  "U+9CE5": [ // 鳥
    { reading: "とり", type: "kun", sentence: "かわいい 鳥。" },
    { reading: "ちょう", type: "on", sentence: "野鳥を みる。" },
    { reading: "とり", type: "kun", sentence: "鳥が とぶ。" }
  ],
  "U+671D": [ // 朝
    { reading: "あさ", type: "kun", sentence: "朝ごはんを たべる。" },
    { reading: "ちょう", type: "on", sentence: "今朝は さむい。" },
    { reading: "あさ", type: "kun", sentence: "朝はやく おきる。" }
  ],

  // バッチ13: 漢字121-130
  "U+76F4": [ // 直
    { reading: "ただしい", type: "kun", sentence: "直しい こたえ。" },
    { reading: "なお", type: "kun", sentence: "直す。" },
    { reading: "ちょく", type: "on", sentence: "直せつ はなす。" }
  ],
  "U+901A": [ // 通
    { reading: "とおる", type: "kun", sentence: "みちを 通る。" },
    { reading: "つう", type: "on", sentence: "つう学する。" },
    { reading: "とお", type: "kun", sentence: "通り ぬける。" }
  ],
  "U+5E97": [ // 店
    { reading: "みせ", type: "kun", sentence: "お店で かう。" },
    { reading: "てん", type: "on", sentence: "てん員さんに きく。" },
    { reading: "みせ", type: "kun", sentence: "大きな 店。" }
  ],
  "U+70B9": [ // 点
    { reading: "てん", type: "on", sentence: "百点を とる。" },
    { reading: "てん", type: "on", sentence: "点を かぞえる。" },
    { reading: "てん", type: "on", sentence: "てん数を つける。" }
  ],
  "U+96FB": [ // 電
    { reading: "でん", type: "on", sentence: "電車に のる。" },
    { reading: "でん", type: "on", sentence: "電気を つける。" },
    { reading: "でん", type: "on", sentence: "電話を かける。" }
  ],
  "U+5200": [ // 刀
    { reading: "かたな", type: "kun", sentence: "かたなを みる。" },
    { reading: "とう", type: "on", sentence: "木とうで あそぶ。" },
    { reading: "かたな", type: "kun", sentence: "つよい 刀。" }
  ],
  "U+51AC": [ // 冬
    { reading: "ふゆ", type: "kun", sentence: "冬は さむい。" },
    { reading: "とう", type: "on", sentence: "とう眠する。" },
    { reading: "ふゆ", type: "kun", sentence: "冬やすみ。" }
  ],
  "U+5F53": [ // 当
    { reading: "あたる", type: "kun", sentence: "くじが 当たる。" },
    { reading: "とう", type: "on", sentence: "当ばんする。" },
    { reading: "あ", type: "kun", sentence: "当たり まえ。" }
  ],
  "U+6771": [ // 東
    { reading: "ひがし", type: "kun", sentence: "東の ほう。" },
    { reading: "とう", type: "on", sentence: "東京に すむ。" },
    { reading: "ひがし", type: "kun", sentence: "東から のぼる。" }
  ],
  "U+7B54": [ // 答
    { reading: "こたえる", type: "kun", sentence: "しつもんに 答える。" },
    { reading: "とう", type: "on", sentence: "せい答を かく。" },
    { reading: "こたえ", type: "kun", sentence: "正しい 答え。" }
  ],

  // バッチ14: 漢字131-140
  "U+982D": [ // 頭
    { reading: "あたま", type: "kun", sentence: "頭が いい。" },
    { reading: "とう", type: "on", sentence: "一頭の うま。" },
    { reading: "あたま", type: "kun", sentence: "頭を あらう。" }
  ],
  "U+540C": [ // 同
    { reading: "おなじ", type: "kun", sentence: "同じ いろ。" },
    { reading: "どう", type: "on", sentence: "同じょうする。" },
    { reading: "おな", type: "kun", sentence: "同じく する。" }
  ],
  "U+9053": [ // 道
    { reading: "みち", type: "kun", sentence: "まっすぐな 道。" },
    { reading: "どう", type: "on", sentence: "道ろを あるく。" },
    { reading: "みち", type: "kun", sentence: "いえへの 道。" }
  ],
  "U+8AAD": [ // 読
    { reading: "よむ", type: "kun", sentence: "ほんを 読む。" },
    { reading: "どく", type: "on", sentence: "読しょの じかん。" },
    { reading: "よ", type: "kun", sentence: "読み かたを ならう。" }
  ],
  "U+5185": [ // 内
    { reading: "うち", type: "kun", sentence: "いえの 内に いる。" },
    { reading: "ない", type: "on", sentence: "あん内する。" },
    { reading: "うち", type: "kun", sentence: "内がわ。" }
  ],
  "U+5357": [ // 南
    { reading: "みなみ", type: "kun", sentence: "南の そら。" },
    { reading: "なん", type: "on", sentence: "南ぶに いく。" },
    { reading: "みなみ", type: "kun", sentence: "南へ とぶ。" }
  ],
  "U+8089": [ // 肉
    { reading: "にく", type: "kun", sentence: "肉を たべる。" },
    { reading: "にく", type: "on", sentence: "肉しょくする。" },
    { reading: "にく", type: "kun", sentence: "肉が やわらかい。" }
  ],
  "U+99AC": [ // 馬
    { reading: "うま", type: "kun", sentence: "馬に のる。" },
    { reading: "ば", type: "on", sentence: "馬車に のる。" },
    { reading: "うま", type: "kun", sentence: "はやい 馬。" }
  ],
  "U+58F2": [ // 売
    { reading: "うる", type: "kun", sentence: "ものを 売る。" },
    { reading: "ばい", type: "on", sentence: "売てんする。" },
    { reading: "う", type: "kun", sentence: "売り ものが ある。" }
  ],
  "U+9EA6": [ // 麦
    { reading: "むぎ", type: "kun", sentence: "麦が そだつ。" },
    { reading: "ばく", type: "on", sentence: "小麦こを つかう。" },
    { reading: "むぎ", type: "kun", sentence: "麦ばたけ。" }
  ],

  // バッチ15: 漢字141-150
  "U+534A": [ // 半
    { reading: "はん", type: "on", sentence: "八時半に おきる。" },
    { reading: "なか", type: "kun", sentence: "半ばに なる。" },
    { reading: "はん", type: "on", sentence: "半分に わける。" }
  ],
  "U+756A": [ // 番
    { reading: "ばん", type: "on", sentence: "一番に なる。" },
    { reading: "ばん", type: "on", sentence: "ばん号を かく。" },
    { reading: "ばん", type: "on", sentence: "じゅん番を まつ。" }
  ],
  "U+7236": [ // 父
    { reading: "ちち", type: "kun", sentence: "父と あそぶ。" },
    { reading: "ふ", type: "on", sentence: "父母と でかける。" },
    { reading: "ちち", type: "kun", sentence: "父が かえる。" }
  ],
  "U+98A8": [ // 風
    { reading: "かぜ", type: "kun", sentence: "つよい 風。" },
    { reading: "ふう", type: "on", sentence: "台風が くる。" },
    { reading: "かぜ", type: "kun", sentence: "風が ふく。" }
  ],
  "U+5206": [ // 分
    { reading: "わける", type: "kun", sentence: "ふたつに 分ける。" },
    { reading: "ぶん", type: "on", sentence: "十分 やすむ。" },
    { reading: "わ", type: "kun", sentence: "分かれる。" }
  ],
  "U+805E": [ // 聞
    { reading: "きく", type: "kun", sentence: "おとを 聞く。" },
    { reading: "ぶん", type: "on", sentence: "新聞を よむ。" },
    { reading: "き", type: "kun", sentence: "聞いて みる。" }
  ],
  "U+7C73": [ // 米
    { reading: "こめ", type: "kun", sentence: "米を とぐ。" },
    { reading: "べい", type: "on", sentence: "米こくを たべる。" },
    { reading: "こめ", type: "kun", sentence: "あたらしい 米。" }
  ],
  "U+6B69": [ // 歩
    { reading: "あるく", type: "kun", sentence: "みちを 歩く。" },
    { reading: "ほ", type: "on", sentence: "さん歩する。" },
    { reading: "ある", type: "kun", sentence: "歩いて いく。" }
  ],
  "U+6BCD": [ // 母
    { reading: "はは", type: "kun", sentence: "母と はなす。" },
    { reading: "ぼ", type: "on", sentence: "母音を まなぶ。" },
    { reading: "はは", type: "kun", sentence: "母が よぶ。" }
  ],
  "U+65B9": [ // 方
    { reading: "かた", type: "kun", sentence: "あの 方は だれ？" },
    { reading: "ほう", type: "on", sentence: "そちらの 方。" },
    { reading: "かた", type: "kun", sentence: "やり方を ならう。" }
  ],

  // バッチ16: 漢字151-160
  "U+5317": [ // 北
    { reading: "きた", type: "kun", sentence: "北の ほう。" },
    { reading: "ほく", type: "on", sentence: "北ぶに いく。" },
    { reading: "きた", type: "kun", sentence: "北から ふく。" }
  ],
  "U+6BCE": [ // 毎
    { reading: "まい", type: "on", sentence: "毎日 がっこうに いく。" },
    { reading: "まい", type: "on", sentence: "毎しゅう はしる。" },
    { reading: "まい", type: "on", sentence: "毎あさ はを みがく。" }
  ],
  "U+59B9": [ // 妹
    { reading: "いもうと", type: "kun", sentence: "妹と あそぶ。" },
    { reading: "まい", type: "on", sentence: "妹だいで いく。" },
    { reading: "いもうと", type: "kun", sentence: "妹が わらう。" }
  ],
  "U+4E07": [ // 万
    { reading: "まん", type: "on", sentence: "一万えん。" },
    { reading: "ばん", type: "on", sentence: "万年ひつを つかう。" },
    { reading: "まん", type: "on", sentence: "百万の ほし。" }
  ],
  "U+660E": [ // 明
    { reading: "あかるい", type: "kun", sentence: "明るい へや。" },
    { reading: "あ", type: "kun", sentence: "明かり。" },
    { reading: "めい", type: "on", sentence: "明日 あう。" }
  ],
  "U+9CF4": [ // 鳴
    { reading: "なく", type: "kun", sentence: "とりが 鳴く。" },
    { reading: "な", type: "kun", sentence: "鳴き声。" },
    { reading: "めい", type: "on", sentence: "きゅう鳴する。" }
  ],
  "U+6BDB": [ // 毛
    { reading: "け", type: "kun", sentence: "毛が ながい。" },
    { reading: "もう", type: "on", sentence: "毛ふを きる。" },
    { reading: "け", type: "kun", sentence: "ねこの 毛。" }
  ],
  "U+9580": [ // 門
    { reading: "もん", type: "on", sentence: "門を とおる。" },
    { reading: "かど", type: "kun", sentence: "門の まえ。" },
    { reading: "もん", type: "on", sentence: "正門から はいる。" }
  ],
  "U+591C": [ // 夜
    { reading: "よる", type: "kun", sentence: "夜に ねる。" },
    { reading: "や", type: "on", sentence: "夜ちゅうに おきる。" },
    { reading: "よ", type: "kun", sentence: "夜が ふける。" }
  ],
  "U+91CE": [ // 野
    { reading: "の", type: "kun", sentence: "野はらで あそぶ。" },
    { reading: "や", type: "on", sentence: "や菜を たべる。" },
    { reading: "の", type: "kun", sentence: "野を かける。" }
  ]
};

// ルビを付与する関数
function addRuby(sentence, targetKanji) {
  // 対象漢字以外の漢字にルビを付ける
  // 簡易実装：よく使う漢字のみ対応
  const rubyMap = {
    '白': 'しろ', '大': 'おお', '二': 'に', '一': 'いち', '三': 'さん',
    '木': 'き', '生': 'せい', '東': 'とう', '来': 'らい', '正': 'せい',
    '新': 'しん', '外': 'がい', '今': 'こん', '父': 'ちち', '母': 'はは',
    '上': 'じょう', '百': 'ひゃく', '十': 'じゅう', '八': 'はち'
  };

  let result = sentence;
  for (const [kanji, reading] of Object.entries(rubyMap)) {
    if (kanji !== targetKanji && sentence.includes(kanji)) {
      result = result.replace(new RegExp(kanji, 'g'), `${kanji}[${reading}]`);
    }
  }
  return result;
}

// ひらがなに変換する関数
function toHiragana(sentence, targetKanji, reading) {
  // 対象漢字を読みに置換
  let result = sentence.replace(targetKanji, reading);

  // その他の漢字を平仮名に変換（簡易実装）
  const kanjiMap = {
    '白い': 'しろい', '大きな': 'おおきな', '二': 'に', '一': 'いち',
    '木': 'き', '生': 'せい', '東': 'とう', '来': 'らい', '正': 'せい',
    '新': 'しん', '外': 'がい', '今': 'こん', '三': 'さん',
    '正しい': 'ただしい', '百': 'ひゃく', '十': 'じゅう', '八': 'はち'
  };

  for (const [kanji, hiragana] of Object.entries(kanjiMap)) {
    result = result.replace(new RegExp(kanji, 'g'), hiragana);
  }

  return result;
}

// バッチごとに処理
for (let batchNum = 3; batchNum <= 16; batchNum++) {
  const startIdx = (batchNum - 1) * 10 - 20; // バッチ3は漢字21から（インデックス20）
  const endIdx = startIdx + 10;
  const batchKanjis = targetKanjis.slice(startIdx, endIdx);

  const batchData = batchKanjis.map(kanji => {
    const examples = exampleData[kanji.kanjiId];

    if (!examples) {
      console.warn(`Warning: No examples for ${kanji.character} (${kanji.kanjiId})`);
      return null;
    }

    return {
      kanjiId: kanji.kanjiId,
      character: kanji.character,
      newExamples: examples.map((ex, idx) => ({
        id: `${kanji.kanjiId}-ex-${idx + 3}`,
        sentence: ex.sentence,
        reading: ex.reading,
        type: ex.type,
        sentenceWithRuby: addRuby(ex.sentence, kanji.character),
        sentenceHiragana: toHiragana(ex.sentence, kanji.character, ex.reading)
      }))
    };
  }).filter(item => item !== null);

  // JSONファイルとして保存
  const outputPath = path.join(__dirname, `generated-batch-${batchNum}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(batchData, null, 2), 'utf8');
  console.log(`✓ Batch ${batchNum} generated: ${outputPath}`);
}

console.log('\n全バッチ（3-16）の生成が完了しました。');
