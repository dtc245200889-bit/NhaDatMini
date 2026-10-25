require("dotenv").config();

const path = require("node:path");
const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const port = Number(process.env.PORT) || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "real_estate",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

const propertyFields = `
  SELECT id, name, image_url, price, area, address,
         property_type AS type, description
  FROM properties
`;

app.get("/api/health", async (request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check không kết nối được MySQL:", error.message);
    response.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.get("/api/properties", async (request, response) => {
  const search = typeof request.query.search === "string"
    ? request.query.search.trim()
    : "";
  const type = typeof request.query.type === "string"
    ? request.query.type.trim()
    : "";
  const allowedTypes = ["house", "apartment", "land"];

  if (type && !allowedTypes.includes(type)) {
    return response.status(400).json({ error: "Loại bất động sản không hợp lệ." });
  }

  const conditions = [];
  const parameters = [];

  if (search) {
    conditions.push("name LIKE ?");
    parameters.push(`%${search}%`);
  }

  if (type) {
    conditions.push("property_type = ?");
    parameters.push(type);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  try {
    const [properties] = await pool.execute(
      `${propertyFields} ${whereClause} ORDER BY id`,
      parameters
    );
    response.json(properties);
  } catch (error) {
    console.error("Không thể tải danh sách bất động sản:", error.message);
    response.status(500).json({ error: "Không thể tải danh sách bất động sản." });
  }
});

app.get("/api/properties/:id", async (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return response.status(400).json({ error: "Mã bất động sản không hợp lệ." });
  }

  try {
    const [properties] = await pool.execute(
      `${propertyFields} WHERE id = ?`,
      [id]
    );

    if (properties.length === 0) {
      return response.status(404).json({ error: "Không tìm thấy bất động sản." });
    }

    response.json(properties[0]);
  } catch (error) {
    console.error("Không thể tải chi tiết bất động sản:", error.message);
    response.status(500).json({ error: "Không thể tải chi tiết bất động sản." });
  }
});

async function waitForDatabase() {
  const maxAttempts = 30;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      console.log("Đã kết nối MySQL.");
      return;
    } catch (error) {
      console.log(`Đang chờ MySQL (${attempt}/${maxAttempts}): ${error.message}`);
      if (attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function startServer() {
  await waitForDatabase();
  app.listen(port, "0.0.0.0", () => {
    console.log(`Nhà Đất Mini đang chạy tại cổng ${port}.`);
  });
}

startServer().catch(async (error) => {
  console.error("Không thể khởi động website:", error.message);
  await pool.end();
  process.exitCode = 1;
});
