const Redis = require("ioredis");


const redis = new Redis({
  url: 'https://arriving-filly-26772.upstash.io',
  token: 'AWiUAAIncDFmYTk2MWExNzI2ZWY0YjRmYjYwN2Y3M2VlNjhkYzQyZXAxMjY3NzI',
})


redis.on("connect", () => {
    console.log("✅ Redis connected");
});

module.exports = redis;
