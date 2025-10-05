import json
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    # --- DUMMY AUTH DATA ---
    # This simulates a logged-in user by setting a fake token in localStorage.
    auth_token = {
        "user": {
            "uuid": "dummy-uuid-12345",
            "email": "test@example.com",
            "name": "Test User"
        },
        "token": "dummy-jwt-token-abcdef123456",
        "googleAccessToken": "dummy-google-token-abcdef123456"
    }

    # --- SCRIPT ---
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()

    # 1. Set up authenticated session
    context.add_init_script(f"localStorage.setItem('hasura_user', '{json.dumps(auth_token)}');")
    page = context.new_page()

    try:
        # 2. Navigate to the app
        page.goto("http://localhost:5173/", timeout=60000)

        # Take an initial screenshot for debugging purposes
        page.screenshot(path="jules-scratch/verification/initial_page.png")
        print("Initial screenshot saved to jules-scratch/verification/initial_page.png")

        expect(page).to_have_title("Midiator")

        # 3. Create a new campaign
        # Wait for the button to be visible to handle initial load delays
        page.wait_for_selector('button:has-text("Criar Nova Campanha")', timeout=60000)
        page.get_by_role("button", name="Criar Nova Campanha").click()
        expect(page.get_by_role("heading", name="Campanha")).to_be_visible()

        # 4. Fill in initial campaign details to enable progression
        page.get_by_label("Problema ou Necessidade").fill("Test Problem")
        page.get_by_role("button", name="Selecionar Persona").click()
        page.get_by_role("option", name="Não especificar").click()

        page.get_by_label("Solução ou Proposta").fill("Test Solution")
        page.get_by_role("button", name="Selecionar Autor").click()
        page.get_by_role("option", name="Não especificar").click()
        page.get_by_label("Objetivo Principal do Post").click()
        page.get_by_role("option", name="Gerar leads").click()

        # 5. Navigate to Step 3: "Posts Curtos"
        page.get_by_role("button", name="Próximo").click()
        expect(page.get_by_role("heading", name="Posts Curtos")).to_be_visible()

        # 6. Upload CSV
        page.set_input_files("input[type='file']", "jules-scratch/verification/sample.csv")
        expect(page.get_by_text("value1")).to_be_visible()

        # 7. Navigate to Step 4: "Modelo de Página"
        page.get_by_role("button", name="Próximo").click()
        expect(page.get_by_role("heading", name="Modelo de Página")).to_be_visible()

        # 8. Upload a background image
        page.set_input_files("input[type='file']", "jules-scratch/verification/sample.png")
        # Wait for the image to appear in the preview
        expect(page.locator('.MuiCard-root img')).to_be_visible()

        # 9. Navigate to Step 5: "Edição de Páginas"
        page.get_by_role("button", name="Próximo").click()
        expect(page.get_by_role("heading", name="Edição de Páginas")).to_be_visible()

        # 10. Generate the pages
        page.get_by_role("button", name="Gerar Páginas").click()
        expect(page.get_by_text("Páginas Geradas (1)")).to_be_visible()

        # 11. Open the editor for the first page
        page.get_by_role("button", name="Editar").first.click()
        expect(page.get_by_role("heading", name="Editar Página Gerada #1")).to_be_visible()

        # 12. Open the image gallery and upload a new image
        page.get_by_role("button", name="Galeria de Imagens").click()
        page.get_by_role("tab", name="Fazer Upload do Computador").click()
        page.set_input_files("input[type='file']", "jules-scratch/verification/sample.png")

        # 13. Save the page
        page.get_by_role("button", name="Salvar Alterações").click()

        # 14. Take a screenshot for verification
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot saved to jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)