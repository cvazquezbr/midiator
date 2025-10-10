import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for console messages
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    try:
        # Navigate to the root, which now renders the test stub
        page.goto("http://localhost:5173/")

        # The wizard is already open.
        # Wait for it to be visible.
        expect(page.get_by_role("heading", name="Novo Briefing a partir de Texto")).to_be_visible()

        # Step 0: The data is pre-filled by the stub. We just need to manage the template.
        page.locator('.ProseMirror').first.fill("Texto base de exemplo.")
        page.get_by_role("button", name="Gerenciar Modelo").click()

        # Fill the template modal
        expect(page.get_by_role("heading", name="Gerenciar Modelo de Briefing")).to_be_visible()

        # Fill TÍTULO DA MISSÃO
        page.locator("div.MuiGrid-item:has(h6:has-text('TÍTULO DA MISSÃO'))").locator('.ProseMirror').fill("Este é o título da missão.")

        # Fill DOs
        dos_editor = page.locator("div.MuiGrid-item:has(h6:has-text('DOs'))").locator('.ProseMirror')
        dos_editor.fill("") # Clear any default
        dos_editor.type("Mostre o produto logo nos primeiros 3 segundos.")
        dos_editor.press("Enter")
        dos_editor.type("Mostre aplicação real e resultado do produto.")

        # Fill DON'Ts
        donts_editor = page.locator("div.MuiGrid-item:has(h6:has-text(\"DON'Ts\"))").locator('.ProseMirror')
        donts_editor.fill("") # Clear any default
        donts_editor.type("Não use imagens ou logos de outras marcas.")
        donts_editor.press("Enter")
        donts_editor.type("Não utilize trilhas com direitos autorais.")

        page.get_by_role("button", name="Salvar e Usar Modelo").click()

        # Step 1: Go to revision
        page.get_by_role("button", name="Próximo").click()

        # Fill in the name and proceed
        expect(page.get_by_label("Nome do Briefing")).to_be_visible()
        page.get_by_label("Nome do Briefing").fill("Teste de Formatação")
        page.get_by_role("button", name="Próximo").click()

        # Step 2: Skip block completion
        expect(page.get_by_role("heading", name="Completar Blocos")).to_be_visible()
        page.get_by_role("button", name="Próximo").click()

        # Step 3: Finalization - take screenshot
        expect(page.get_by_role("heading", name="Finalização")).to_be_visible()

        # Wait for the final text to be rendered.
        # The final editor is the last one to appear in the dialog.
        final_editor = page.locator('div[role="dialog"]').locator('.ProseMirror').nth(-1)

        # Add a small wait to ensure content is rendered after the step change
        page.wait_for_timeout(1000) # Increased wait time

        # Just take the screenshot without assertions
        page.screenshot(path="jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run(p)