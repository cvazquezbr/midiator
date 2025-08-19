from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/")
        page.wait_for_timeout(5000)

        # Step 1: Fill campaign details and generate
        page.fill("text=Problema ou Necessidade", "My problem")
        page.fill("text=Solução ou Proposta", "My solution")
        page.click("text=Elaborar Postagens")
        page.wait_for_selector("text=Conteúdo Principal")

        # Navigate through the steps to get to the publisher
        for i in range(5):
            page.click("text=Próximo")
            page.wait_for_timeout(500) # Give it a moment to transition

        # Switch to the "Meus Agendamentos" tab
        page.click("text=Meus Agendamentos")

        # Take a screenshot of the empty table
        page.screenshot(path="jules-scratch/verification/01_schedules_table.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
