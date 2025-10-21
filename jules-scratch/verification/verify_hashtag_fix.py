import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/")
        page.wait_for_selector('input[name="email"]')
        page.fill('input[name="email"]', 'test@example.com')
        page.fill('input[name="password"]', 'password')
        page.click('button[type="submit"]')

        page.wait_for_selector('text=Minhas Campanhas')
        page.click('text=Criar Nova Campanha')

        page.wait_for_selector('input[placeholder="Descreva o problema que sua campanha busca resolver."]')
        page.fill('input[placeholder="Descreva o problema que sua campanha busca resolver."]', "problema")
        page.fill('input[placeholder="Descreva a solução que sua campanha oferece."]', "solucao")
        page.click('button:has-text("Elaborar Postagens")')

        page.wait_for_selector('button:has-text("Resetar")')
        page.click('button[role="tab"]:has-text("Conteúdo Principal")')

        # Add hashtag with Enter
        hashtag_input = page.locator('input[label="Nova Hashtag"]')
        hashtag_input.fill("primeira")
        hashtag_input.press("Enter")

        # Add hashtag with button
        hashtag_input.fill("segunda")
        page.click('button:has-text("Adicionar")')

        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
