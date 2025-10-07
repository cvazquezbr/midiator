from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for all console events and print them
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

    try:
        # 1. Bypass Login and go directly to the app
        # The login flow is broken in the dev environment due to lack of API proxy.
        page.goto("http://localhost:5173/")

        # 2. Navigate to Briefings from the main page
        # Wait for the main UI to appear and click the 'Briefings' button
        briefings_button = page.get_by_role("button", name="Briefings")
        expect(briefings_button).to_be_visible(timeout=15000)
        briefings_button.click()

        # Wait for the Briefing page to load
        expect(page.get_by_text("Briefings Salvos")).to_be_visible(timeout=10000)

        # 3. Create a new Briefing to open the wizard
        page.get_by_role("button", name="Criar Novo Briefing").click()
        expect(page.get_by_text("Assistente de Criação de Briefing")).to_be_visible()

        # Fill some data to make the final summary more realistic
        # Step 0: Objetivo
        page.get_by_text("Aumentar reconhecimento da marca").click()
        page.get_by_role("button", name="Próximo").click()

        # Step 1: Produto
        page.locator('input[name="produtoServico"]').fill("Produto de Teste")
        page.locator('textarea[name="descricao"]').fill("Esta é uma descrição de teste para o produto.")
        page.get_by_role("button", name="Próximo").click()

        # Step 2: Guia da Marca
        page.get_by_role("button", name="Selecionar").click()
        page.get_by_text("Aventureiro").click()
        page.get_by_role("button", name="Salvar Seleção").click()
        page.get_by_role("button", name="Próximo").click()

        # Step 3: Saudação
        page.locator('textarea[name="saudacao"]').fill("Olá, mundo do teste!")
        page.get_by_role("button", name="Próximo").click()

        # Step 4: Entregas
        entrega_paper = page.locator("div.MuiPaper-root:has-text('Entrega #1')")
        entrega_paper.get_by_label("Tipo").fill("Vídeo para Redes Sociais")
        entrega_paper.get_by_label("Mensagem Principal").fill("Mensagem principal de teste.")
        entrega_paper.get_by_label("CTA (Call to Action)").fill("Clique aqui para testar!")
        page.get_by_role("button", name="Próximo").click()

        # Step 5: Inspiração
        page.get_by_role("button", name="Próximo").click()

        # Step 6: Finalização
        expect(page.get_by_text("Finalização e Revisão")).to_be_visible()
        page.locator('input[name="name"]').fill("Briefing de Teste Final")

        # Take screenshot of the final step
        screenshot_path = "jules-scratch/verification/verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)