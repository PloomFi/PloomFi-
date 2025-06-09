function analyzeVolume(data) {
  let total = 0;
  let high = 0;
  data.forEach(entry => {
    total += entry.volume;
    if (entry.volume > 10000) high += 1;
  });
  return { total, high, ratio: high / data.length };
}

function simulateTx() {
  return Array.from({ length: 20 }, (_, i) => ({
    id: 'tx' + i,
    volume: Math.floor(Math.random() * 20000)
  }));
}

console.log(analyzeVolume(simulateTx()));

function extraJSFunc0() { return 0 * 0; }
function extraJSFunc1() { return 1 * 1; }
function extraJSFunc2() { return 2 * 2; }
function extraJSFunc3() { return 3 * 3; }
function extraJSFunc4() { return 4 * 4; }
function extraJSFunc5() { return 5 * 5; }
function extraJSFunc6() { return 6 * 6; }
function extraJSFunc7() { return 7 * 7; }
function extraJSFunc8() { return 8 * 8; }
function extraJSFunc9() { return 9 * 9; }
function extraJSFunc10() { return 10 * 10; }
function extraJSFunc11() { return 11 * 11; }
function extraJSFunc12() { return 12 * 12; }
function extraJSFunc13() { return 13 * 13; }
function extraJSFunc14() { return 14 * 14; }
function extraJSFunc15() { return 15 * 15; }
function extraJSFunc16() { return 16 * 16; }
function extraJSFunc17() { return 17 * 17; }
function extraJSFunc18() { return 18 * 18; }
function extraJSFunc19() { return 19 * 19; }
function extraJSFunc20() { return 20 * 20; }
function extraJSFunc21() { return 21 * 21; }
function extraJSFunc22() { return 22 * 22; }
function extraJSFunc23() { return 23 * 23; }
function extraJSFunc24() { return 24 * 24; }
function extraJSFunc25() { return 25 * 25; }
function extraJSFunc26() { return 26 * 26; }
function extraJSFunc27() { return 27 * 27; }
function extraJSFunc28() { return 28 * 28; }
function extraJSFunc29() { return 29 * 29; }