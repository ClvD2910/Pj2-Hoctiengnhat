/**
 * Import Kanji Script
 * -------------------
 * Đọc file kanji.json và import toàn bộ vào collection `kanjis` trong MongoDB.
 *
 * Usage:
 *   node scripts/importKanji.js              # import, bỏ qua bản ghi trùng
 *   node scripts/importKanji.js --drop       # xóa sạch collection trước khi import
 *
 * File nguồn mặc định: server/data/kanji.json
 */

const fs      = require("fs");
const path    = require("path");
const dotenv  = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const Kanji = require("../models/Kanji");

//  CLI flags 
const DROP_BEFORE = process.argv.includes("--drop");
const USE_MOCK    = process.argv.includes("--mock");
const DATA_FILE   = USE_MOCK
  ? path.resolve(__dirname, "../data/mock/kanji.json")
  : path.resolve(__dirname, "../data/kanji.json");
const BATCH_SIZE  = 500;

//  Helpers 
function mapRecord(raw) {
  return {
    id:           raw.id          ?? null,
    kanji:        raw.kanji       ?? "",
    mean:         raw.mean        ?? "",
    kun:          raw.kun         ?? "",
    on:           raw.on          ?? "",
    compDetail:   typeof raw.compDetail === "string" ? raw.compDetail : "",
    detail:       raw.detail      ?? "",
    examples:     typeof raw.examples  === "string" ? raw.examples  : "",
    stroke_count: raw.stroke_count ?? 0,
    level:        raw.level       ?? 0,
    freq:         raw.freq        ?? 0,
    img:          raw.img         ?? "",
  };
}

async function run() {
  //  Connect 
  console.log("🔌 Kết nối MongoDB …");
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`✅ Đã kết nối: ${process.env.MONGO_URI}\n`);

  //  Optional drop 
  if (DROP_BEFORE) {
    await Kanji.deleteMany({});
    console.log("🗑️  Đã xóa toàn bộ dữ liệu cũ trong collection kanjis.\n");
  }

  //  Read file 
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Không tìm thấy file: ${DATA_FILE}`);
    process.exit(1);
  }
  console.log(`📖 Đọc file: ${DATA_FILE}`);
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  if (!Array.isArray(raw)) {
    console.error("❌ kanji.json phải là một JSON array.");
    process.exit(1);
  }
  console.log(`📦 Tổng số bản ghi: ${raw.length}\n`);

  //  Batch insert
  const records = raw.map(mapRecord).filter((r) => r.kanji);

  let inserted = 0;
  let skipped  = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    try {
      const result = await Kanji.insertMany(batch, { ordered: false });
      inserted += result.length;
    } catch (err) {
      // BulkWriteError — một số doc trùng key bị bỏ qua, phần còn lại vẫn insert
      if (err.insertedDocs !== undefined) {
        inserted += err.insertedDocs.length;
        skipped  += batch.length - err.insertedDocs.length;
      } else if (err.result?.nInserted !== undefined) {
        inserted += err.result.nInserted;
        skipped  += batch.length - err.result.nInserted;
      } else {
        throw err;
      }
    }

    const done = Math.min(i + BATCH_SIZE, records.length);
    process.stdout.write(`\r   ↳ Đã xử lý ${done}/${records.length} bản ghi …`);
  }

  console.log(`\n\n✅ Hoàn tất!`);
  console.log(`   Inserted : ${inserted}`);
  if (skipped > 0) console.log(`   Skipped  : ${skipped} (trùng kanji)`);
}

run()
  .catch((err) => {
    console.error("\n❌ Lỗi:", err.message);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
