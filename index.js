import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeJobListings() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://docs.npmjs.com/policies/crawlers", { waitUntil: "domcontentloaded" });

    const result = await page.evaluate(() => {
        const title = document.querySelector(".components__StyledHeading-sc-13rww2g-0")?.innerText.trim();
        const description = Array.from(document.querySelectorAll("p"))
        .map(p => p.innerText.trim())
        .join("<br>");
        return { title, description };
    });

    console.log(result);

    // Ghi kết quả vào file JSON
    fs.writeFileSync("result.json", JSON.stringify(result, null, 2), "utf-8");

    await browser.close();
}

scrapeJobListings();
