from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/login")

        # Login
        page.get_by_label("Email").fill("test@test.com")
        page.get_by_label("Senha").fill("password")
        page.get_by_role("button", name="Entrar").click()

        # Espera o login ser processado
        page.wait_for_url("http://localhost:5173/")

        # Assume que o primeiro botão de edição abrirá o formulário
        edit_buttons = page.get_by_role("button", name="Editar")
        expect(edit_buttons.first).to_be_visible()
        edit_buttons.first.click()

        # Encontra e clica no primeiro botão de revisão
        revisao_button = page.get_by_title("Revisar Texto com IA").first
        expect(revisao_button).to_be_visible()
        revisao_button.click()

        # Espera o modal aparecer e tira a captura de tela
        expect(page.get_by_role("heading", name="Revisão de Texto")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
