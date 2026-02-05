# テスト規約

## 原則

実装直後にテスト。fail fast。

## ルール

1. **ロジック変更時は必ずテストを書く/更新する**（特に `src/lib/services/`）
2. **テストを通してからコミット**（`npm test` がパスすること）
3. テスト対象は純粋ロジック優先。DOM依存のコンポーネントテストは費用対効果で判断

## コマンド

```bash
npm test          # 全テスト実行
npm run test:watch # ウォッチモード
```

## カバレッジ

```bash
npm test -- --coverage
```

## テストファイル配置

ソースと同階層に `.test.ts` を置く:

```
src/lib/services/strokeValidator.ts
src/lib/services/strokeValidator.test.ts
```

## DOM依存の回避

- `generateReferenceImage`等のDOM(Canvas API)依存関数はNode.jsテスト不可
- **confidence値をゲート識別子として使う**: 各ゲートが固有のconfidence値を返す設計にし、テストでは「どのゲートが発火したか」を値で判別（0.1=ストローク数, 0.15=カバレッジ）
- DOM到達前にrejectされるテスト入力を設計する（高カバレッジ画像→絶対カバレッジゲート等）
