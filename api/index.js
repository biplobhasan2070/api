import express from "express";
import fetch from "node-fetch";
import JSZip from "jszip";

const app = express();

app.get("/", (req, res) => {
  res.set("Content-Type", "text/html");
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SteamTools Manifest Downloader</title>
    <style>
      body { background:#0d1117; color:#c9d1d9; font-family:Arial; text-align:center; padding:2rem; }
      h1 { color:#58a6ff; }
      .link { color:#58a6ff; text-decoration:none; }
    </style>
    <script type='text/javascript' src='//interestingcollide.com/0d/30/00/0d3000241cdab78221fa014b4a84a40e.js'></script>
  </head>
  <body>
    <h1>HEY I AM WORKING...</h1>
    <p>ASK <a href="https://t.me/Nafisfuad1" class="link">@Nafisfuad1</a> For ACCESS</p>
  </body>
  </html>
  `);
});

// ================= KEY-BASED CIPHER =================
const SECRET_KEY = "N4F1S_FU4D_OWN_SYSTEM_2025";

// Generate a deterministic substitution table from the key
function generateSubstitutionTable(key) {
  // Start with digits 0-9
  let table = "0123456789".split('');
  
  // Create a seed from the key
  let seed = 0;
  for (let i = 0; i < key.length; i++) {
    seed = (seed * 31 + key.charCodeAt(i)) & 0xFFFF;
  }
  
  // Shuffle the table using the seed (deterministic)
  for (let i = table.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF;
    const j = seed % (i + 1);
    [table[i], table[j]] = [table[j], table[i]];
  }
  
  return table;
}

// Generate forward and reverse tables once
const SUB_TABLE = generateSubstitutionTable(SECRET_KEY);
const REV_TABLE = {};
for (let i = 0; i < SUB_TABLE.length; i++) {
  REV_TABLE[SUB_TABLE[i]] = i.toString();
}

function encodeCipher(num) {
  const str = String(num);
  
  // 1. Substitute digits using the key-based table
  let substituted = "";
  for (let i = 0; i < str.length; i++) {
    const digit = str[i];
    substituted += SUB_TABLE[parseInt(digit)];
  }
  
  // 2. Add length as prefix (A=1, B=2, etc.)
  const lengthChar = String.fromCharCode(65 + (str.length - 1));
  
  // 3. Calculate checksum (sum of original digits * 7 mod 10)
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += parseInt(str[i]);
  }
  const checksum = (sum * 7) % 10;
  
  // Format: LENGTH_CHAR + CHECKSUM + SUBSTITUTED
  return lengthChar + checksum + substituted;
}

function decodeCipher(token) {
  try {
    if (!token || token.length < 3) return null;
    
    const lengthChar = token[0];
    const checksum = parseInt(token[1]);
    const substituted = token.slice(2);
    
    // Calculate expected length from character
    const expectedLength = (lengthChar.charCodeAt(0) - 65 + 1);
    
    if (substituted.length !== expectedLength) {
      return null;
    }
    
    // Reverse substitution
    let original = "";
    for (let i = 0; i < substituted.length; i++) {
      const char = substituted[i];
      if (!(char in REV_TABLE)) return null;
      original += REV_TABLE[char];
    }
    
    // Verify checksum
    let sum = 0;
    for (let i = 0; i < original.length; i++) {
      sum += parseInt(original[i]);
    }
    
    if ((sum * 7) % 10 !== checksum) {
      return null;
    }
    
    return original;
  } catch (e) {
    return null;
  }
}

function isValidCipher(str) {
  // Must start with A-Z
  if (!/^[A-Z]/.test(str)) return false;
  // Must have at least 3 characters (length char + checksum + at least 1 digit)
  if (str.length < 3) return false;
  // Must pass cipher validation
  return decodeCipher(str) !== null;
}

function isDirectNumericID(str) {
  // Direct numeric IDs are just digits
  if (!/^\d+$/.test(str)) return false;
  
  // If it's a valid cipher (starts with A-Z), it's not a direct numeric ID
  if (/^[A-Z]/.test(str)) return false;
  
  // If it's all digits and doesn't start with A-Z, it's probably direct numeric
  // Steam IDs are usually up to 7 digits
  return str.length <= 7;
}

// === Sources ===
const SOURCES = [
  {
    id: "server1",
    name: "SERVER 1",
    makeUrl: (id) =>
      `https://codeload.github.com/SSMGAlt/ManifestHub2/zip/refs/heads/${encodeURIComponent(id)}`,
    method: "GET",
  },
  {
    id: "server2",
    name: "SERVER 2",
    makeUrl: (id) =>
      `https://steamgames554.s3.us-east-1.amazonaws.com/${id}.zip`,
    method: "GET",
  },
  {
    id: "server3",
    name: "SERVER 3",
    makeUrl: () => `https://cysaw.pw/proxy`,
    method: "POST",
    body: (id) => JSON.stringify({ appId: id }),
    headers: { "Content-Type": "application/json" },
  },
  {
    id: "server4",
    name: "SERVER 4",
    makeUrl: (id) =>
      `https://codeload.github.com/chamaoze/SteamAutoCracks-ManifestHub/zip/refs/heads/${encodeURIComponent(id)}`,
    method: "GET",
  },
  {
    id: "server5",
    name: "SERVER 5",
    makeUrl: (id) =>
      `https://lua.dexpie.web.id/api/download?id=${encodeURIComponent(id)}`,
    method: "GET",
    type: "lua",
  },
  {
    name: "SERVER 6",
    makeUrl: (id) =>
      `https://pub-5b6d3b7c03fd4ac1afb5bd3017850e20.r2.dev/${id}.zip`,
    method: "GET",
  },
];

// === Fetch Steam game info ===
async function getSteamGameInfo(appId) {
  try {
    const resp = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const data = await resp.json();
    if (!data[appId] || !data[appId].success) return null;
    const game = data[appId].data;
    return {
      name: game.name,
      headerImg: game.header_image,
      shortDesc: game.short_description,
      type: game.type,
      releaseDate: game.release_date?.date || "Unknown",
    };
  } catch {
    return null;
  }
}

// === /proxy route ===
app.get("/proxy", async (req, res) => {
  const encodedId = req.query.id;
  if (!encodedId) return res.status(400).send("Missing id parameter");

  // Check if it's a direct numeric ID (reject)
  if (isDirectNumericID(encodedId)) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invalid ID - SteamTools</title>
        <style>
          body { background:#0d1117; color:#c9d1d9; font-family:Arial; text-align:center; padding:2rem; }
          h1 { color:#f85149; margin-bottom:1rem; }
          .error-box { 
            background: rgba(248, 81, 73, 0.1); 
            border: 1px solid #f85149; 
            border-radius: 8px; 
            padding: 1.5rem; 
            max-width: 600px; 
            margin: 2rem auto; 
            text-align: left;
          }
          code { 
            background: #161b22; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: monospace; 
          }
          .btn { background:#238636; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; display:inline-block; margin-top:1rem; }
        </style>
      </head>
      <body>
        <h1>Invalid ID Format</h1>
        <div class="error-box">
          <p><strong>Error:</strong> The provided ID is not a valid encoded ID. Please Use our main site <a href="https://steamtools.pages.dev">STEAMTOOLS GENERATOR</a>for correct format</p>
        </div>
        <a href="/" class="btn">Go Back to Homepage</a>
      </body>
      </html>
    `);
  }
  
  // Check if it's a valid cipher (accept)
  if (!isValidCipher(encodedId)) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invalid ID - SteamTools</title>
        <style>
          body { background:#0d1117; color:#c9d1d9; font-family:Arial; text-align:center; padding:2rem; }
          h1 { color:#f85149; margin-bottom:1rem; }
          .error-box { 
            background: rgba(248, 81, 73, 0.1); 
            border: 1px solid #f85149; 
            border-radius: 8px; 
            padding: 1.5rem; 
            max-width: 600px; 
            margin: 2rem auto; 
            text-align: left;
          }
          code { 
            background: #161b22; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: monospace; 
          }
          .btn { background:#238636; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; display:inline-block; margin-top:1rem; }
        </style>
      </head>
      <body>
        <h1>Invalid ID Format</h1>
        <div class="error-box">
          <p><strong>Error:</strong> The provided ID is not a valid encoded ID. Please Use our main site <a href="https://steamtools.pages.dev">STEAMTOOLS GENERATOR</a>for correct format</p>
        </div>
        <a href="/" class="btn">Go Back to Homepage</a>
      </body>
      </html>
    `);
  }

  let gameId;
  try {
    gameId = decodeCipher(encodedId);
    if (!gameId || !/^\d+$/.test(gameId)) {
      return res.status(400).send("Invalid ID: decoded result is not a number");
    }
  } catch {
    return res.status(400).send("Invalid ID format");
  }

  // Check sources
  const results = await Promise.all(
    SOURCES.map(async (src, i) => {
      try {
        const r = await fetch(src.makeUrl(gameId), {
          method: src.method,
          headers: {
            ...src.headers,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: src.body ? src.body(gameId) : null,
        });
        // For lua sources, just check the request succeeds
        // For zip sources, verify Content-Type explicitly to avoid HTML false positives
        let ok;
        if (src.type === "lua") {
          ok = r.ok;
        } else {
          const contentType = r.headers.get("Content-Type") || "";
          ok = r.ok && (
            contentType.includes("zip") ||
            contentType.includes("octet-stream") ||
            contentType.includes("x-zip")
          );
        }
        return { index: i, name: src.name, available: ok, status: r.status, type: src.type || "zip" };
      } catch {
        return { index: i, name: src.name, available: false, status: "Error" };
      }
    })
  );

  // Fetch Steam info
  const steamInfo = await getSteamGameInfo(gameId);

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>SteamTools Manifest Downloader</title>
  <style>
    body{background:#0d1117;color:#c9d1d9;font-family:Arial;text-align:center;padding:2rem}
    h1{color:#58a6ff}
    table{width:90%;max-width:700px;margin:2rem auto;border-collapse:collapse;background:#161b22;border-radius:10px;overflow:hidden}
    th,td{padding:1rem;border-bottom:1px solid #30363d}
    tr:last-child td{border-bottom:none}
    .available{color:#3fb950}.unavailable{color:#f85149}.error{color:#f0ad4e}
    a.button{background:#238636;color:white;padding:8px 14px;border-radius:6px;text-decoration:none;transition:.2s}
    a.button:hover{background:#2ea043}.disabled{background:#30363d;pointer-events:none}
    .game-info {margin:2rem auto; max-width:600px; background:#161b22; padding:1rem; border-radius:10px;}
    .game-info img {max-width:100%; border-radius:10px;}
  </style>
  <script type='text/javascript' src='//interestingcollide.com/0d/30/00/0d3000241cdab78221fa014b4a84a40e.js'></script>
  </head>
  <body>
    <h1>Available Sources for ${gameId}</h1>

    ${steamInfo ? `
      <div class="game-info">
        <h2>${steamInfo.name}</h2>
        <img src="${steamInfo.headerImg}" alt="${steamInfo.name}"/>
        <p>${steamInfo.shortDesc}</p>
        <p>Type: ${steamInfo.type} | Release: ${steamInfo.releaseDate}</p>
      </div>
    ` : `<p style="color:#f85149">Steam info not found for ID ${gameId}</p>`}
    <script
  async="async"
  data-cfasync="false"
  src="//interestingcollide.com/7450a11551ea5b955246e11303976c97/invoke.js"></script>
<div id="container-7450a11551ea5b955246e11303976c97"></div>
<script>(function(s){s.dataset.zone='10549586',s.src='https://al5sm.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
<script>(function(s){s.dataset.zone='10549591',s.src='https://gizokraijaw.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
    <table>
      <tr><th>Source</th><th>Status</th><th>Action</th></tr>
      ${results.map(r=>{
        const cls=r.available?"available":r.status==="Error"?"error":"unavailable";
        const txt=r.available?"Available":r.status==="Error"?"Error":"Not Found";
        const label=r.type==="lua"?"Download (.lua)":"Download";
        const btn=r.available?`<a class="button" href="/download?id=${encodeURIComponent(encodedId)}&src=${r.index}">${label}</a>`:`<a class="button disabled">${txt}</a>`;
        return `<tr><td>${r.name}</td><td class="${cls}">${txt}</td><td>${btn}</td></tr>`;
      }).join("")}
    </table>
  </body>
  </html>`;

  res.set("Content-Type", "text/html");
  res.send(html);
});

// === /download route ===
app.get("/download", async (req, res) => {
  const encodedId = req.query.id;
  const srcIndex = parseInt(req.query.src);
  if (!encodedId || isNaN(srcIndex)) return res.status(400).send("Bad params");

  // Check if it's a direct numeric ID (reject)
  if (isDirectNumericID(encodedId)) {
    return res.status(400).send("Direct numeric IDs not allowed. Use encoded ID.");
  }
  
  // Check if it's a valid cipher
  if (!isValidCipher(encodedId)) {
    return res.status(400).send("Invalid ID format");
  }

  let gameId;
  try {
    gameId = decodeCipher(encodedId);
    if (!gameId || !/^\d+$/.test(gameId)) {
      return res.status(400).send("Invalid ID: decoded result is not a number");
    }
  } catch {
    return res.status(400).send("Invalid ID");
  }

  const src = SOURCES[srcIndex];
  try {
    const r = await fetch(src.makeUrl(gameId), {
      method: src.method,
      headers: {
        ...src.headers,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: src.body ? src.body(gameId) : null,
    });
    if (!r.ok) return res.status(r.status).send("Source not OK");

    const buffer = Buffer.from(await r.arrayBuffer());

    // If this source serves a lua file, stream it directly — no ZIP processing
    if (src.type === "lua") {
      res.set({
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${gameId}.lua"`,
      });
      return res.send(buffer);
    }

    // Validate ZIP magic bytes: PK\x03\x04 (50 4B 03 04)
    // Prevents "End of data reached / Corrupted zip" when source returns
    // an HTML error page or empty body instead of a real ZIP file
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      return res.status(502).send("Source returned invalid or corrupted zip data");
    }

    const zip = new JSZip();
    await zip.loadAsync(buffer, { checkCRC32: false });

    zip.file(
      "info.txt",
      `Downloaded via SteamTools Manifest Downloader
Site: https://manifesthub.uk
Telegram: @Nafisfuad1
Date: ${new Date().toLocaleString()}
Original Source: ${src.name}
Game ID: ${gameId}
Encoded ID: ${encodedId}`
    );

    zip.comment = "SteamTools Manifest Downloader | manifesthub.uk | Created by @Nafisfuad1";

    const finalZip = await zip.generateAsync({ type: "nodebuffer" });

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${gameId}.zip"`,
    });
    res.send(finalZip);
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

export default app;
