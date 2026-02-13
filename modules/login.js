export async function login(worker,config){
    const page = worker.page

    await page.goto(config.serverUrl , { waitUntil :  "domcontentloaded"});
    await page.fill("input[name='name']", config.username);
    await page.fill("input[name='password']", config.password);
    await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle" }),
        page.click("button[type='submit']")
    ]);

    await page.waitForSelector("a.resourceField" , { timeout : 10000 });
    console.log("Login successful");
}