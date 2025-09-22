import re
import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.set_default_timeout(45000)

    try:
        # --- UNIQUE USER SIGN UP (LAST ATTEMPT) ---
        unique_email = f"test-jules-{int(time.time())}@example.com"
        print(f"Using unique email for signup: {unique_email}")

        page.goto("http://localhost:5175/")

        expect(page.get_by_role("heading", name="Sign In")).to_be_visible()
        page.get_by_role("link", name="Don't have an account? Sign Up").click()

        expect(page.get_by_role("heading", name="Sign Up")).to_be_visible()
        page.get_by_label("Full Name").fill("Test User")
        page.get_by_label("Email Address").fill(unique_email)
        # Use a more complex password as a last-ditch effort
        page.get_by_label("Password").fill("ComplexPwd!123")
        page.get_by_role("button", name="Sign Up").click()

        # After signup, it should redirect to the main app
        expect(page.get_by_role("heading", name="Minhas Campanhas")).to_be_visible(timeout=60000)
        print("Successfully signed up and logged in.")

        # --- CAMPAIGN CREATION ---
        campaign_name = "Campanha de Sustentabilidade"
        print(f"Creating new campaign: '{campaign_name}'")
        page.get_by_role("button", name="Criar nova Campanha").click()

        expect(page.get_by_role("heading", name="Campanha")).to_be_visible()

        page.get_by_label("Problema ou Necessidade").fill("Muitos clientes não sabem que nosso produto é ecológico.")
        page.get_by_label("Solução ou Proposta").fill("Lançar uma campanha de marketing digital focada na sustentabilidade e nos materiais reciclados que usamos.")

        page.get_by_role("button", name="Elaborar Postagens").click()

        pagina_tab = page.get_by_role("tab", name="Página")
        expect(pagina_tab).to_be_enabled(timeout=90000)

        pagina_tab.click()
        palette_dropdown = page.get_by_label("Paleta de Cores")
        expect(palette_dropdown).to_be_visible()
        palette_dropdown.click()
        page.get_by_role("option").nth(2).click()

        page.get_by_role("button", name="Salvar Campanha").click()

        expect(page.get_by_role("heading", name="Salvar Campanha")).to_be_visible()
        page.get_by_label("Nome da Campanha").fill(campaign_name)
        page.get_by_role("button", name="Salvar", exact=True).click()

        expect(page.get_by_text(f'Campaign "{campaign_name}" saved.')).to_be_visible()
        print("Campaign saved.")

        # --- MEMORIAL AND SCREENSHOT ---
        memorial_button = page.get_by_role("button", name="Ver memorial descritivo")
        expect(memorial_button).to_be_visible()
        memorial_button.click()

        expect(page.get_by_role("heading", name="Memorial Descritivo da Campanha")).to_be_visible()

        palette_heading = page.get_by_role("heading", name="Paleta de Cores")
        expect(palette_heading).to_be_visible()

        color_swatches = page.locator('div[style*="background-color: rgb"]')
        expect(color_swatches).to_have_count.greater_than(0)

        page.locator('[role="dialog"]').screenshot(path="jules-scratch/verification/memorial_palette.png")
        print("Screenshot saved successfully.")

    except Exception as e:
        print(f"An error occurred during the verification script: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
        print("Error screenshot saved.")

    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
