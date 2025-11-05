// node scripts/gen-thumbs.mjs
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Carregar .env do diretório backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY, // NUNCA commitar
  SUPABASE_SERVICE_KEY, // NUNCA commitar (alias alternativo)
  BUCKET = 'galeria-empreendimentos',
  ROOT_PREFIXES = '', // ex: "4/apartamento,4/areas-de-lazer" (vazio = varre tudo na raiz)
} = process.env;

// Aceita SUPABASE_SERVICE_KEY ou SUPABASE_SERVICE_ROLE_KEY
const serviceKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !serviceKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_KEY (ou SUPABASE_SERVICE_ROLE_KEY) no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, serviceKey);

const prefixes = ROOT_PREFIXES ? ROOT_PREFIXES.split(',').map(s => s.trim()).filter(Boolean) : [''];

const isImage = (n) => /\.(png|jpg|jpeg|webp|avif)$/i.test(n);

const toThumb = (p) => `.thumbs/960w/${p.replace(/\.[^.]+$/, '')}.webp`;

async function listRecursive(prefix) {
  const out = [];
  const walk = async (p) => {
    const { data, error } = await supabase.storage.from(BUCKET).list(p, { limit: 1000 });
    if (error) {
      // Se o prefixo não existir, apenas retorna vazio
      if (error.message?.includes('not found')) return [];
      throw error;
    }
    for (const item of data || []) {
      // Se tem id, é arquivo; senão, pode ser pasta
      if (item.id !== null && item.id !== undefined) {
        out.push(`${p ? p + '/' : ''}${item.name}`);
      } else {
        // É uma pasta, recursar
        await walk(`${p ? p + '/' : ''}${item.name}`);
      }
    }
  };
  await walk(prefix);
  return out;
}

async function ensureThumb(path) {
  if (!isImage(path)) return;
  const thumbPath = toThumb(path);
  // já existe?
  const dir = thumbPath.substring(0, thumbPath.lastIndexOf('/') + 1);
  const fname = thumbPath.split('/').pop();
  try {
    const { data: exists } = await supabase.storage.from(BUCKET).list(dir);
    if (exists?.some(f => f.name === fname)) { console.log('✓', thumbPath); return; }
  } catch (e) {
    // diretório pode não existir ainda, continuar
  }

  // baixa original via URL assinada
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  const res = await fetch(signed.signedUrl);
  if (!res.ok) { console.warn('skip', path, res.status); return; }

  const buf = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(buf).rotate().resize({ width: 960, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(thumbPath, webp, {
    upsert: true,
    contentType: 'image/webp',
    cacheControl: '31536000, immutable',
  });

  if (upErr) console.error('ERR', thumbPath, upErr.message);
  else console.log('THUMB', thumbPath, `${(webp.length/1024).toFixed(0)}KB`);
}

(async () => {
  for (const px of prefixes) {
    const files = await listRecursive(px);
    for (const path of files) {
      if (path.includes('/.thumbs/')) continue; // ignora thumbs
      try { await ensureThumb(path); } catch (e) { console.error('Erro', path, e.message); }
    }
  }
})();

