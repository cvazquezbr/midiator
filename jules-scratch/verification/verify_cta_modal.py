import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate directly to the HomePage (now public)
        page.goto("http://localhost:5173/")

        # 2. Navigate to the Briefings section via the user menu
        page.get_by_label("opções do usuário").click()
        page.get_by_role("menuitem", name="Briefings").click()

        # 3. Open the Briefing Wizard
        expect(page.get_by_role("button", name="Novo Briefing")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Novo Briefing").click()

        # Wait for the wizard to appear
        wizard_title = page.get_by_role("heading", name="Assistente de Criação de Briefing")
        expect(wizard_title).to_be_visible()

        # 4. Navigate to the "Entregas" step (Step 5)
        page.get_by_role("button", name="Próximo").click() # -> 2
        page.get_by_role("button", name="Próximo").click() # -> 3
        page.get_by_role("button", name="Próximo").click() # -> 4
        page.get_by_role("button", name="Próximo").click() # -> 5 (Entregas)

        # 5. Trigger AI Suggestions for CTA
        page.locator('span[aria-label="Gerar sugestões de CTA com IA"]').click()

        # 6. Verify the new modal with the best practices section
        modal_title = page.get_by_role("heading", name="Sugestões de Call-to-Action (CTA)")
        expect(modal_title).to_be_visible(timeout=5000)

        # Check for the best practices content
        best_practices_title = page.get_by_role("heading", name="Boas Práticas para CTAs")
        expect(best_practices_title).to_be_visible()

        # Wait for suggestions to load
        regenerate_button = page.get_by_role("button", name="Gerar Novamente")
        expect(regenerate_button).to_be_enabled(timeout=30000)

        # Take the screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot saved to jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
        print(page.content())

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)