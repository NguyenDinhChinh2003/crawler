import puppeteer from "puppeteer";
import fs from "fs";

async function speakJobs() {
    const browser = await puppeteer.launch({ headless: true }); // Use headless: false for debugging
    const page = await browser.newPage();
    await page.goto("https://jobs.ashbyhq.com/speak", { waitUntil: "domcontentloaded" });

    // Wait for elements to load
    await page.waitForSelector("._departments_12ylk_345");

    const result = await page.evaluate(() => {
        const speakJobs = [];
        const jobItems = document.querySelectorAll(".ashby-job-posting-brief-list");

        jobItems.forEach(item => {
            const containerLinks = item.querySelectorAll("a._container_j2da7_1");
            containerLinks.forEach(linkElement => {
                const title = item.querySelector("h3._title_12ylk_383")?.innerText.trim();
                const link = linkElement.href.trim();  
                const salaryText = item.querySelector("p._detailsCompensation_12ylk_395")?.innerText.trim() || null;
                let salary_min = null;
                let salary_max = null;
                const formatSalary = (salary) => {
                    if (!salary) return null;
                    salary = salary.toLowerCase().replace(/per hour/, '').trim();
                    if (salary.includes('k')) {
                        const value = parseFloat(salary.replace(/[^0-9.]/g, ''));
                        return value ? value * 1000 : null;  
                    }
                    if (salary.startsWith("$")) {
                        const value = parseFloat(salary.replace(/[^0-9.]/g, ''));
                        return value ? value : null;
                    }
                    return null;  
                };
                if (salaryText) {
                    if (salaryText.includes("–")) {
                        const salaryParts = salaryText.split("–").map(s => s.trim());
                        salary_min = formatSalary(salaryParts[0]);
                        salary_max = formatSalary(salaryParts[1]);
                    } else if (salaryText.includes("per hour")) {
                        salary_min = formatSalary(salaryText.split(" ")[0]);
                        salary_max = salary_min; 
                    } else {
                        salary_min = formatSalary(salaryText);
                        salary_max = salary_min; 
                    }
                }
                speakJobs.push({
                    title,
                    link,
                    salary_min,
                    salary_max,
                });
            });
        });

        return speakJobs;

    });
    for (let job of result) {
        const jobPage = await browser.newPage();
        await jobPage.goto(job.link, { waitUntil: "domcontentloaded" });
        await jobPage.waitForSelector("._description_4fqrp_201._container_101oc_29"); // Adjust the selector for description
        const description = await jobPage.evaluate(() => {
            const descriptionElement = document.querySelector("._descriptionText_4fqrp_201");
            // Get all <p> tags inside the description element
            const paragraphs = descriptionElement.querySelectorAll("p");
            // Join all the paragraphs into a single string
            const descriptionText = Array.from(paragraphs).map(p => p.innerText).join("<br>");
            return descriptionText.trim();
        });
        job.description = description;
        await jobPage.close();
    }
    const outputDir = "data";
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    fs.writeFileSync(`${outputDir}/speakJobs.json`, JSON.stringify(result, null, 2), "utf-8");
    console.log("Data saved to speakJobs.json");
    await browser.close();
}
speakJobs();
