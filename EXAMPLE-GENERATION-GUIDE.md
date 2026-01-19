# 例文生成ガイド

小学2年生版漢字マスターの例文を5例文/漢字に拡張する手順。

## クイックスタート

### 1. 現状分析

```bash
node scripts/generate-examples.cjs analyze
```

これにより以下が生成されます:
- `scripts/kanji-list.json` - 160漢字のデータ（既存の読み付き）
- `scripts/prompt-template.txt` - LLM用プロンプト

### 2. バッチ処理で例文生成

160漢字を一度に処理するのは大変なので、10漢字ずつ処理します（全16バッチ）。

#### バッチ1（漢字1-10）

```bash
node scripts/batch-generator.cjs 1
```

出力されたプロンプトをClaude等に入力し、JSONのみを `scripts/generated-batch-1.json` として保存。

#### バッチ2-16

```bash
node scripts/batch-generator.cjs 2   # 漢字11-20
node scripts/batch-generator.cjs 3   # 漢字21-30
# ...
node scripts/batch-generator.cjs 16  # 漢字151-160
```

各バッチの出力を `scripts/generated-batch-N.json` として保存。

### 3. バッチマージ

全16バッチを結合します。

```bash
node scripts/merge-batches.cjs
```

`scripts/generated-examples.json` が生成されます（全480例文）。

### 4. 本データへマージ

```bash
node scripts/generate-examples.cjs merge
```

自動的にバックアップ（`scripts/examples-backup.json`）が作成され、
`static/data/examples.json` に例文が追加されます。

### 5. 整合性チェック

```bash
node scripts/check-consistency.cjs
```

エラーがあれば修正し、再度マージします。

## 例文作成の注意点

### 基本ルール

1. **小学2年生が理解できる文**: 難しい表現は避ける
2. **既存の読みを使う**: 新しい読みは作らない
3. **対象漢字を含める**: 必ずsentenceに含まれること
4. **対象漢字以外はひらがな**: sentenceは基本ひらがな + 対象漢字

### フォーマット例

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

### sentenceとsentenceWithRubyの違い

| フィールド | 説明 | 例 |
|------------|------|-----|
| sentence | 対象漢字以外はひらがな | `つなを 引く。` |
| sentenceWithRuby | 対象漢字以外の漢字にルビ | `糸[いと]を 引く。` |
| sentenceHiragana | 全てひらがな | `つなを ひく。` |

**重要**: sentenceWithRubyのルビを除去すると、sentenceと一致する必要があります。

## よくあるエラーと対処法

### エラー: "sentence に漢字が含まれていません"

```json
// NG
{
  "sentence": "いとを ひく。",  // 「引」がない
  "reading": "ひく"
}

// OK
{
  "sentence": "糸を 引く。",     // 「引」がある
  "reading": "ひく"
}
```

### エラー: "ルビ除去≠原文"

```json
// NG
{
  "sentence": "糸を 引く。",
  "sentenceWithRuby": "糸を 引く。"  // 「糸」にルビがない
}

// OK
{
  "sentence": "糸を 引く。",
  "sentenceWithRuby": "糸[いと]を 引く。"  // 「糸」にルビ
}
```

または、sentenceをひらがなにする:

```json
// OK
{
  "sentence": "いとを 引く。",
  "sentenceWithRuby": "いとを 引く。"  // ルビ不要
}
```

### エラー: "読み不一致"

```json
// NG
{
  "reading": "ひく",
  "sentenceHiragana": "つなを ひっぱる。"  // 「ひく」が含まれていない
}

// OK
{
  "reading": "ひく",
  "sentenceHiragana": "つなを ひく。"      // 「ひく」が含まれる
}
```

**連濁にも対応**: 「はし」→「はじ」「ばし」も一致とみなされます。

## 進捗確認

### 完了数確認

```bash
node -e "const d=require('./static/data/examples.json'); console.log(\`完了: \${d.filter(k=>k.examples.length>=5).length}/160\`);"
```

### 未完了リスト

```bash
node -e "const d=require('./static/data/examples.json'); d.filter(k=>k.examples.length<5).forEach(k=>console.log(\`\${k.character}: \${k.examples.length}/5\`));"
```

## 復元方法

問題があれば、バックアップから復元できます:

```bash
cp scripts/examples-backup.json static/data/examples.json
```

## トラブルシューティング

### バッチファイルが見つからない

```bash
# バッチファイルの確認
ls scripts/generated-batch-*.json
```

### マージエラー

1. `scripts/generated-examples.json` の内容を確認
2. JSONの形式が正しいか確認（[]で囲まれた配列）
3. エラーメッセージに従って修正

### 整合性チェックでエラー

1. エラー内容を確認
2. 該当する例文を修正
3. 再度マージ実行

## 詳細ドキュメント

より詳しい情報は `scripts/README.md` を参照してください。
