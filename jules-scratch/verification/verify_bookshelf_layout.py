from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Go to the base URL and set a fake auth token to bypass login
        page.goto("http://localhost:5173/")
        page.evaluate("() => localStorage.setItem('firebase:authUser:test-api-key:test-project-id', JSON.stringify({uid: 'test-user'}))")
        page.reload()

        # Wait for the home page to load after setting the token
        page.wait_for_selector('text="Bem-vindo"', timeout=10000)

        # Look for the "Create New Campaign" button and click it
        create_button = page.get_by_role("button", name="Criar Nova Campanha")
        create_button.wait_for(state="visible", timeout=10000)
        create_button.click()

        # Wait for the navigation to the new campaign page
        page.wait_for_url("**/campaigns/**", timeout=10000)

        # Wait for the campaign page to load, specifically for the tabs to appear.
        tabs = page.locator('[role="tablist"]')
        tabs.wait_for(state="visible", timeout=10000)

        # Click the "Edição de Páginas" tab.
        edicao_de_paginas_tab = page.get_by_role("tab", name="Edição de Páginas")
        edicao_de_paginas_tab.click()

        # Wait for the grid of generated pages to be visible.
        # This will likely be empty, but the container should be there.
        page.wait_for_selector('text="Gerar Páginas"', timeout=10000)

        # Take a screenshot of the bookshelf layout area.
        page.screenshot(path="jules-scratch/verification/bookshelf_layout.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
