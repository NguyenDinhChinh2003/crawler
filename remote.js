import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeJobListings() {
    const browser = await puppeteer.launch({ headless: true });

    const page = await browser.newPage();
    await page.goto("https://remote.co/remote-jobs/developer/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".row.no-gutters.align-items-center");
    await autoScroll(page);

    const result = await page.evaluate(() => {
        const remoteJob = [];
        const companyItems = document.querySelectorAll(".card.m-0.border-left-0.border-right-0.border-top-0.border-bottom");

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

        companyItems.forEach((item) => {
            const title = item.querySelector(".font-weight-bold.larger")?.innerText.trim();
            const descriptionLink = "https://remote.co" + item.getAttribute("href");
            const companyElement = item.querySelector(".m-0.text-secondary");
            const companyText = companyElement?.textContent.trim();
            const company = companyText ? companyText.split("|")[0].trim() : null;
            const dateText = item.querySelector(".float-right.d-none.d-md-inline.text-secondary")?.innerText.trim();
            const dateCreated = dateText ? parseRelativeTime(dateText) : null;
            const imageElement = item.querySelector("img.card-img");
            const linkImage = imageElement?.getAttribute("src") || imageElement?.getAttribute("data-src") || null;

            remoteJob.push({
                title,
                company,
                dateCreated,
                linkImage,
                descriptionLink,
            });
        });

        return remoteJob;
    });

    // Crawl mô tả và stack cho tất cả công việc song song
    const jobDetails = await Promise.all(result.map(async (job) => {
        const description = await getDescription(job.descriptionLink, browser);
        const stack = await getStack(job.descriptionLink, browser);
        return {
            ...job,
            description,
            stack
        };
    }));

    console.log(jobDetails);

    // Lưu kết quả vào file JSON
    fs.writeFileSync("data/remote.json", JSON.stringify(jobDetails, null, 2), "utf-8");

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

async function getDescription(descriptionLink, browser) {
    const page = await browser.newPage();
    await page.goto(descriptionLink, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".job_description");

    const result = await page.evaluate(() => {
        const description = Array.from(document.querySelectorAll(".job_description p"))
            .map(p => p.innerText.trim())
            .join("<br>");
        return description;
    });

    await page.close(); // Đóng trang sau khi lấy dữ liệu
    return result;
}

async function getStack(descriptionLink, browser) {
    const page = await browser.newPage();
    await page.goto(descriptionLink, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".job_description");

    const result = await page.evaluate(() => {
        const stack = Array.from(document.querySelectorAll(".job_description ul li"))
            .map(li => li.innerText.trim());
        return stack;
    });

    await page.close(); // Đóng trang sau khi lấy dữ liệu
    return result;
}

scrapeJobListings();
