/*
 * Verify the population thresholds used for town size and village count in
 * the original DOS and Windows executables.
 *
 * Usage:
 *   node tools/analyze-village-thresholds.js <lotr2-directory>
 */
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) {
  throw new Error('usage: analyze-village-thresholds.js <lotr2-directory>');
}

const targets = [
  {
    file: 'L2D.EXE',
    townOffset: 0x81a50,
    villageOffset: 0x81ab0,
    town: [800, 1200],
    villages: [600, 1000, 1400, 1600]
  },
  {
    file: 'LORDS2.EXE',
    townOffset: 0x3d9a0,
    villageOffset: 0x3da30,
    town: [800, 1200],
    villages: [600, 1000, 1400, 1600]
  }
];

function findOrderedUInt32(buffer, offset, values, windowSize) {
  let cursor = offset;
  const end = Math.min(buffer.length, offset + windowSize);
  return values.map(value => {
    const needle = Buffer.alloc(4);
    needle.writeUInt32LE(value);
    const found = buffer.indexOf(needle, cursor);
    if (found < 0 || found >= end) {
      throw new Error(`missing ${value} near 0x${offset.toString(16)}`);
    }
    cursor = found + needle.length;
    return found;
  });
}

for (const target of targets) {
  const buffer = fs.readFileSync(path.join(root, target.file));
  const townHits = findOrderedUInt32(buffer, target.townOffset, target.town, 0x80);
  const villageHits = findOrderedUInt32(buffer, target.villageOffset, target.villages, 0xc0);
  console.log(`${target.file}:`);
  console.log(`  town bounds ${target.town.join(', ')} at ${townHits.map(x => `0x${x.toString(16)}`).join(', ')}`);
  console.log(`  village bounds ${target.villages.join(', ')} at ${villageHits.map(x => `0x${x.toString(16)}`).join(', ')}`);
}

console.log('Villages appear at populations 601, 1001, 1401 and 1601.');
console.log('Town sizes change at populations 801 and 1201.');
