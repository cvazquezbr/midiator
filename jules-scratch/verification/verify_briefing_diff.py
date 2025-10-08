from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the app
        page.goto("http://localhost:5173/")

        # Use the user menu to navigate to the Briefings page
        page.locator('button[aria-label="opções do usuário"]').click()
        page.locator('li:has-text("Briefings")').click()

        # Now on the BriefingPage, click "Novo Briefing"
        page.locator('button:has-text("Novo Briefing")').click()

        # Wait for the wizard to open
        expect(page.locator('h2:has-text("Assistente de Criação de Briefing")')).to_be_visible()

        # Navigate to the final step (Step 7)
        for i in range(6):
            page.locator('button:has-text("Próximo")').click()
            # Add a small wait to ensure the next step loads
            page.wait_for_timeout(500) # Increased timeout for stability

        # Verify we are on the final step
        expect(page.locator('h6:has-text("Finalização e Revisão")')).to_be_visible()

        # Find the text area and edit it
        text_area = page.locator('textarea').first
        expect(text_area).to_be_visible()
        original_text = text_area.input_value()
        new_text = original_text.replace("Nosso objetivo", "O principal objetivo") + " E aqui está uma adição."
        text_area.fill(new_text)

        # Take a screenshot of the editor view with the changes
        page.screenshot(path="jules-scratch/verification/verification_editor.png")

        # Toggle the diff view
        diff_switch = page.locator('span:has-text("Destacar Alterações")')
        expect(diff_switch).to_be_visible()
        diff_switch.click()

        # Wait for the diff view to render and take a screenshot
        expect(page.locator('span:has-text("O principal objetivo")')).to_be_visible()
        page.screenshot(path="jules-scratch/verification/verification_diff.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)