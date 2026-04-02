/**
 * Import Data Script
 * ------------------
 * Script độc lập để import dữ liệu từ vựng vào MongoDB từ file JSON hoặc CSV.
 * Sử dụng Stream để xử lý file lớn (hàng trăm MB) mà không tốn RAM.
 *
 * Usage:
 *   node scripts/importData.js <filePath|dirPath> [options]
 *
 * Examples:
 *   node scripts/importData.js ./data/jmdict.json
 *   node scripts/importData.js ./data/words.csv --batch=2000
 *   node scripts/importData.js ./data/nested.json --jsonpath="words.*"
 *   node scripts/importData.js ./data/words.json --drop
 *   node scripts/importData.js ./data --format=yomichan --drop
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { toRomaji } = require("wanakana");

// Load env từ thư mục server
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { getParser } = require("./utils/parsers");
const { bulkInsert } = require("../repositories/dictionaryRepository");
// Ensure the Word model is registered
require("../models/Word");

// ---------------------------------------------------------------------------
// CLI Arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));

if (!filePath) {
  console.error("❌ Thiếu đường dẫn file hoặc thư mục.");
  console.error(
    "   Usage: node scripts/importData.js <filePath|dirPath> [--batch=1000] [--jsonpath=*] [--drop] [--format=yomichan]"
  );
  process.exit(1);
}

const resolvedPath = path.resolve(filePath);

const getFlag = (name, defaultVal) => {
  const flag = args.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.split("=")[1] : defaultVal;
};

const BATCH_SIZE = parseInt(getFlag("batch", "1000"), 10);
const JSON_PATH = getFlag("jsonpath", "*");
const DROP_BEFORE = args.includes("--drop");
const FORMAT = getFlag("format", "auto"); // "auto" | "yomichan"

// ---------------------------------------------------------------------------
// Data Transformer — Generic (object-based records)
// ---------------------------------------------------------------------------

function transformRecord(raw) {
  let meanings = raw.meanings;
  if (typeof meanings === "string") {
    meanings = meanings.split(/[|;]/).map((s) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(meanings)) meanings = [];

  let examples = raw.examples;
  if (typeof examples === "string") {
    try {
      examples = JSON.parse(examples);
    } catch {
      examples = [];
    }
  }
  if (!Array.isArray(examples)) examples = [];

  examples = examples
    .map((ex) => {
      if (typeof ex === "string") return null;
      return {
        japanese: ex.japanese || ex.ja || ex.jp || "",
        vietnamese: ex.vietnamese || ex.vi || ex.vn || "",
      };
    })
    .filter((ex) => ex && ex.japanese);

  let jlpt_level = raw.jlpt_level ?? raw.jlpt ?? null;
  if (typeof jlpt_level === "number") {
    jlpt_level = `N${jlpt_level}`;
  }
  const validLevels = ["N5", "N4", "N3", "N2", "N1"];
  if (!validLevels.includes(jlpt_level)) {
    jlpt_level = undefined;
  }

  return {
    kanji: raw.kanji || "",
    hiragana: raw.hiragana || raw.kana || "",
    romaji: raw.romaji || "",
    meanings,
    examples,
    jlpt_level,
    kanji_svg: raw.kanji_svg || "",
  };
}

// ---------------------------------------------------------------------------
// Data Transformer — Yomichan Format 3 (array-based records)
// ---------------------------------------------------------------------------
// Yomichan term_bank entry: [kanji, reading, posTags, posInfo, score, meanings[], seqId, tags]

function transformYomichanRecord(raw) {
  if (!Array.isArray(raw) || raw.length < 6) return null;

  const word = raw[0] || "";
  const reading = raw[1] || "";
  const meaningsRaw = raw[5];

  // meanings: lọc bỏ các chuỗi chứa metadata (ký tự @ hoặc dài quá, chứa \\n)
  let meanings = [];
  if (Array.isArray(meaningsRaw)) {
    meanings = meaningsRaw
      .filter((m) => typeof m === "string")
      .map((m) => m.replace(/@@.*$/, "").trim())
      .filter((m) => m && !m.startsWith("@") && !m.includes("\\n"));
  }
  if (meanings.length === 0) return null;

  // hiragana: nếu reading có, dùng reading; nếu không, dùng word (katakana-only words)
  const hiragana = reading || word;

  // romaji: chuyển đổi bằng wanakana
  let romaji = "";
  try {
    romaji = toRomaji(hiragana);
  } catch {
    romaji = "";
  }

  // kanji: chỉ gán nếu word khác reading (tức word chứa kanji)
  const kanji = reading && word !== reading ? word : "";

  return {
    kanji,
    hiragana,
    romaji,
    meanings,
    examples: [],
    jlpt_level: undefined,
    kanji_svg: "",
  };
}

// ---------------------------------------------------------------------------
// Resolve file list — nếu là thư mục, tìm tất cả term_bank_*.json
// ---------------------------------------------------------------------------

function resolveFiles(inputPath) {
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) return [inputPath];

  if (stat.isDirectory()) {
    return fs
      .readdirSync(inputPath)
      .filter((f) => /^term_bank_\d+\.json$/.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
      })
      .map((f) => path.join(inputPath, f));
  }

  throw new Error(`"${inputPath}" không phải file hay thư mục hợp lệ.`);
}

// ---------------------------------------------------------------------------
// Import a single file
// ---------------------------------------------------------------------------

async function importFile(fileAbsPath, transform, stats) {
  const parser = getParser(fileAbsPath, { jsonPath: JSON_PATH });
  const stream = parser.createReadStream(fileAbsPath);

  let batch = [];

  const flushBatch = async () => {
    if (batch.length === 0) return;
    const toInsert = [...batch];
    batch = [];

    const { inserted, errors } = await bulkInsert(toInsert);
    stats.totalInserted += inserted;
    stats.totalErrors += errors;

    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
    process.stdout.write(
      `\r⏳ Processed: ${stats.totalProcessed} | Inserted: ${stats.totalInserted} | Errors: ${stats.totalErrors} | ${elapsed}s`
    );
  };

  return new Promise((resolve, reject) => {
    stream.on("data", async (rawRecord) => {
      stream.pause();

      stats.totalProcessed++;
      const record = transform(rawRecord);

      if (!record || !record.hiragana) {
        stream.resume();
        return;
      }

      batch.push(record);

      if (batch.length >= BATCH_SIZE) {
        try {
          await flushBatch();
        } catch (err) {
          stream.destroy(err);
          return;
        }
      }

      stream.resume();
    });

    stream.on("end", async () => {
      try {
        await flushBatch();
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    stream.on("error", (err) => reject(err));
  });
}

// ---------------------------------------------------------------------------
// Main Import Pipeline
// ---------------------------------------------------------------------------

async function runImport() {
  // 1. Connect to MongoDB
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected.\n");

  // 2. Optional: drop collection
  if (DROP_BEFORE) {
    console.log("🗑️  Dropping existing words collection...");
    await mongoose.connection.db.collection("words").drop().catch(() => {});
    console.log("   Done.\n");
  }

  // 3. Resolve file(s) and transform function
  const isYomichan = FORMAT === "yomichan";
  const files = isYomichan ? resolveFiles(resolvedPath) : [resolvedPath];
  const transform = isYomichan ? transformYomichanRecord : transformRecord;

  console.log(`📂 Format: ${isYomichan ? "Yomichan" : "Generic"}`);
  console.log(`📄 Files:  ${files.length}\n`);

  // 4. Import each file sequentially
  const stats = {
    totalInserted: 0,
    totalErrors: 0,
    totalProcessed: 0,
    startTime: Date.now(),
  };

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    console.log(`\n📖 [${i + 1}/${files.length}] ${path.basename(f)}`);
    await importFile(f, transform, stats);
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

runImport()
  .then((stats) => {
    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
    console.log("\n");
    console.log("=".repeat(50));
    console.log("🎉 Import hoàn tất!");
    console.log(`   Path:     ${resolvedPath}`);
    console.log(`   Format:   ${FORMAT}`);
    console.log(`   Inserted: ${stats.totalInserted}`);
    console.log(`   Errors:   ${stats.totalErrors}`);
    console.log(`   Time:     ${elapsed}s`);
    console.log("=".repeat(50));
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n\n❌ Import thất bại:", err.message);
    process.exit(1);
  });
