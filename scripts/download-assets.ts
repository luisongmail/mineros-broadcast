#!/usr/bin/env tsx
/**
 * scripts/download-assets.ts
 *
 * Descarga imágenes desde fuentes externas (singular.live, etc.) y las guarda
 * en apps/overlay-server/storage/assets/ con el assetId correcto como nombre de archivo.
 *
 * Uso:
 *   pnpm tsx scripts/download-assets.ts
 *   pnpm tsx scripts/download-assets.ts --dry-run   (solo muestra qué descargaría)
 */

import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import http from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '../apps/overlay-server/storage/assets');
const DRY_RUN = process.argv.includes('--dry-run');

interface AssetDownload {
  assetId: string;       // ej: "teams/guerreras-logo"
  sourceUrl: string;     // URL de origen
  description: string;   // para log
}

// ──────────────────────────────────────────────────────────────────────────────
// MANIFESTO DE ASSETS — agrega aquí cada asset a descargar
// ──────────────────────────────────────────────────────────────────────────────
const ASSETS: AssetDownload[] = [
  // ── Jugadoras Guerreras ────────────────────────────────────────────────────
  {
    assetId: 'players/gue-p-01-angelica',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/08Yu8aTJOCQTPFW6Uj96aX_w1086h1449.jpeg',
    description: 'Guerreras #20 Angélica',
  },
  {
    assetId: 'players/gue-p-02-mariela-diaz',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/1DhsKKrXi4pELh9JvliZ62_w1080h1350.png',
    description: 'Guerreras #21 Mariela Diaz',
  },
  {
    assetId: 'players/gue-p-03-maria-gabriela',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/1f08iuWy1Bpyna2v52NFX0_w1080h1350.png',
    description: 'Guerreras #22 María Gabriela',
  },
  {
    assetId: 'players/gue-p-04-jessica',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/1kMbicoyyxLbENvwhpjN5d_w1080h1350.png',
    description: 'Guerreras #23 Jessica (P)',
  },
  {
    assetId: 'players/gue-p-05-merly',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/2VxvIjD8ZoRzAnhsQMts8v_w1080h1350.png',
    description: 'Guerreras #25 Merly',
  },
  {
    assetId: 'players/gue-p-06-maria-mora',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/64SGDrH7KK7TAtMbLBAkp2_w1080h1350.png',
    description: 'Guerreras #26 María Mora',
  },
  {
    assetId: 'players/gue-p-07-raquel',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/7F3MuuPnZc8zqx2GjD2VHy_w1080h1350.png',
    description: 'Guerreras #27 Raquel',
  },
  {
    assetId: 'players/gue-p-08-mariant-reyes',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/3fTnlYh9pHRTQ9YxGAadlp_w1080h1350.png',
    description: 'Guerreras #28 Mariant Reyes',
  },
  {
    assetId: 'players/gue-p-09-maoly-talamonty',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/6HvmVX5gR2vIOAXObZbLd0_w1080h1350.png',
    description: 'Guerreras #29 Maoly Talamonty',
  },
  // ── Jugadoras Team Chile ───────────────────────────────────────────────────
  {
    assetId: 'players/chi-p-01-constanza-aguilera',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/7JqFrhzEDyS4zJYpURaOgM_w2592h3872.jpg',
    description: 'Team Chile #3 Constanza Aguilera',
  },
  {
    assetId: 'players/chi-p-02-florencia-honorato',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/7K8hWeNuERJyEcUeRIuINs_w1944h2896.jpg',
    description: 'Team Chile #5 Florencia Honorato',
  },
  {
    assetId: 'players/chi-p-03-daniela-deoliveira',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/29RJqskXYgTM8RhR29wgDF_w912h1184.png',
    description: 'Team Chile #6 Daniela De Oliveira',
  },
  {
    assetId: 'players/chi-p-04-vanessa-adams',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/49rfDp4yzMCknnO4vJQ2oI_w498h675.jpeg',
    description: 'Team Chile #11 Vanessa Adams (suplente)',
  },
  {
    assetId: 'players/chi-p-05-cecilia-munoz',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/2ExMZo5qof1VJtkeGn4nEd_w864h1229.png',
    description: 'Team Chile #13 Cecilia Muñoz (suplente)',
  },
  {
    assetId: 'players/chi-p-06-barbara-carrasco',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/3gsYH8LSiRdBJLvCOQkrB2_w1080h1350.png',
    description: 'Team Chile #14 Barbara Carrasco',
  },
  {
    assetId: 'players/chi-p-07-martina-pellizaris',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/0cfCUBHGV7wmunPt2VEbUF_w1200h1600.png',
    description: 'Team Chile #16 Martina Pellizaris',
  },
  {
    assetId: 'players/chi-p-08-carolina-jara',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/1a6h80QzG6Bx9TZ72LEkA6_w1944h2896.jpg',
    description: 'Team Chile #17 Carolina Jara',
  },
  {
    assetId: 'players/chi-p-09-constanza-espinoza',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/18rqBOepB0LbUEUQm1FYYM_w1944h2896.jpg',
    description: 'Team Chile #22 Constanza Espinoza',
  },
  {
    assetId: 'players/chi-p-10-catalina-guerra',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/4ffrjzr8L09vJPQ2MaHFu2_w1944h2896.png',
    description: 'Team Chile #24 Catalina Guerra (P)',
  },
  {
    assetId: 'players/chi-p-11-marianny-mendez',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/48cKWDunCtQXOuH2rR0zQn_w913h1299.jpg',
    description: 'Team Chile #27 Marianny Mendez',
  },
  {
    assetId: 'players/chi-p-12-maria-mondeja',
    sourceUrl: 'https://image.singular.live/a99737ceb1fc7055e516856926cf856d/images/27nx1dGS4ChD2VSB5kDnGr_w1944h2896.jpg',
    description: 'Team Chile #42 María Mondeja',
  },
];

// ──────────────────────────────────────────────────────────────────────────────

function getExtFromUrl(url: string): string {
  const match = url.match(/\.(jpeg|jpg|png|webp|gif|svg)(\?|$)/i);
  return match ? `.${match[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
}

function resolveLocalPath(assetId: string, sourceUrl: string): string {
  const ext = getExtFromUrl(sourceUrl);
  return join(ASSETS_DIR, `${assetId}${ext}`);
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = createWriteStream(destPath);

    const req = client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        const redirect = res.headers.location!;
        downloadFile(redirect, destPath).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${res.statusCode ?? 'unknown'} for ${url}`));
        return;
      }

      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(30_000, () => {
      req.destroy();
      reject(new Error(`Timeout descargando ${url}`));
    });
  });
}

async function main(): Promise<void> {
  console.log(`\n📦 Asset Downloader — Broadcast System`);
  console.log(`📁 Destino: ${ASSETS_DIR}`);
  if (DRY_RUN) console.log(`🔍 DRY RUN — no descargará nada\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const asset of ASSETS) {
    const destPath = resolveLocalPath(asset.assetId, asset.sourceUrl);
    const destDir = dirname(destPath);

    if (!DRY_RUN) {
      mkdirSync(destDir, { recursive: true });
    }

    if (existsSync(destPath)) {
      console.log(`⏭  ${asset.assetId}  (ya existe)`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`📥  ${asset.description}`);
      console.log(`     assetId: ${asset.assetId}`);
      console.log(`     destino: ${destPath.replace(ASSETS_DIR, '[assets]')}`);
      downloaded++;
      continue;
    }

    try {
      process.stdout.write(`⬇  ${asset.description}... `);
      await downloadFile(asset.sourceUrl, destPath);
      console.log(`✅`);
      downloaded++;
    } catch (err) {
      console.log(`❌  ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────`);
  console.log(`✅ Descargados:  ${downloaded}`);
  console.log(`⏭  Omitidos:    ${skipped}`);
  console.log(`❌ Con error:    ${failed}`);
  console.log(`─────────────────────────────`);

  if (failed > 0) {
    console.log(`\n⚠  Algunos assets fallaron. Puedes re-ejecutar para reintentar.`);
    process.exit(1);
  }

  if (!DRY_RUN && downloaded > 0) {
    console.log(`\n💡 Siguiente paso:`);
    console.log(`   Para producción: sube la carpeta storage/assets/ a Azure Blob Storage`);
    console.log(`   az storage blob upload-batch \\`);
    console.log(`     --source apps/overlay-server/storage/assets \\`);
    console.log(`     --destination broadcast-assets \\`);
    console.log(`     --account-name broadcaststorage\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
