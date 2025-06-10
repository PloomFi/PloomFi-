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
