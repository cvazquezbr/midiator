from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Login
        page.goto("http://localhost:5173/login")

        email_field = page.get_by_label("Email")
        expect(email_field).to_be_editable()
        email_field.fill("test@test.com")

        print(page.content())

        password_field = page.get_by_label("Senha")
        expect(password_field).to_be_editable()
        password_field.fill("password")

        page.get_by_role("button", name="Entrar").click()
        expect(page).to_have_url("http://localhost:5173/")

        # 2. Load a campaign
        page.get_by_role("button", name="Campanha de Teste").click()
        expect(page.get_by_role("heading", name="Editor de Página")).to_be_visible()

        # 3. Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)