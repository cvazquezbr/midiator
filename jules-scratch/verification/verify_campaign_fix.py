
import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173")

        # Click on "Minhas Campanhas" to navigate to the campaigns page
        page.get_by_role("button", name="Minhas Campanhas").click()

        # Click on "Nova Campanha"
        page.get_by_role("button", name="Nova Campanha").click()

        # Fill in the "Problema ou Necessidade" text field
        problema_field = page.get_by_label("Problema ou Necessidade")
        problema_field.fill("This is a test description.")

        # Expect the field to have the correct value
        expect(problema_field).to_have_value("This is a test description.")

        # Take a screenshot to verify the fix
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
