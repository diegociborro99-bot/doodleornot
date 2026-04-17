/**
 * Monthly Doodles Sales Updater
 * Fetches latest sales from OpenSea API v2, updates public/doodles-dataset.js
 * Runs automatically on the 1st of each month via cron in server.js
 *
 * Requires env var: OPENSEA_API_KEY
 */

const fs = require('fs');
const path = require('path');

const DATASET_PATH = path.join(__dirname, '..', 'public', 'doodles-dataset.js');
const COLLECTION_SLUG = 'doodles-official';
const CONTRACT = '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e';
const CHAIN = 'ethereum';

// OpenSea API v2 base
const OS_BASE = 'https://api.opensea.io/api/v2';

async function fetchWithRetry(url, headers, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, { headers });
      if (resp.status === 429) {
        // Rate limited — wait and retry
        const wait = Math.min(30000, (i + 1) * 5000);
        console.log(`  Rate limited, waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      return await resp.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  Retry ${i + 1}/${retries}: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

/**
 * Fetch all sales events from OpenSea for the Doodles collection
 * since a given timestamp. Paginates through all results.
 */
async function fetchSales(apiKey, sinceTimestamp) {
  const headers = { 'X-API-KEY': apiKey, 'Accept': 'application/json' };
  const sales = new Map(); // tokenId -> { price, timestamp }
  let cursor = null;
  let page = 0;
  const maxPages = 200; // safety cap (~200 * 50 = 10,000 events max)

  console.log(`Fetching sales since ${new Date(sinceTimestamp * 1000).toISOString()}...`);

  while (page < maxPages) {
    let url = `${OS_BASE}/events/collection/${COLLECTION_SLUG}?event_type=sale&after=${sinceTimestamp}&limit=50`;
    if (cursor) url += `&next=${cursor}`;

    const data = await fetchWithRetry(url, headers);
    if (!data || !data.asset_events) break;

    for (const event of data.asset_events) {
      try {
        // Extract token ID from the NFT data
        const nft = event.nft;
        if (!nft || !nft.identifier) continue;
        const tokenId = parseInt(nft.identifier, 10);
        if (isNaN(tokenId) || tokenId < 0 || tokenId > 9999) continue;

        // Extract sale price in ETH
        const payment = event.payment;
        if (!payment) continue;

        let priceEth;
        if (payment.symbol === 'ETH' || payment.symbol === 'WETH') {
          // Convert from wei (or smallest unit) to ETH
          const decimals = payment.decimals || 18;
          priceEth = parseFloat(payment.quantity) / Math.pow(10, decimals);
        } else {
          // Skip non-ETH sales (USDC etc)
          continue;
        }

        if (priceEth <= 0 || priceEth > 10000) continue; // sanity check

        const saleTimestamp = Math.floor(new Date(event.closing_date || event.event_timestamp).getTime() / 1000);

        // Keep only the most recent sale per token
        const existing = sales.get(tokenId);
        if (!existing || saleTimestamp > existing.t) {
          sales.set(tokenId, {
            p: Math.round(priceEth * 10000) / 10000, // 4 decimal places
            t: saleTimestamp
          });
        }
      } catch (e) {
        // Skip malformed events
      }
    }

    page++;
    cursor = data.next;
    if (!cursor) break;

    // Respect rate limits: ~2 requests/sec
    await new Promise(r => setTimeout(r, 550));

    if (page % 10 === 0) {
      console.log(`  Page ${page}: ${sales.size} unique sales so far...`);
    }
  }

  console.log(`Fetched ${sales.size} unique sales across ${page} pages.`);
  return sales;
}

/**
 * Read the current dataset, merge new sales, write back
 */
async function updateDataset(apiKey) {
  const startTime = Date.now();
  console.log('=== Doodles Sales Update ===');
  console.log(`Started: ${new Date().toISOString()}`);

  // Read current dataset
  const raw = fs.readFileSync(DATASET_PATH, 'utf8');
  const jsonStr = raw.replace(/^window\.DOODLES_DATA\s*=\s*/, '').replace(/;\s*$/, '');
  const data = JSON.parse(jsonStr);

  console.log(`Dataset: ${data.doodles.length} doodles, ${data.doodles.filter(d => d.s).length} with sales`);

  // Find the most recent sale timestamp to only fetch newer ones
  let latestSale = 0;
  for (const d of data.doodles) {
    if (d.s && d.s.t > latestSale) latestSale = d.s.t;
  }

  // Go back 30 days from latest sale to catch any we might have missed
  const since = Math.max(0, latestSale - (30 * 86400));

  // Fetch new sales from OpenSea
  const newSales = await fetchSales(apiKey, since);

  if (newSales.size === 0) {
    console.log('No new sales found. Dataset unchanged.');
    return { updated: 0, total: data.doodles.filter(d => d.s).length };
  }

  // Merge: update doodles that have newer sales
  let updatedCount = 0;
  let newCount = 0;
  for (const d of data.doodles) {
    const sale = newSales.get(d.id);
    if (!sale) continue;

    if (!d.s) {
      // Doodle had no sale data — add it
      d.s = sale;
      newCount++;
      updatedCount++;
    } else if (sale.t > d.s.t) {
      // Newer sale found — update
      d.s = sale;
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} sales (${newCount} new, ${updatedCount - newCount} refreshed)`);

  // Write back
  const output = 'window.DOODLES_DATA = ' + JSON.stringify(data) + ';';
  fs.writeFileSync(DATASET_PATH, output, 'utf8');

  const totalWithSales = data.doodles.filter(d => d.s).length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Done in ${elapsed}s. Total doodles with sales: ${totalWithSales}`);
  console.log('=== Update Complete ===\n');

  return { updated: updatedCount, newSales: newCount, total: totalWithSales };
}

module.exports = { updateDataset };

// Allow running directly: node src/update-sales.js
if (require.main === module) {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    console.error('Missing OPENSEA_API_KEY env var');
    process.exit(1);
  }
  updateDataset(apiKey)
    .then(r => console.log('Result:', r))
    .catch(e => { console.error('FATAL:', e); process.exit(1); });
}
