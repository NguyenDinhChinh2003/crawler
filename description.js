import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeJobListings() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://remote.co/job/front-end-engineer-24/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".job_description"); // Ensure job listing elements are loaded

    const result = await page.evaluate(() => {
        // Select elements only inside the .job_description container
        const description = Array.from(document.querySelectorAll(".job_description p"))
            .map(p => p.innerText.trim())
            .join("<br>");
        const stack = Array.from(document.querySelectorAll(".job_description ul li"))
            .map(li => li.innerText.trim());
        return { description, stack };
    });

    console.log(result);

    // Save result to a JSON file
    fs.writeFileSync("data/description.json", JSON.stringify(result, null, 2), "utf-8");

    await browser.close();
}

scrapeJobListings();
