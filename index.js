const express = require("express");
const app = express();
const pup = require("puppeteer");
const redis = require("redis");
const client = redis.createClient({ host: "127.0.0.1", port: 6379 });

app.get("/", async (req, res) => {
  res.send("Running Well!");
  const browser = await pup.launch({
    ignoreDefaultArgs: ["--disable-extensions"],
    headless: false,
    timeout: 0,
  });
  const page = await browser.newPage();
  await page.goto(
    "https://s.tradingview.com/embed-widget/market-quotes/?locale=en#%7B%22width%22%3A770%2C%22height%22%3A450%2C%22symbolsGroups%22%3A%5B%7B%22name%22%3A%22Forex%22%2C%22originalName%22%3A%22Forex%22%2C%22symbols%22%3A%5B%7B%22name%22%3A%22OANDA%3AEURUSD%22%7D%2C%7B%22name%22%3A%22OANDA%3AGBPUSD%22%7D%2C%7B%22name%22%3A%22OANDA%3AUSDCHF%22%7D%2C%7B%22name%22%3A%22OANDA%3AUSDCAD%22%7D%2C%7B%22name%22%3A%22OANDA%3AUSDJPY%22%7D%2C%7B%22name%22%3A%22OANDA%3AAUDUSD%22%7D%2C%7B%22name%22%3A%22OANDA%3ANZDUSD%22%7D%2C%7B%22name%22%3A%22OANDA%3AEURJPY%22%7D%2C%7B%22name%22%3A%22OANDA%3AEURCAD%22%7D%2C%7B%22name%22%3A%22OANDA%3AEURNZD%22%7D%2C%7B%22name%22%3A%22OANDA%3AEURAUD%22%7D%2C%7B%22name%22%3A%22OANDA%3AEURNZD%22%7D%2C%7B%22name%22%3A%22OANDA%3AEURCHF%22%7D%2C%7B%22name%22%3A%22OANDA%3AGBPJPY%22%7D%2C%7B%22name%22%3A%22OANDA%3AGBPNZD%22%7D%2C%7B%22name%22%3A%22OANDA%3AGBPAUD%22%7D%2C%7B%22name%22%3A%22OANDA%3AGBPCAD%22%7D%2C%7B%22name%22%3A%22OANDA%3AGBPCHF%22%7D%2C%7B%22name%22%3A%22OANDA%3AAUDCAD%22%7D%2C%7B%22name%22%3A%22OANDA%3AAUDNZD%22%7D%2C%7B%22name%22%3A%22OANDA%3AAUDJPY%22%7D%2C%7B%22name%22%3A%22OANDA%3AAUDCHF%22%7D%2C%7B%22name%22%3A%22OANDA%3ACHFJPY%22%7D%2C%7B%22name%22%3A%22OANDA%3AXAGUSD%22%7D%2C%7B%22name%22%3A%22OANDA%3AXAUUSD%22%7D%5D%7D%5D%2C%22showSymbolLogo%22%3Atrue%2C%22colorTheme%22%3A%22light%22%2C%22isTransparent%22%3Afalse%2C%22utm_source%22%3A%22sanset.ir%22%2C%22utm_medium%22%3A%22widget_new%22%2C%22utm_campaign%22%3A%22market-quotes%22%7D",
    {
      waitUntil: "domcontentloaded",
    }
  );
  // await page.waitForTimeout(3000);
  await page.waitForSelector(".market-quotes-widget");
  let result = null;
  while (true) {
    const nRes = await page.$$eval(
      ".market-quotes-widget__symbols > div",
      (o1) => {
        const result = [];
        o1.forEach((o2) => {
          result.push({
            name: o2.querySelector(".js-symbol-short-name").innerText,
            value: o2.querySelector(".js-symbol-last").innerText,
            change: o2.querySelector(".js-symbol-change").innerText,
            chgPercent: o2.querySelector(".js-symbol-change-pt").innerText,
            open: o2.querySelector(".js-symbol-open").innerText,
            high: o2.querySelector(".js-symbol-high").innerText,
            low: o2.querySelector(".js-symbol-low").innerText,
            prev: o2.querySelector(".js-symbol-prev-close").innerText,
          });
        });
        return result;
      }
    );
    let counter = 0;
    if (result)
      result.forEach((el) => {
        if (JSON.stringify(el) != JSON.stringify(nRes[counter])) {
          result[counter] = nRes[counter];
          client.set(
            nRes[counter].name,
            JSON.stringify(nRes[counter]),
            redis.print
          );
        }
        counter++;
      });
    else {
      result = [...nRes];
      result.forEach((el) => {
        client.set(el.name, JSON.stringify(el), redis.print);
      });
    }
  }
});
app.get("/get/:name", (req, res) => {
  client.get(req.params.name, (e, r) => {
    res.json(JSON.parse(r));
  });
});
app.listen(3000);
