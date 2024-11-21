import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeJobListings() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://remote.co/remote-jobs/developer/", { waitUntil: "domcontentloaded" });
    await autoScroll(page);

    const result = await page.evaluate(() => {
        const remoteJob = [];
        const companyItem = document.querySelectorAll(".row.no-gutters.align-items-center");

        const parseRelativeTime = (timeText) => {
            const now = new Date();
            const match = timeText.match(/(\d+)\s(\w+)\sago/);
            if (match) {
                const value = parseInt(match[1], 10);
                const unit = match[2].toLowerCase();

                if (unit.includes("minute")) {
                    now.setMinutes(now.getMinutes() - value);
                } else if (unit.includes("hour")) {
                    now.setHours(now.getHours() - value);
                } else if (unit.includes("day")) {
                    now.setDate(now.getDate() - value);
                } else if (unit.includes("week")) {
                    now.setDate(now.getDate() - value * 7);
                }
            }
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, "0");
            const day = now.getDate().toString().padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        companyItem.forEach((item) => {
            const title = item.querySelector(".font-weight-bold.larger")?.innerText.trim();
            const companyElement = item.querySelector(".m-0.text-secondary");
            const companyText = companyElement?.textContent.trim();
            const company = companyText ? companyText.split("|")[0].trim() : null;
            const dateText = item.querySelector(".float-right.d-none.d-md-inline.text-secondary")?.innerText.trim();
            const dateCreated = dateText ? parseRelativeTime(dateText) : null;

            // Directly query the image element
            const imageElement = item.querySelector("img.card-img");
            const link_image = imageElement?.getAttribute("src") || imageElement?.getAttribute("data-src") || null;

            remoteJob.push({
                title,
                company,
                dateCreated,
                link_image,
            });
        });

        return remoteJob;
    });

    console.log(result);

    // Save result to JSON file
    fs.writeFileSync("data/remote.json", JSON.stringify(result, null, 2), "utf-8");

    await browser.close();
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

scrapeJobListings();
