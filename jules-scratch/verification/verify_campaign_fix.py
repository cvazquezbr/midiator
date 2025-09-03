import time
import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Generate a unique email for each run
        unique_email = f"test_{int(time.time())}@example.com"

        # 1. Sign up a new user
        page.goto("http://localhost:5173/signup")
        page.get_by_label("Full Name").fill("Test User")
        page.get_by_label("Email Address").fill(unique_email)
        page.get_by_label("Password (min. 8 characters)").fill("password")
        page.get_by_role("button", name="Sign Up").click()

        # Wait for redirection to login page by looking for the sign-in button
        expect(page.get_by_role("button", name="Sign In", exact=True)).to_be_visible(timeout=10000)

        # 2. Log in with the new user
        page.get_by_label("Email Address").fill(unique_email)
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Sign In", exact=True).click()

        # Wait for navigation to the main page
        expect(page.get_by_role("button", name="Campanhas")).to_be_visible()

        # 3. Create a new author
        page.get_by_role("button", name="Autores").click()
        expect(page.get_by_role("button", name="Adicionar Novo Autor")).to_be_visible()
        page.get_by_role("button", name="Adicionar Novo Autor").click()
        page.get_by_label("Nome do Autor").fill("Test Author")
        page.get_by_role("button", name="Salvar").click()
        expect(page.get_by_text("Autor salvo com sucesso!")).to_be_visible()

        # 4. Create a new persona
        page.get_by_role("button", name="Personas").click()
        expect(page.get_by_role("button", name="Adicionar Nova Persona")).to_be_visible()
        page.get_by_role("button", name="Adicionar Nova Persona").click()
        page.get_by_label("Nome da Persona").fill("Test Persona")
        page.get_by_role("button", name="Salvar").click()
        expect(page.get_by_text("Persona salva com sucesso!")).to_be_visible()

        # 5. Create a new campaign
        page.get_by_role("button", name="Campanhas").click()
        expect(page.get_by_label("Nome da Campanha")).to_be_visible()
        page.get_by_label("Nome da Campanha").fill("Test Campaign")

        # Select author and persona
        page.get_by_label("Autor").click()
        page.get_by_role("option", name="Test Author").click()
        page.get_by_label("Persona").click()
        page.get_by_role("option", name="Test Persona").click()

        page.get_by_role("button", name="Salvar Campanha").click()
        expect(page.get_by_text("Campanha salva com sucesso!")).to_be_visible()

        # 6. Reload the page and verify the campaign
        page.reload()
        expect(page.get_by_role("button", name="Carregar Campanha")).to_be_visible()
        page.get_by_role("button", name="Carregar Campanha").click()
        page.get_by_text("Test Campaign").click()

        # 7. Verify that the author and persona are still selected
        expect(page.get_by_label("Autor")).to_have_value("1") # Check for the ID of the author
        expect(page.get_by_label("Persona")).to_have_value("1") # Check for the ID of the persona

        # 8. Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
