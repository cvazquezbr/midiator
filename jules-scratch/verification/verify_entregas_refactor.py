import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Login
        page.goto("http://localhost:5173/login")

        # Wait for the main heading to ensure the page is loaded
        expect(page.get_by_role("heading", name="Sign In")).to_be_visible()

        email_input = page.get_by_label("Email Address")
        password_input = page.get_by_label("Password")

        expect(email_input).to_be_editable()
        email_input.fill("user@example.com")

        expect(password_input).to_be_editable()
        password_input.fill("user_password")

        page.get_by_role("button", name="Sign In").click()
        expect(page).to_have_url(re.compile(".*briefings"), timeout=10000)

        # 2. Create a new briefing
        page.get_by_role("button", name="Novo Briefing").click()

        # Wait for the wizard to appear
        expect(page.get_by_role("heading", name="Qual é a principal motivação?")).to_be_visible()

        # 3. Navigate to the 'Entregas' step
        page.get_by_role("button", name="Próximo").click() # Step 1 -> 2
        page.get_by_role("button", name="Próximo").click() # Step 2 -> 3
        page.get_by_role("button", name="Próximo").click() # Step 3 -> 4 (Entregas)

        # 4. Verify we are on the 'Entregas' step
        expect(page.get_by_role("heading", name="Entregas")).to_be_visible()

        # 5. Add a second delivery item
        page.get_by_role("button", name="Adicionar Entrega").click()
        expect(page.get_by_role("heading", name="Entrega #2")).to_be_visible()

        # 6. Fill in the 'Texto Base' for the first delivery item
        texto_base_input = page.get_by_label("Texto Base").first
        expect(texto_base_input).to_be_editable()
        texto_base_input.fill("Este é um texto base de exemplo para gerar uma mensagem principal incrível com a ajuda da IA.")

        # 7. Click the 'Gerar Mensagem Principal' button for the first item
        page.get_by_role("button", name="Gerar Mensagem Principal").first.click()

        # 8. Wait for the suggestion modal to appear
        expect(page.get_by_role("heading", name="Sugestões para Mensagem Principal")).to_be_visible()

        # 9. Take a screenshot
        page.screenshot(path="jules-scratch/verification/entregas_refactor_verification.png", full_page=True)

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)