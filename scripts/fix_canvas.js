const fs = require('fs');

const CANVAS_FILE = 'canvas.json';

function fixCanvas() {
  console.log('--- Starting canvas.json Auto-fix ---');

  if (!fs.existsSync(CANVAS_FILE)) {
    console.error(`Error: ${CANVAS_FILE} not found!`);
    process.exit(1);
  }

  const content = fs.readFileSync(CANVAS_FILE, 'utf8');

  let data;
  try {
    data = JSON.parse(content);
    // If valid, just format it
    fs.writeFileSync(CANVAS_FILE, JSON.stringify(data, null, 2));
    console.log('JSON is already valid, formatted successfully.');
    return;
  } catch (err) {
    console.log(`JSON parse failed (${err.message}). Attempting regex extraction...`);
  }

  // Attempt to recover by extracting all "song", "artist", "url" sets.
  // First, find anything that looks like an object.
  const itemRegex = /\{[^{}]*\}/g;
  const items = [];
  let match;
  let hasExtracted = false;

  while ((match = itemRegex.exec(content)) !== null) {
    const block = match[0];
    const songMatch = /"song"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/.exec(block);
    const artistMatch = /"artist"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/.exec(block);
    const urlMatch = /"url"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/.exec(block);

    if (songMatch && artistMatch && urlMatch) {
      items.push({
        song: songMatch[1],
        artist: artistMatch[1],
        url: urlMatch[1]
      });
      hasExtracted = true;
    }
  }

  // If no object blocks found, try sequential extraction
  if (!hasExtracted) {
    console.log('No valid {} blocks found, attempting sequential field extraction...');
    const songRegex = /"song"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    const artistRegex = /"artist"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    const urlRegex = /"url"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;

    const songs = [...content.matchAll(songRegex)].map(m => m[1]);
    const artists = [...content.matchAll(artistRegex)].map(m => m[1]);
    const urls = [...content.matchAll(urlRegex)].map(m => m[1]);

    const count = Math.min(songs.length, artists.length, urls.length);
    for (let i = 0; i < count; i++) {
      items.push({
        song: songs[i],
        artist: artists[i],
        url: urls[i]
      });
    }
  }

  
  // Deduplicate items
  const uniqueItems = [];
  const seen = new Set();
  for (const item of items) {
    const key = `${item.song.toLowerCase().trim()}|${item.artist.toLowerCase().trim()}|${item.url.trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }
  items.length = 0;
  items.push(...uniqueItems);

if (items.length > 0) {
    // We should also check for any lost items that might have been correctly parsed in the baseline
    // but were mangled by the user. Actually, this regex approach captures everything matching the keys.
    const newData = { items };
    fs.writeFileSync(CANVAS_FILE, JSON.stringify(newData, null, 2));
    console.log(`Auto-fixed JSON and recovered ${items.length} items.`);
  } else {
    console.error('Could not auto-fix JSON. No valid item fields found.');
    process.exit(1);
  }
}

fixCanvas();
