#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withClient, pool } from './db.js';
import { Command } from 'commander';
import 'dotenv/config';

const program = new Command();

function loadSQL(file: string): string {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  return readFileSync(join(__dirname, 'sql', file), 'utf8');
}

program
  .name('pg-hybrid')
  .description('CLI untuk pg-hybrid-search library')
  .version('0.5.0-beta');

program
  .command('init')
  .description('Initialize DB schema')
  .action(async () => {
    try {
      const sql = loadSQL('init.sql');
      await withClient(c => c.query(sql));
      console.log("✅ Schema siap digunakan.");
    } catch (error) {
      console.error("❌ Error saat inisialisasi:", error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  });

program
  .command('reset')
  .description('Reset DB schema')
  .option('-y, --yes', 'Konfirmasi tanpa prompt')
  .action(async (opts) => {
    try {
      if (!opts.yes) {
        console.log("⚠️  Gunakan -y untuk konfirmasi reset.");
        process.exit(1);
      }
      const sql = loadSQL('reset.sql');
      await withClient(c => c.query(sql));
      console.log("🧹 Schema berhasil dihapus.");
    } catch (error) {
      console.error("❌ Error saat reset:", error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  });

program.parseAsync(process.argv);
