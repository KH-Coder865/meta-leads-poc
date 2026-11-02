const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const metaWebhook = require("./routes/metaWebhook");

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Health check
app.get("/", (req, res)=>{
  res.json({
    message: "Meta Lead Ads Backend is running!",
    status: "OK",
  });
});

app.use("/webhooks/meta", metaWebhook);

app.listen(PORT, ()=>{
  console.log(`Server running on port ${PORT}`);
});