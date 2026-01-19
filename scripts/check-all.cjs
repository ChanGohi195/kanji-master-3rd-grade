/**
 * 全データチェック一括実行スクリプト
 */
const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  { name: '漢字データ', file: 'check-kanji.cjs' },
  { name: '例文データ', file: 'check-examples.cjs' },
  { name: '熟語データ', file: 'check-jukugo.cjs' }
];

console.log('╔════════════════════════════════════════╗');
console.log('║     漢字マスター 3年生版 データ検証    ║');
console.log('╚════════════════════════════════════════╝\n');

let totalErrors = 0;
const results = [];

scripts.forEach(script => {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`▶ ${script.name}チェック`);
  console.log('─'.repeat(50));

  try {
    execSync(`node ${path.join(__dirname, script.file)}`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    results.push({ name: script.name, status: 'OK' });
  } catch (error) {
    results.push({ name: script.name, status: 'ERROR' });
    totalErrors++;
  }
});

// サマリー
console.log(`\n${'═'.repeat(50)}`);
console.log('サマリー');
console.log('═'.repeat(50));

results.forEach(r => {
  const icon = r.status === 'OK' ? '[OK]' : '[NG]';
  console.log(`  ${icon} ${r.name}`);
});

console.log('─'.repeat(50));
if (totalErrors === 0) {
  console.log('全てのチェックをパスしました！');
} else {
  console.log(`${totalErrors}件のエラーがあります`);
}

process.exit(totalErrors > 0 ? 1 : 0);
