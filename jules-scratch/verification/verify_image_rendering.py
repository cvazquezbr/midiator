import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Login
        page.goto("http://localhost:5173/login")
        page.get_by_label("Email").fill("test@example.com")
        page.get_by_label("Sua senha").fill("password")
        page.get_by_role("button", name="Entrar").click()
        expect(page.get_by_text("Suas campanhas")).to_be_visible(timeout=10000)

        # 2. Load a campaign
        # Click the first campaign's "Edit" button
        page.get_by_role("button", name="Editar").first.click()

        # Wait for the editor to load by checking for the "Edição de Páginas" step
        expect(page.get_by_text("Edição de Páginas")).to_be_visible(timeout=20000)

        # 3. Navigate to the page editor (Step 4)
        page.get_by_role("button", name="Edição de Páginas").click()

        # Wait for the first generated page thumbnail to be visible
        expect(page.locator(".MuiCard-root").first).to_be_visible(timeout=20000)

        # 4. Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)