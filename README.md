# かんじマスター（4年生）

小学校4年生向けの漢字学習アプリです。  
SvelteKit + TypeScript で構成され、ローカル学習記録は IndexedDB（Dexie）に保存します。

## 主な機能

- 文章モード（よみ / かき）
- チャレンジモード（時間制）
- 漢字図鑑（習熟度表示）
- 検索（漢字・読み・熟語）
- 保護者モード（週間統計、PIN）

## 技術スタック

- SvelteKit 2 / Svelte 5 / TypeScript
- Tailwind CSS 4
- Dexie（IndexedDB）

## セットアップ

```sh
npm install
```

## 開発

```sh
npm run dev
```

## 型チェック

```sh
npm run check
```

## ビルド

```sh
npm run build
npm run preview
```

## データ配置

- `static/data/kanji-g4.json`: 漢字マスターデータ
- `static/data/examples.json`: 例文データ
- `static/data/jukugo.json`: 熟語データ

## 補足

例文/熟語の生成・検証スクリプトは `scripts/` 配下にあります。  
運用手順は `scripts/README.md` を参照してください。
