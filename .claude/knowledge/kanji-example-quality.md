# 漢字例文品質プレイブック

## データモデル

### examples.json
```json
{
  "kanjiId": "U+XXXX",
  "character": "漢",
  "examples": [{
    "id": "U+XXXX-ex-N",
    "sentence": "漢字を かく。",
    "reading": "か.く",           // ドット記法: 語幹.送り仮名
    "type": "kun" | "on",
    "sentenceWithRuby": "漢字[かんじ]を かく。",  // [読み]でルビ
    "sentenceHiragana": "かんじを かく。",
    "targetWord": "漢字"          // optional: 熟語の場合
  }],
  "strokeCount": 10
}
```

### kanji-gN.json
```json
{
  "id": "U+XXXX",
  "character": "漢",
  "grade": N,
  "strokeCount": 10,
  "readings": {
    "on": ["カン"],
    "kun": ["か.く"]             // ドット記法
  },
  "meanings": ["..."]
}
```

### フィールド関係
- `reading` → `kanji-gN.json` の on/kun 読みと対応
- `sentenceWithRuby` → `sentence` にルビ付与したもの（stripRuby(ruby) === sentence）
- `sentenceHiragana` → `sentence` を全ひらがな化したもの
- `targetWord` → `sentence` に含まれる熟語（混合表記で一致しない場合あり）

## 13パターン一覧

| ID | 優先度 | パターン | 検出ロジック | 2年生参考率 |
|----|--------|---------|-------------|------------|
| 1 | P0 | sentenceHiragana未変換 | ひらがな・記号以外の文字残存 | 0件 |
| 2 | P0 | sentenceHiragana送り仮名重複 | reading送り仮名部分の二重化（助詞除外） | 2件 |
| 3 | P1 | 例文重複 | 異なる漢字間で同一sentence | 6件 |
| 4 | P1 | readingが熟語全体 | 既知読みと完全に無関係な複合読み | 1件 |
| 5 | P1 | 対象漢字sentence不在 | sentence に対象漢字なし | 0件 |
| 6 | P1 | ルビ除去≠原文 | stripRuby(sentenceWithRuby) !== sentence | 0件 |
| 7 | P2 | reading/type誤り | on読みなのにtype=kun、またはその逆 | 1件 |
| 8 | P2 | sentenceWithRubyルビ欠落 | 同学年漢字にルビなし | 5件 |
| 9 | P3 | readingドット記法欠落 | kun読みでドットなし＋sentenceに送り仮名あり | 14件 |
| 10 | P3 | targetWord破綻語 | ひらがな部分が漢字自身の読みと一致 | 1件 |
| 11 | P3 | ルビ読み誤り | 単漢字ルビの読みがkanji-gN.jsonと不一致 | 2件 |
| 12 | P3 | 読み不一致 | readingがsentenceHiraganaに出現しない | 0件 |
| 13 | P3 | targetWord/sentence不一致 | targetWordがsentenceにマッチしない（混合表記考慮） | 4件 |

## 修正パイプライン

### Phase A: 機械的修正（P0 + 一部P1）
- **対象**: P0全件 + P1のうち自動修正可能なもの
- **手法**: スクリプトまたは一括置換
- **例**: sentenceHiragana再生成、ルビ再付与

### Phase B: 判断を伴う修正（残P1 + P2）
- **対象**: 例文重複の解消、reading/type修正、ルビ欠落補完
- **手法**: 個別確認しながら修正
- **判断基準**: 教育的妥当性（2年生の語彙レベル）

### Phase C: LLM生成を伴う修正（P3）
- **対象**: ドット記法修正、targetWord整合、ルビ読み修正
- **手法**: LLMで代替例文生成 → 人間レビュー
- **注意**: 生成後に analyze-quality.cjs で再検証必須

### 各Phase共通
1. `node scripts/analyze-quality.cjs` でレポート取得
2. 優先度別に分類
3. 修正実施
4. 再実行で0件確認
5. `node scripts/check-consistency.cjs` でも確認
6. コミット

## cron実行プロトコル

```bash
# 1. レポート取得
node scripts/analyze-quality.cjs > .ops/quality-reports/$(date +%Y%m%d).json

# 2. サマリー確認
node scripts/analyze-quality.cjs --human

# 3. 前回比較（件数変化）
# 新規issue = 品質劣化のシグナル

# 4. 修正（Phase A→B→C の順）
# 5. 再検証
node scripts/analyze-quality.cjs  # 修正後0件確認
node scripts/check-consistency.cjs  # 既存チェックも通過

# 6. コミット + opsログ
```

## 2年生実績値（Phase A-C完了後の残存）

| 優先度 | 修正前（推定） | Phase A-C後 | 備考 |
|--------|---------------|-------------|------|
| P0 | 91件 | 2件 | 送り仮名重複（組む、知る） |
| P1 | 30件 | 7件 | 重複6件 + 熟語読み1件 |
| P2 | 10件 | 6件 | ルビ欠落5件 + type誤り1件 |
| P3 | 7件 | 21件 | 新パターン検出（ドット記法14件等） |
| **合計** | **138件** | **36件** | Phase A-Cは旧パターン対象 |

Phase A-C は check-consistency.cjs の3パターンを対象とした修正。
analyze-quality.cjs の13パターンは上位互換であり、追加の品質向上余地がある。
