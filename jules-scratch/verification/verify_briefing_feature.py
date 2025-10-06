import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to the login page
    page.goto("http://localhost:5173/login")

    # Wait for the login page to load fully
    expect(page.get_by_role("heading", name="Sign In")).to_be_visible()

    # Fill in the login form and submit
    page.get_by_label("Email Address").fill("test@example.com")
    page.get_by_label("Password").fill("password")
    page.get_by_role("button", name="Sign In").click()

    # Wait for navigation to the home page
    expect(page).to_have_url("http://localhost:5173/")

    # Take a screenshot to confirm login is successful
    page.screenshot(path="jules-scratch/verification/login_success.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)