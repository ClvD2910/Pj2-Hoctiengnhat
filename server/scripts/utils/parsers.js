const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const JSONStream = require("JSONStream");

// ---------------------------------------------------------------------------
// Strategy Pattern: Mỗi parser là một strategy trả về Readable stream
// phát ra từng record (object) một — KHÔNG nạp toàn bộ file vào RAM.
// ---------------------------------------------------------------------------

/**
 * Strategy: Parse JSON file bằng JSONStream.
 * Hỗ trợ cấu trúc:
 *   - Array gốc: [{ ... }, { ... }]       → jsonPath mặc định "*"
 *   - Nested key:  { "words": [{ ... }] }  → jsonPath = "words.*"
 */
class JsonStreamParser {
  constructor(jsonPath = "*") {
    this.jsonPath = jsonPath;
  }

  createReadStream(filePath) {
    const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const parser = JSONStream.parse(this.jsonPath);

    fileStream.on("error", (err) => parser.destroy(err));

    return fileStream.pipe(parser);
  }
}

/**
 * Strategy: Parse CSV file bằng csv-parser (stream-based).
 * Mỗi row được emit dưới dạng object với key = tên cột header.
 */
class CsvStreamParser {
  constructor(options = {}) {
    this.options = options;
  }

  createReadStream(filePath) {
    const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const parser = csvParser(this.options);

    fileStream.on("error", (err) => parser.destroy(err));

    return fileStream.pipe(parser);
  }
}

// ---------------------------------------------------------------------------
// Parser Factory — tự chọn strategy dựa trên đuôi file
// ---------------------------------------------------------------------------

const parserStrategies = {
  ".json": (opts) => new JsonStreamParser(opts.jsonPath),
  ".csv": (opts) => new CsvStreamParser(opts.csvOptions),
};

/**
 * Trả về parser phù hợp dựa trên đuôi file.
 * @param {string} filePath - Đường dẫn tới file dữ liệu
 * @param {object} opts     - Tuỳ chọn truyền cho parser
 */
function getParser(filePath, opts = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const factory = parserStrategies[ext];

  if (!factory) {
    throw new Error(
      `Không hỗ trợ định dạng "${ext}". Chỉ hỗ trợ: ${Object.keys(parserStrategies).join(", ")}`
    );
  }

  return factory(opts);
}

module.exports = { getParser, JsonStreamParser, CsvStreamParser };
