import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeJobListings()
{
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://aniday.com/en/job?jobtype=1&category=1&location=1019", { waitUntil: "domcontentloaded" });
    const result = await page.evaluate(()=>{
        const jobListings = [];
        const jobItems = document.querySelectorAll('.job-item-card'); 
        jobItems.forEach(item => {
            const title = item.querySelector('.job-item-card__title-name')?.innerText.trim();
            const company = item.querySelector('.job-item-card__company-name')?.innerText.trim();
            const detail_link = item.querySelector('.job-item-card__detail')?.getAttribute('href');
            const imageElement = item.querySelector(".job-item-card__company-logo.bg-image-element");
            const bgImageData = imageElement?.getAttribute('data-bgimage');
            // const match = bgImageData.match(/url\('([^']+)_3x/);
            // const imageUrl3x = match ? match[1] + " 3x" : null;
            if (title) {
                jobListings.push({
                    title,
                    company,
                    detail_link,
                    bgImageData,
                });
            }
        });
        return jobListings;
    });
    fs.writeFileSync('data/aniday.json', JSON.stringify(result, null, 2), 'utf-8');
    console.log('Data saved to jobListings.json');
    console.log(result);
    await browser.close();
}
scrapeJobListings();


async function getDescription(detail_link){

}