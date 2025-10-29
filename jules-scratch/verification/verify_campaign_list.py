
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/")
        page.wait_for_load_state('networkidle')
        page.wait_for_selector('h1:has-text("Minhas Campanhas")', timeout=60000)

        # Clica no botão para criar uma nova campanha
        page.click('button:has-text("Nova Campanha")')

        # Verifica se a seção "Minhas Campanhas" não está mais visível
        page.wait_for_selector('h1:has-text("Minhas Campanhas")', state='hidden')

        page.screenshot(path="jules-scratch/verification/verification.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
