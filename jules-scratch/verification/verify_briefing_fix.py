from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to Briefings page directly
        page.goto("http://localhost:5173/briefings")

        # Click the "Novo Briefing (Beta)" button
        page.get_by_role("button", name="Novo Briefing (Beta)").click(timeout=10000)

        # Fill in the base text
        page.locator(".tiptap.ProseMirror").fill("This is a test briefing.")

        # Click next to go to revision step
        page.get_by_role("button", name="Próximo").click()

        # Wait for the revision step to load
        expect(page.get_by_text("Briefing Revisado (Editável)")).to_be_visible(timeout=20000)

        # Edit the revised text with line breaks
        editor_locator = page.locator(".tiptap.ProseMirror")
        editor_locator.click() # Focus the editor

        # Simulate user input to add line breaks
        page.keyboard.press("End")
        page.keyboard.press("Enter")
        page.keyboard.type("This is a new line.")
        page.keyboard.press("Enter")
        page.keyboard.type("And another one.")

        # Click next to go to the block completion step
        page.get_by_role("button", name="Próximo").click()

        # Wait for the block completion step to load
        expect(page.get_by_text("Completar Blocos")).to_be_visible(timeout=10000)

        # Take screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)