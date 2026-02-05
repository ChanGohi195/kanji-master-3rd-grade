# プロジェクト制約

## 読みデータ品質

**発見日**: 2026-02-04
**分類**: constraint
**根拠**: .ops/2026-02-04.md, MEMORY.md
**内容**:
- 連濁の見落としに注意: 気軽(がる), 手軽(がる) など compound内で濁音化するケース
- 夕陽: 文語読み「せきよう」ではなく常用読み「ゆうひ」が正しい
- sentenceWithRuby, sentenceHiragana, reading, type の4フィールドは整合性を保つ

## 読みクイズUI

**発見日**: 2026-02-04
**分類**: constraint
**根拠**: .ops/2026-02-04.md, MEMORY.md
**内容**:
- 熟語の場合: 「七福神」の「福」の よみかたは？ の形式で出題
- VerticalSentenceは targetKanji のみ渡す（targetWord不要）
- 選択肢の重複排除は getStemReading ベースで行う
- 4択保証: 同一漢字の読みで足りなければ他漢字から補充
