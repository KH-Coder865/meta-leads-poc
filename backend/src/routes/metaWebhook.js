const express=require("express");
const router=express.Router();
router.get("/", (req, res)=>{
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (
    mode === "subscribe" &&
    token === process.env.META_VERIFY_TOKEN &&
    challenge
  ) {
    console.log("Meta webhook verification successful");
    return res.status(200).send(challenge);
  }
  console.log("Meta webhook verification failed");
  return res.sendStatus(403);
});

router.post("/", (req, res)=>{
  console.log("Meta webhook event received");
  console.log(JSON.stringify(req.body, null, 2));
  return res.sendStatus(200);
});

module.exports = router;