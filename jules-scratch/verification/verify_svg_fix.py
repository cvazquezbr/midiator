import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Go directly to the homepage where BriefingPage is rendered
        page.goto("https://midiator.vercel.app/")

        # 2. Click the "Novo Briefing" button to open the wizard
        page.get_by_role("button", name="Novo Briefing").click()

        # 3. Assert that we are on the "Inspiração" step (which should be the initial step now)
        expect(page.get_by_role("heading", name="Inspirações")).to_be_visible()

        # 4. Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)