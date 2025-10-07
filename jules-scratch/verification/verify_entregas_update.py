import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Login
        page.goto("http://localhost:5173/login")
        expect(page.get_by_role("heading", name="Sign In")).to_be_visible()
        page.get_by_label("Email Address").fill("user@example.com")
        page.get_by_label("Password").fill("user_password")
        page.get_by_role("button", name="Sign In").click()
        expect(page).to_have_url(re.compile(".*briefings"), timeout=10000)

        # 2. Create a new briefing and select a Tone of Voice
        page.get_by_role("button", name="Novo Briefing").click()
        expect(page.get_by_role("heading", name="Qual é a principal motivação?")).to_be_visible()

        # Navigate to Guia da Marca
        page.get_by_role("button", name="Próximo").click() # -> Step 2
        page.get_by_role("button", name="Próximo").click() # -> Step 3 (Guia da Marca)

        # Select a Tone of Voice
        page.get_by_role("button", name="Selecionar").click()
        expect(page.get_by_role("heading", name="Selecione o Tom de Voz")).to_be_visible()
        page.get_by_text("Inspirador e Aspiracional").click()
        page.get_by_role("button", name="Confirmar").click()

        # Navigate to Entregas
        page.get_by_role("button", name="Próximo").click() # -> Step 4 (Entregas)
        expect(page.get_by_role("heading", name="Entregas")).to_be_visible()

        # 3. Fill in Texto Base and generate Mensagem Principal
        texto_base_input = page.get_by_label("Texto Base").first
        expect(texto_base_input).to_be_editable()
        texto_base_input.fill("Este é um texto base para testar a geração de mensagem e CTA.")

        page.get_by_role("button", name="Gerar Mensagem Principal").first.click()
        expect(page.get_by_role("heading", name="Sugestões para Mensagem Principal")).to_be_visible()
        # Select the first suggestion to populate the field
        page.get_by_role("button", name=re.compile(r"Usar sugestão")).first.click()
        expect(page.get_by_role("heading", name="Sugestões para Mensagem Principal")).not_to_be_visible()

        # 4. Generate CTA suggestions
        page.get_by_role("button", name="Gerar sugestões de CTA com IA").first.click()

        # 5. Wait for the CTA modal and take a screenshot
        expect(page.get_by_role("heading", name="Sugestões de Call-to-Action (CTA)")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/entregas_cta_modal_verification.png", full_page=True)

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)