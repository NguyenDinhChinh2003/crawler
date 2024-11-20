import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrapeJobListings() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://topdev.vn/it-jobs?src=topdev.vn&medium=mainmenu', { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(() => {
        const jobListings = [];
        const jobItems = document.querySelectorAll('.mb-4'); 

        // Function to parse relative time (e.g., "4 hours ago", "48 minutes ago")
        const parseRelativeTime = (timeText) => {
            const now = new Date();
            const match = timeText.match(/(\d+)\s(\w+)\sago/); // Match "X time ago"
            if (match) {
                const value = parseInt(match[1], 10);
                const unit = match[2].toLowerCase();
        
                if (unit.includes('minute')) {
                    now.setMinutes(now.getMinutes() - value);
                } else if (unit.includes('hour')) {
                    now.setHours(now.getHours() - value);
                } else if (unit.includes('day')) {
                    now.setDate(now.getDate() - value);
                } else if (unit.includes('week')) {
                    now.setDate(now.getDate() - value * 7);
                }
            }
        
            // Format the date to YYYY-MM-DD
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');  // Adding 1 as months are 0-indexed
            const day = now.getDate().toString().padStart(2, '0');  // Pad single-digit days with leading zero
        
            return `${year}-${month}-${day}`;
        };
        

        jobItems.forEach(item => {
            const title = item.querySelector('.line-clamp-1')?.innerText.trim();
            const ulElement = item.querySelector('ul.ml-6.list-disc.text-gray-600');
            let descriptions = []; // Array to collect all descriptions
        
            if (ulElement) {
                // Get all <li> elements within the <ul>
                const listItems = ulElement.querySelectorAll('li');
                listItems.forEach(li => {
                    const pText = li.querySelector('p.line-clamp-1')?.innerText.trim();
                    if (pText) {
                        descriptions.push(pText);  // Add each description to the array
                    }
                });
            }
            const dateText = item.querySelector('.whitespace-nowrap.text-sm.text-gray-400')?.innerText.trim();
            const dateCreated = dateText ? parseRelativeTime(dateText) : null; // Parse the relative time
            const techStacks = Array.from(item.querySelectorAll('.mr-2.inline-block'))
                .map(stack => stack.innerText.trim())
                .join(', ');
            const company = item.querySelector('.mt-1.line-clamp-1')?.innerText.trim();

            if (title) {
                jobListings.push({
                    title,
                    descriptions,
                    dateCreated,
                    techStacks,
                    company
                });
            }
        });
        return jobListings;
    });
    fs.writeFileSync('jobListings.json', JSON.stringify(result, null, 2), 'utf-8');
    console.log('Data saved to jobListings.json');
    console.log(result);
    await browser.close();
}

scrapeJobListings();
