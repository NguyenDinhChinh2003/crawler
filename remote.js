import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeJobListings() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://remote.co/remote-jobs/developer/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".row.no-gutters.align-items-center"); // Ensure job listing elements are loaded
    await autoScroll(page); // Scroll to load all listings

    const result = await page.evaluate(() => {
        const remoteJob = [];
        const companyItems = document.querySelectorAll(".card.m-0.border-left-0.border-right-0.border-top-0.border-bottom"); // Select the <a> with card class

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
            // Get the job title
            const title = item.querySelector(".font-weight-bold.larger")?.innerText.trim();

            // Get the job description link (href attribute of <a> tag)
            const descriptionLink = "https://remote.co" + item.getAttribute("href");

            // Get the company information
            const companyElement = item.querySelector(".m-0.text-secondary");
            const companyText = companyElement?.textContent.trim();
            const company = companyText ? companyText.split("|")[0].trim() : null;

            // Get the relative date
            const dateText = item.querySelector(".float-right.d-none.d-md-inline.text-secondary")?.innerText.trim();
            const dateCreated = dateText ? parseRelativeTime(dateText) : null;

            // Get the image source URL
            const imageElement = item.querySelector("img.card-img");
            const linkImage = imageElement?.getAttribute("src") || imageElement?.getAttribute("data-src") || null;

            remoteJob.push({
                title,
                descriptionLink, // Store the description link here
                company,
                dateCreated,
                linkImage,
            });
        });

        return remoteJob;
    });

    // Now fetch the description and stack for each job listing
    const jobDetails = [];
    for (const job of result) {
        const description = await getDescription(job.descriptionLink);
        const stack = await getStack(job.descriptionLink);
        
        jobDetails.push({
            ...job,
            description,
            stack
        });
    }

    console.log(jobDetails);

    // Save result to a JSON file
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

async function getDescription(descriptionLink) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(descriptionLink, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".job_description"); // Ensure job listing elements are loaded

    const result = await page.evaluate(() => {
        const description = Array.from(document.querySelectorAll(".job_description p"))
            .map(p => p.innerText.trim())
            .join("<br>");
        return description;
    });
    await browser.close(); // Close the browser after scraping
    return result;
}

async function getStack(descriptionLink) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(descriptionLink, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".job_description"); // Ensure job listing elements are loaded

    const result = await page.evaluate(() => {
        const stack = Array.from(document.querySelectorAll(".job_description ul li"))
            .map(li => li.innerText.trim());
        return stack;
    });
    await browser.close(); // Close the browser after scraping
    return result;
}

scrapeJobListings();
