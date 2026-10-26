require("dotenv").config();

const path = require("node:path");
const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const port = Number(process.env.PORT) || 3000;
const processStartTime = Date.now() / 1000;
const requestDurationBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];
const requestStatistics = new Map();

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

app.get("/metrics", (request, response) => {
  const lines = [
    "# HELP process_start_time_seconds Start time of the Node.js process since the Unix epoch.",
    "# TYPE process_start_time_seconds gauge",
    `process_start_time_seconds ${processStartTime}`,
    "# HELP process_uptime_seconds Node.js process uptime in seconds.",
    "# TYPE process_uptime_seconds gauge",
    `process_uptime_seconds ${process.uptime()}`,
    "# HELP process_resident_memory_bytes Resident memory size in bytes.",
    "# TYPE process_resident_memory_bytes gauge",
    `process_resident_memory_bytes ${process.memoryUsage().rss}`,
    "# HELP nodejs_heap_size_used_bytes Node.js heap used in bytes.",
    "# TYPE nodejs_heap_size_used_bytes gauge",
    `nodejs_heap_size_used_bytes ${process.memoryUsage().heapUsed}`,
    "# HELP nodejs_heap_size_total_bytes Node.js heap allocated in bytes.",
    "# TYPE nodejs_heap_size_total_bytes gauge",
    `nodejs_heap_size_total_bytes ${process.memoryUsage().heapTotal}`,
    "# HELP process_cpu_seconds_total Total CPU time spent in seconds.",
    "# TYPE process_cpu_seconds_total counter",
    `process_cpu_seconds_total{mode="user"} ${process.cpuUsage().user / 1_000_000}`,
    `process_cpu_seconds_total{mode="system"} ${process.cpuUsage().system / 1_000_000}`,
    "# HELP http_server_requests_total Total HTTP requests served by Express.",
    "# TYPE http_server_requests_total counter",
    "# HELP http_server_request_duration_seconds HTTP request duration in seconds.",
    "# TYPE http_server_request_duration_seconds histogram"
  ];

  for (const statistics of requestStatistics.values()) {
    lines.push(`http_server_requests_total{method="${statistics.method}",route="${statistics.route}",status="${statistics.status}"} ${statistics.count}`);

    let cumulativeCount = 0;
    for (const bucket of requestDurationBuckets) {
      cumulativeCount += statistics.buckets.get(bucket);
      lines.push(`http_server_request_duration_seconds_bucket{method="${statistics.method}",route="${statistics.route}",status="${statistics.status}",le="${bucket}"} ${cumulativeCount}`);
    }

    lines.push(`http_server_request_duration_seconds_bucket{method="${statistics.method}",route="${statistics.route}",status="${statistics.status}",le="+Inf"} ${statistics.count}`);
    lines.push(`http_server_request_duration_seconds_sum{method="${statistics.method}",route="${statistics.route}",status="${statistics.status}"} ${statistics.durationSeconds}`);
    lines.push(`http_server_request_duration_seconds_count{method="${statistics.method}",route="${statistics.route}",status="${statistics.status}"} ${statistics.count}`);
  }

  response.type("text/plain; version=0.0.4; charset=utf-8").send(`${lines.join("\n")}\n`);
});

app.use((request, response, next) => {
  if (request.path === "/metrics") {
    return next();
  }

  const startedAt = process.hrtime.bigint();
  response.once("finish", () => {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    const routePath = typeof request.route?.path === "string" ? request.route.path : "unmatched";
    const key = [request.method, routePath, response.statusCode].join("\u0000");
    let statistics = requestStatistics.get(key);

    if (!statistics) {
      statistics = {
        method: request.method,
        route: routePath,
        status: response.statusCode,
        count: 0,
        durationSeconds: 0,
        buckets: new Map(requestDurationBuckets.map((bucket) => [bucket, 0]))
      };
      requestStatistics.set(key, statistics);
    }

    statistics.count += 1;
    statistics.durationSeconds += durationSeconds;
    const matchingBucket = requestDurationBuckets.find((bucket) => durationSeconds <= bucket);
    if (matchingBucket !== undefined) {
      statistics.buckets.set(matchingBucket, statistics.buckets.get(matchingBucket) + 1);
    }
  });

  next();
});

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
