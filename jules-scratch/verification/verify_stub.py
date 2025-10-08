import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for all console events and print them
    page.on("console", lambda msg: print(f"BROWSER CONSOLE ({msg.type}): {msg.text}"))

    try:
        # 1. Navigate to the stub page and see what happens
        print("Navigating to the stub page to capture logs...")
        page.goto("http://localhost:5173/")

        # Wait for a moment to ensure all logs are captured
        page.wait_for_timeout(5000)

        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        print("Took a screenshot of the page state.")

    except Exception as e:
        print(f"An error occurred during script execution: {e}")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)