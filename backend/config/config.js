const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "Afm123@",
  database: process.env.DB_NAME || "codeera_db",
  database_url: process.env.database_url || "postgresql://neondb_owner:npg_GVMeCyNB9nb8@ep-curly-violet-ad0zlpdo-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'"
});

connection.connect((err) => {
  if (err) {
    console.error("❌ Error connecting to MySQL:", err);
    return;
  }
  console.log("✅ Connected to MySQL");
});

module.exports = connection;