# 例文生成スクリプト

小学2年生版漢字マスターの例文を各漢字5例文に拡張するためのスクリプト群。

## 概要

- **現状**: 160漢字、各2例文（合計320文）
- **目標**: 160漢字、各5例文（合計800文）
- **追加必要**: 各3例文（合計480文）

## ファイル構成

```
scripts/
├── generate-examples.cjs   # メインスクリプト（分析・マージ）
├── batch-generator.cjs     # バッチ処理ヘルパー
├── merge-batches.cjs       # バッチマージ
├── check-consistency.cjs   # 整合性チェック
└── README.md               # このファイル
```

## 使用方法

### Step 1: 現状分析

全160漢字のデータを抽出し、LLM用プロンプトを生成します。

```bash
node scripts/generate-examples.cjs analyze
```

**生成されるファイル:**
- `scripts/kanji-list.json` - 全漢字のデータ
- `scripts/prompt-template.txt` - LLM用プロンプト

### Step 2: バッチ処理（推奨）

160漢字を一度に処理するのは大変なので、10漢字ずつバッチ処理します。

#### 2-1. バッチプロンプト生成

```bash
# バッチ1（漢字1-10）
node scripts/batch-generator.cjs 1

# バッチ2（漢字11-20）
node scripts/batch-generator.cjs 2

# ...（バッチ16まで）
node scripts/batch-generator.cjs 16
```

#### 2-2. LLMで例文生成

生成されたプロンプトをClaude等のLLMに入力し、出力されたJSONを保存:

```
scripts/generated-batch-1.json
scripts/generated-batch-2.json
...
scripts/generated-batch-16.json
```

#### 2-3. バッチマージ

全バッチファイルを結合します。

```bash
node scripts/merge-batches.cjs
```

**生成されるファイル:**
- `scripts/generated-examples.json` - 全480例文

### Step 3: 例文マージ

生成された例文をexamples.jsonにマージします。

```bash
node scripts/generate-examples.cjs merge
```

**動作:**
1. `static/data/examples.json` をバックアップ
2. `scripts/generated-examples.json` の検証
3. 例文の追加
4. 更新されたファイルの保存

### Step 4: 整合性チェック

マージ後の整合性を確認します。

```bash
node scripts/check-consistency.cjs
```

## 例文フォーマット

### 必須フィールド

```json
{
  "id": "U+5F15-ex-3",
  "sentence": "つなを 引く。",
  "reading": "ひく",
  "type": "kun",
  "sentenceWithRuby": "つなを 引く。",
  "sentenceHiragana": "つなを ひく。"
}
```

### フィールド説明

| フィールド | 説明 | 例 |
|------------|------|-----|
| id | 一意のID | `U+5F15-ex-3` |
| sentence | 例文（対象漢字以外はひらがな） | `つなを 引く。` |
| reading | 対象漢字の読み | `ひく` |
| type | 読みの種類 | `kun` or `on` |
| sentenceWithRuby | ルビ付き例文 | `糸[いと]を 引く。` |
| sentenceHiragana | 全てひらがな | `いとを ひく。` |

## 要件

### 例文の条件

1. **小学2年生向け**: 簡単でわかりやすい文
2. **既存の読みを使用**: 新しい読みは作らない
3. **対象漢字を含む**: sentenceに必ず含まれること
4. **ルビの正確性**: 対象漢字以外の漢字にのみ[読み]を付ける
5. **ひらがな変換**: sentenceHiraganaは完全にひらがな

### 検証項目

スクリプトは以下をチェックします:

- [x] 必須フィールドの存在
- [x] typeが"on"または"kun"
- [x] 対象漢字がsentenceに含まれる
- [x] ルビ除去後のテキストがsentenceと一致
- [x] readingがsentenceHiraganaに含まれる（連濁対応）
- [x] IDの重複がない

## トラブルシューティング

### エラー: "sentence に漢字が含まれていません"

対象漢字がsentenceに含まれていることを確認してください。

```json
// NG
"sentence": "いとを ひく。"

// OK
"sentence": "糸[いと]を 引く。"
```

### エラー: "sentenceWithRuby のルビを除去した結果が sentence と一致しません"

ルビの記法を確認してください。

```json
// NG
"sentence": "糸を 引く。",
"sentenceWithRuby": "糸を 引く。"  // ルビが足りない

// OK
"sentence": "糸を 引く。",
"sentenceWithRuby": "糸[いと]を 引く。"
```

### エラー: "読み不一致"

readingがsentenceHiraganaに含まれていることを確認してください（連濁も考慮）。

```json
// OK（連濁）
"reading": "はし",
"sentenceHiragana": "みちのはしをわたる。"  // "はし"が含まれる

// OK（連濁）
"reading": "はし",
"sentenceHiragana": "まちのはじをあるく。"  // "はじ"（連濁）が含まれる
```

## バックアップ

マージ実行時、自動的にバックアップが作成されます:

```
scripts/examples-backup.json
```

問題があれば、このファイルから復元できます:

```bash
cp scripts/examples-backup.json static/data/examples.json
```

## 進捗管理

### 現在の進捗確認

```bash
node -e "const d=require('./static/data/examples.json'); console.log(\`完了: \${d.filter(k=>k.examples.length>=5).length}/160\`);"
```

### 未完了の漢字リスト

```bash
node -e "const d=require('./static/data/examples.json'); d.filter(k=>k.examples.length<5).forEach(k=>console.log(\`\${k.character}: \${k.examples.length}/5\`));"
```

## 参考

- 既存スクリプト: `check-consistency.cjs`, `add-hiragana.cjs`
- データファイル: `static/data/examples.json`
- プロジェクト: 漢字マスター2年生版
