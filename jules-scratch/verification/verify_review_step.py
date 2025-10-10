import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the root, which now renders the test stub
        page.goto("http://localhost:5173/")

        # The wizard is already open. Wait for it to be visible.
        expect(page.get_by_role("heading", name="Novo Briefing a partir de Texto")).to_be_visible()

        # Step 0: Fill in base text and load the template
        page.locator('.ProseMirror').first.fill("Texto base de exemplo.")
        page.get_by_role("button", name="Gerenciar Modelo").click()
        expect(page.get_by_role("heading", name="Gerenciar Modelo de Briefing")).to_be_visible()
        page.get_by_role("button", name="Salvar e Usar Modelo").click()

        # Step 1: Go to revision step
        page.get_by_role("button", name="Próximo").click()

        # Now on the "Review" step, wait for the content to be visible
        expect(page.get_by_role("heading", name="Briefing Revisado")).to_be_visible()

        # Take a screenshot of the review step
        page.screenshot(path="jules-scratch/verification/review_step_verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run(p)