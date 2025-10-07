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

        # 2. Create a new briefing
        page.get_by_role("button", name="Novo Briefing").click()
        expect(page.get_by_role("heading", name="Qual é a principal motivação?")).to_be_visible()

        # 3. Navigate to Entregas step
        page.get_by_role("button", name="Próximo").click()
        page.get_by_role("button", name="Próximo").click()
        page.get_by_role("button", name="Próximo").click()
        expect(page.get_by_role("heading", name="Entregas")).to_be_visible()

        # 4. Fill in Texto Base and generate suggestions
        texto_base_input = page.get_by_label("Texto Base").first
        expect(texto_base_input).to_be_editable()
        texto_base_input.fill("Convidar seus seguidores a participarem do evento aberto ao público CURTINDO O SEXO NA ENVELHESCÊNCIA. O foco é resolver uma das maiores dores de quem ama sexo na menopausa: estar sempre molhadinha - e com a KY Gel isso é possível!")

        # 5. Trigger the AI suggestion
        page.get_by_role("button", name="Gerar Mensagem Principal").first.click()

        # 6. Wait for the modal and take a screenshot
        expect(page.get_by_role("heading", name="Sugestões para Mensagem Principal")).to_be_visible()
        # Add a small delay to ensure suggestions are rendered
        page.wait_for_timeout(2000)
        page.screenshot(path="jules-scratch/verification/prompt_fix_verification.png", full_page=True)

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)