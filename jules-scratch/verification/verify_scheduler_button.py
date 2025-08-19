from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/admin/users")
        page.wait_for_timeout(5000)
        page.screenshot(path="jules-scratch/verification/01_admin_login.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
