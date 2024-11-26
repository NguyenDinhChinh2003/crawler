import puppeteer from 'puppeteer';
import fs from 'fs';

// Danh sách các URL mà bạn muốn crawl
const jobUrls = [
    'https://aniday.com/en/job?jobtype=1&category=1&location=1019',
];

// Hàm crawl một trang và lấy dữ liệu mô tả công việc
async function crawlJobSite(url, browser) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const jobDetails = await page.evaluate(() => {
        const jobListings = [];
        const jobItems = document.querySelectorAll('.job-item-card');

        jobItems.forEach(item => {
            const title = item.querySelector('.job-item-card__title-name')?.innerText.trim();
            const company = item.querySelector('.job-item-card__company-name')?.innerText.trim();
            const detailLink = item.querySelector('.job-item-card__detail')?.getAttribute('href');
            const imageElement = item.querySelector('.job-item-card__company-logo.bg-image-element');
            const bgImageData = imageElement?.getAttribute('data-bgimage');
            const match = bgImageData?.match(/url\('(https:\/\/[^']*size70[^']*)'\)/);
            const image = match ? match[1] : null;

            if (title && detailLink) {
                jobListings.push({
                    title,
                    company,
                    detailLink,
                    image,
                });
            }
        });

        return jobListings;
    });

    await page.close();
    return jobDetails;
}

// Hàm crawl và lấy mô tả chi tiết công việc từ các URL
async function getJobDetails(jobDetails, browser) {
    for (const job of jobDetails) {
        try {
            const description = await getDescription(job.detailLink, browser);
            job.description = description;
        } catch (error) {
            console.error(`Failed to get description for ${job.detailLink}:`, error);
            job.description = "Description not available";
        }
    }
    return jobDetails;
}

// Hàm lấy mô tả chi tiết công việc từ từng trang công việc
async function getDescription(detailLink, browser) {
    const page = await browser.newPage();
    await page.goto(detailLink, { waitUntil: 'domcontentloaded' });

    const description = await page.evaluate(() => {
        const items = document.querySelectorAll('.ss-job-descr-item');
        if (!items.length) return "Description not found";

        return Array.from(items)
            .map(item => {
                const title = item.querySelector('h2, h3')?.innerText.trim();
                const content = item.querySelector('.mct-posses')?.innerHTML.trim() || '';
                const formattedContent = content.replace(/\n/g, '<br>');
                return `<h3>${title}</h3><p>${formattedContent}</p>`;
            })
            .join('<br><br>');
    });

    await page.close();
    return description;
}

// Chạy crawler cho tất cả các URL
async function runCrawler() {
    const browser = await puppeteer.launch({ headless: true });
    const allJobDetails = [];

    // Crawl từng trang web trong danh sách URL
    for (const url of jobUrls) {
        try {
            const jobListings = await crawlJobSite(url, browser);
            const jobDetailsWithDescriptions = await getJobDetails(jobListings, browser);
            allJobDetails.push(...jobDetailsWithDescriptions);
        } catch (error) {
            console.error(`Error crawling site ${url}:`, error);
        }
    }

    // Lưu kết quả vào file JSON
    fs.writeFileSync('jobListings.json', JSON.stringify(allJobDetails, null, 2), 'utf-8');
    console.log('Crawl complete. Data saved to jobListings.json.');

    await browser.close();
}

// Bắt đầu quá trình crawl
runCrawler();
