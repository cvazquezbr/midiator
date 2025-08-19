from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/")
        print(page.content())
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
