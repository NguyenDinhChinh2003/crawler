import puppeteer from "puppeteer";
import fs from "fs/promises"; // Use promises for better async handling

async function scrapeJobListings() {
    const browser = await puppeteer.launch({ headless: true });

    try {
        const page = await browser.newPage();
        await page.goto("https://aniday.com/en/job?jobtype=1&category=1&location=1019", { waitUntil: "domcontentloaded" });

        // Scrape job listings
        const jobListings = await page.evaluate(() => {
            const jobs = [];
            const jobItems = document.querySelectorAll('.job-item-card');

            jobItems.forEach(item => {
                const title = item.querySelector('.job-item-card__title-name')?.innerText.trim();
                const company = item.querySelector('.job-item-card__company-name')?.innerText.trim();
                const detail_link = item.querySelector('.job-item-card__detail')?.getAttribute('href');
                const imageElement = item.querySelector(".job-item-card__company-logo.bg-image-element");
                const bgImageData = imageElement?.getAttribute('data-bgimage');
                const match = bgImageData?.match(/url\('(https:\/\/[^']*size70[^']*)'\)/);
                const image = match?.[1];

                if (title) {
                    jobs.push({ title, company, detail_link, image });
                }
            });

            return jobs;
        });

        // Add descriptions to each job listing
        const jobDetails = [];
        for (const job of jobListings) {
            try {
                const description = await getDescription(job.detail_link, browser);
                const techStacks = await getTechStack(job.detail_link, browser);
                jobDetails.push({ ...job, description, techStacks });
            } catch (error) {
                console.error(`Failed to get description for ${job.detail_link}:`, error);
                jobDetails.push({ ...job, description: "Description not available" });
            }
        }

        // Save the data to a JSON file
        await fs.writeFile('data/aniday.json', JSON.stringify(jobDetails, null, 2), 'utf-8');
        console.log('Data saved to data/aniday.json');
    } catch (error) {
        console.error("An error occurred during scraping:", error);
    } finally {
        await browser.close();
    }
}

async function getDescription(detailLink, browser) {
    if (!detailLink) return "No detail link provided";

    const page = await browser.newPage();
    try {
        await page.goto(detailLink, { waitUntil: "domcontentloaded" });
        const description = await page.evaluate(() => {
            // Lấy tất cả các thẻ có class 'ss-job-descr-item'
            const items = document.querySelectorAll('.ss-job-descr-item');
            if (!items.length) return "Description not found";
            // Lấy nội dung mỗi thẻ <p> có class 'mct-posses' trong mỗi phần tử 'ss-job-descr-item'
            return Array.from(items)
                .map(item => {
                    const title = item.querySelector('h2, h3')?.innerText.trim();  // Lấy tiêu đề (h2 hoặc h3)
                    const content = item.querySelector('.mct-posses')?.innerHTML.trim() || ''; // Lấy nội dung mô tả
                    const formattedContent = content.replace(/\n/g, '<br>');
                    return `<h3>${title}</h3><p>${formattedContent}</p>`;  // Đảm bảo kết quả có tiêu đề và nội dung
                }).join('');  // Kết hợp nội dung mỗi phần tử bằng <br>
        });
        return description;
    } catch (error) {
        console.error(`Error fetching description from ${detailLink}:`, error);
        return "Error fetching description";
    } finally {
        await page.close();
    }
}

async function getTechStack(detailLink, browser) {
    if (!detailLink) return "No detail link provided";
    const page = await browser.newPage();
    try {
        await page.goto(detailLink, { waitUntil: "domcontentloaded" });
        const techStacks = await page.evaluate(() => {
            const container = document.querySelector('.ss-job-header-title');
            if (!container) return [];
            return Array.from(container.querySelectorAll('span.tag'))
                .map(stack => stack.innerText.trim());
        });
        return techStacks;
    } catch (error) {
        console.error(`Error fetching tech stacks from ${detailLink}:`, error);
        return "Error fetching tech stacks";
    } finally {
        await page.close();
    }
}

// Start scraping
scrapeJobListings();
